const { Programme, InstitutionProgramme } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES, RECORD_STATUS } = require("../config/constants");

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

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Programme.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Programme.countDocuments(filter),
  ]);
  return { items, total };
}

function normalizeSubject(subject) {
  return String(subject || "").trim().toLowerCase();
}

// A programme "qualifies" when every O'Level subject its subjectProfile
// requires is among the subjects the student submitted — the same subset
// check the matching engine's O'Level evaluator applies later, just run
// earlier so course discovery only surfaces courses the student can actually
// be evaluated against.
function qualifiesForOlevel(programme, submittedSet) {
  const required = programme.subjectProfile?.olevelRequiredSubjects || [];
  return required.every((subject) => submittedSet.has(normalizeSubject(subject)));
}

async function search(query, limit = 20, olevelSubjects) {
  const filter = query ? { $text: { $search: query }, status: RECORD_STATUS.ACTIVE } : { status: RECORD_STATUS.ACTIVE };
  const candidateLimit = olevelSubjects?.length ? Math.max(limit * 10, 500) : limit;
  const candidates = await Programme.find(filter).sort({ name: 1 }).limit(candidateLimit);

  if (!olevelSubjects?.length) return candidates;

  const submittedSet = new Set(olevelSubjects.map(normalizeSubject));
  return candidates.filter((p) => qualifiesForOlevel(p, submittedSet)).slice(0, limit);
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
