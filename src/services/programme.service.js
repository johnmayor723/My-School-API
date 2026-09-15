const { Programme, InstitutionProgramme, AdmissionRule, AdmissionSession } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES, RECORD_STATUS, RULE_STATUS } = require("../config/constants");
const { evaluateUtmeScore, evaluateUtmeSubjects } = require("../modules/matching-engine/evaluators/utme.evaluator");
const { evaluateOlevel } = require("../modules/matching-engine/evaluators/olevel.evaluator");

async function list({ page = 1, limit = 20, search, faculty, institution, status = RECORD_STATUS.ACTIVE }) {
  const filter = {};
  if (faculty) filter.faculty = faculty;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  let programmeIds;
  if (institution) {
    const offerings = await InstitutionProgramme.find({ institution, status: RECORD_STATUS.ACTIVE }).select("programme");
    programmeIds = offerings.map((o) => o.programme);
    filter._id = { $in: programmeIds };
  }

  // A plain alphabetical sort on a $text query defeats the point of the text
  // index (e.g. searching "Computer Science" surfacing "Biological Sciences"
  // ahead of "Computer Science" itself) — sort by relevance whenever a text
  // query is present, only falling back to name order for a plain browse.
  const projection = search ? { score: { $meta: "textScore" } } : undefined;
  const sort = search ? { score: { $meta: "textScore" } } : { name: 1 };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Programme.find(filter, projection).sort(sort).skip(skip).limit(limit),
    Programme.countDocuments(filter),
  ]);
  return { items, total };
}

async function resolveActiveAdmissionSessionId() {
  const active = await AdmissionSession.findOne({ isActive: true }).sort({ createdAt: -1 }).select("_id").lean();
  if (active) return active._id;
  const mostRecent = await AdmissionSession.findOne().sort({ createdAt: -1 }).select("_id").lean();
  return mostRecent?._id;
}

// A programme "qualifies" when at least one of its real, published
// AdmissionRule records (the same rules — JAMB-brochure-sourced where
// available — that the final matching engine evaluates) would pass this
// student's O'Level results and, when supplied, UTME subjects/score. This
// reuses the matching engine's own evaluators so course discovery can never
// promise a course the final assessment would then reject, and vice versa.
async function qualifyingProgrammeIds(programmeIds, academicSnapshot) {
  const admissionSessionId = await resolveActiveAdmissionSessionId();
  if (!admissionSessionId) return new Set();

  const rules = await AdmissionRule.find({
    programme: { $in: programmeIds },
    admissionSession: admissionSessionId,
    status: RULE_STATUS.PUBLISHED,
  })
    .select("programme olevel utme")
    .lean();

  const rulesByProgramme = new Map();
  for (const rule of rules) {
    const key = String(rule.programme);
    if (!rulesByProgramme.has(key)) rulesByProgramme.set(key, []);
    rulesByProgramme.get(key).push(rule);
  }

  // Evaluated in the order the underlying admission decision is actually
  // made: UTME subjects decide which course the student can even sit for,
  // UTME score then decides which tier of university/course within that is
  // reachable, and O'Level results are the final confirmation. All three
  // stay mandatory — failing any one (in particular a low score paired with
  // incomplete O'Level) disqualifies outright, it never just downgrades the
  // tier — this is only ordered for short-circuiting and future
  // "why didn't this qualify" diagnostics, not to soften any of the checks.
  const qualifying = new Set();
  for (const [programmeId, programmeRules] of rulesByProgramme) {
    const anyRulePasses = programmeRules.some((rule) => {
      if (academicSnapshot.utmeSubjects?.length) {
        if (!evaluateUtmeSubjects(academicSnapshot.utmeSubjects, rule.utme).passed) return false;
      }
      if (academicSnapshot.utmeScore !== undefined && academicSnapshot.utmeScore !== null) {
        if (!evaluateUtmeScore(academicSnapshot.utmeScore, rule.utme).passed) return false;
      }
      const olevelResult = evaluateOlevel(academicSnapshot.oLevelSubjects, academicSnapshot.oLevelSittings, rule.olevel);
      if (!olevelResult.passed) return false;
      return true;
    });
    if (anyRulePasses) qualifying.add(programmeId);
  }
  return qualifying;
}

// $text relevance ranking treats "Computer Science" and "Computer Science
// With Mathematics" as near-equals (both match both tokens), so an exact or
// prefix match on the query is pulled to the front ahead of that score.
function withNameMatchBoost(candidates, query) {
  if (!query) return candidates;
  const q = query.trim().toLowerCase();
  const rank = (p) => {
    const name = p.name.toLowerCase();
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    return 2;
  };
  return [...candidates].sort((a, b) => rank(a) - rank(b));
}

async function search(query, limit = 20, academicSnapshot) {
  const hasAcademicData = Boolean(academicSnapshot?.oLevelSubjects?.length);
  const filter = query ? { $text: { $search: query }, status: RECORD_STATUS.ACTIVE } : { status: RECORD_STATUS.ACTIVE };
  const projection = query ? { score: { $meta: "textScore" } } : undefined;
  const sort = query ? { score: { $meta: "textScore" } } : { name: 1 };
  // Filtering by academic fit happens after the DB query, so the candidate
  // pool has to cover every programme that could qualify, not just a slice —
  // an alphabetical page cap here previously cut off before "Medicine" or
  // "Nursing" ever got fetched, so a well-qualified student could never see
  // them no matter how good their UTME/O'Level profile was. The whole active
  // catalogue is only ~2,100 programmes, so fetching all of it for the
  // filtering pass is cheap; only a query-less, non-academic plain browse
  // still uses the small page-sized limit.
  const candidateLimit = hasAcademicData || query ? 0 : limit;
  let candidates = await Programme.find(filter, projection).sort(sort).limit(candidateLimit).lean();
  candidates = withNameMatchBoost(candidates, query);

  if (!hasAcademicData) return candidates.slice(0, limit);

  const qualifying = await qualifyingProgrammeIds(
    candidates.map((p) => p._id),
    academicSnapshot
  );
  let qualifyingCandidates = candidates.filter((p) => qualifying.has(String(p._id)));

  // For a plain browse (no search term), a name-alphabetical list buries
  // genuinely competitive courses a student qualifies for (Medicine,
  // Engineering, Computer Science, Law...) under whichever low-competitiveness
  // course names happen to start earliest in the alphabet (e.g. every
  // "Agric-..." variant). Surface the more competitive, more sought-after
  // courses first instead — the same competitivenessIndex the matching engine
  // itself already uses as a scoring signal.
  if (!query) {
    qualifyingCandidates = qualifyingCandidates.sort((a, b) => {
      const diff = (b.metadata?.competitivenessIndex ?? 0) - (a.metadata?.competitivenessIndex ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }

  return qualifyingCandidates.slice(0, limit);
}

async function getById(id) {
  const programme = await Programme.findById(id).populate("relatedProgrammes", "name slug");
  if (!programme) throw new NotFoundError("Programme not found");
  const offerings = await InstitutionProgramme.find({ programme: id, status: RECORD_STATUS.ACTIVE }).populate(
    "institution",
    "name slug state ownership institutionType"
  );
  return { programme, offeredBy: offerings.map((o) => o.institution) };
}

async function create(payload, actor, req) {
  const programme = await Programme.create({ ...payload, createdBy: actor._id, updatedBy: actor._id });
  await auditService.record({
    user: actor._id,
    action: "PROGRAMME_CREATED",
    resourceType: RESOURCE_TYPES.PROGRAMME,
    resourceId: programme._id,
    newValue: payload,
    req,
  });
  return programme;
}

async function update(id, payload, actor, req) {
  const previous = await Programme.findById(id);
  if (!previous) throw new NotFoundError("Programme not found");
  const previousSnapshot = previous.toObject();

  Object.assign(previous, payload, { updatedBy: actor._id });
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "PROGRAMME_UPDATED",
    resourceType: RESOURCE_TYPES.PROGRAMME,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

module.exports = { list, search, getById, create, update };
