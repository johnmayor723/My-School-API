/**
 * Shared normalization/dedup vocabulary for the Cut-Off Marks Intelligence
 * module, used by both scraper adapters (src/scrapers/*) and the live admin
 * candidate-review API — same role as cutoffCoverage.js for the existing
 * rule-generation pipeline: one source of truth so the two never disagree
 * about what counts as a duplicate or a resolved match.
 */
const { slugify } = require("./slugify");
const { normalizeCourseName } = require("./courseName");
const { CUTOFF_SOURCE_TYPE } = require("../config/constants");

function buildDedupeKey({ institutionId, programmeId, cutoffType, admissionSessionId }) {
  const inst = institutionId ? String(institutionId) : "-";
  const prog = programmeId ? String(programmeId) : "-";
  const session = admissionSessionId ? String(admissionSessionId) : "-";
  return `${inst}:${prog}:${cutoffType}:${session}`;
}

// Conservative name matching, deliberately non-fuzzy (same rationale as
// normalizeCourseName): a wrong institution match on a cutoff number is
// worse than leaving it unresolved for a human to fix.
async function resolveInstitutionMatch(rawName, { Institution }) {
  if (!rawName) return { institution: null, confidence: "low" };
  const slug = slugify(rawName);
  const bySlug = await Institution.findOne({ slug });
  if (bySlug) return { institution: bySlug, confidence: "high" };

  const byName = await Institution.findOne({ name: new RegExp(`^${escapeRegex(rawName.trim())}$`, "i") });
  if (byName) return { institution: byName, confidence: "high" };

  const byShortName = await Institution.findOne({ "metadata.shortName": new RegExp(`^${escapeRegex(rawName.trim())}$`, "i") });
  if (byShortName) return { institution: byShortName, confidence: "medium" };

  return { institution: null, confidence: "low" };
}

async function resolveProgrammeMatch(rawName, institutionId, { Programme, InstitutionProgramme }) {
  if (!rawName) return { programme: null, confidence: "low" };
  const normalized = normalizeCourseName(rawName);
  if (!normalized) return { programme: null, confidence: "low" };

  const candidates = await Programme.find({
    $or: [{ name: rawName.trim() }, { alternativeNames: rawName.trim() }],
  });
  const matches = candidates.filter(
    (p) => normalizeCourseName(p.name) === normalized || (p.alternativeNames || []).some((n) => normalizeCourseName(n) === normalized)
  );
  if (matches.length === 0) return { programme: null, confidence: "low" };

  if (institutionId) {
    const offerings = await InstitutionProgramme.find({
      institution: institutionId,
      programme: { $in: matches.map((m) => m._id) },
    });
    const offeredIds = new Set(offerings.map((o) => String(o.programme)));
    const scoped = matches.filter((m) => offeredIds.has(String(m._id)));
    if (scoped.length === 1) return { programme: scoped[0], confidence: "high" };
    if (scoped.length > 1) return { programme: null, confidence: "low" }; // ambiguous — leave for a human
  }

  if (matches.length === 1) return { programme: matches[0], confidence: "medium" };
  return { programme: null, confidence: "low" }; // ambiguous across institutions
}

// Same dedupeKey + same mark as an already-staged candidate → nothing new to
// review, safe to auto-mark DUPLICATE. Same key, different mark → left
// PENDING with a warning; never silently pick a winner between two numbers.
function isExactDuplicate(candidate, existingCandidate) {
  if (!existingCandidate) return { duplicate: false, warning: null };
  if (existingCandidate.cutoffMark === candidate.cutoffMark) {
    return { duplicate: true, warning: null };
  }
  return {
    duplicate: false,
    warning: `Conflicts with existing candidate ${existingCandidate._id} at ${existingCandidate.cutoffMark} (this one: ${candidate.cutoffMark}).`,
  };
}

// Same check against an already-published CutoffRecord. A differing mark
// against an OFFICIAL current record is flagged loudly here — before review —
// since a SECONDARY-sourced candidate must never silently override it later.
function isRedundantAgainstCurrentRecord(candidate, currentRecord) {
  if (!currentRecord) return { duplicate: false, warning: null };
  if (currentRecord.cutoffMark === candidate.cutoffMark) {
    return { duplicate: true, warning: null };
  }
  if (currentRecord.source.type === CUTOFF_SOURCE_TYPE.OFFICIAL && candidate.source.type === CUTOFF_SOURCE_TYPE.SECONDARY) {
    return {
      duplicate: false,
      warning: `A secondary-source candidate (${candidate.cutoffMark}) conflicts with the current OFFICIAL record (${currentRecord.cutoffMark}) — cannot auto-override, reviewer must decide.`,
    };
  }
  return {
    duplicate: false,
    warning: `Conflicts with current published record ${currentRecord._id} at ${currentRecord.cutoffMark} (this one: ${candidate.cutoffMark}).`,
  };
}

/**
 * Pipeline entrypoint: takes one raw scraper extraction, resolves what it can,
 * computes its dedupe key, checks it against both other staged candidates and
 * already-published records, and upserts (or skips) a CutoffCandidate.
 * Reusable unchanged by future manual-entry actions or additional scrapers.
 */
async function normalizeAndStageCandidate(rawExtraction, models) {
  const { Institution, Programme, InstitutionProgramme, AdmissionSession, CutoffCandidate, CutoffRecord } = models;

  const { institution, confidence: institutionConfidence } = await resolveInstitutionMatch(rawExtraction.rawInstitutionName, {
    Institution,
  });
  const { programme, confidence: programmeConfidence } = rawExtraction.rawProgrammeName
    ? await resolveProgrammeMatch(rawExtraction.rawProgrammeName, institution?._id, { Programme, InstitutionProgramme })
    : { programme: null, confidence: "low" };

  let admissionSession = null;
  if (rawExtraction.rawAdmissionSessionLabel) {
    admissionSession = await AdmissionSession.findOne({ name: rawExtraction.rawAdmissionSessionLabel.trim() });
  }

  const warnings = [];
  if (!institution) warnings.push(`Could not resolve institution from "${rawExtraction.rawInstitutionName}".`);
  if (rawExtraction.rawProgrammeName && !programme) warnings.push(`Could not resolve programme from "${rawExtraction.rawProgrammeName}".`);
  if (rawExtraction.rawAdmissionSessionLabel && !admissionSession) {
    warnings.push(`Could not resolve admission session "${rawExtraction.rawAdmissionSessionLabel}".`);
  }

  const dedupeKey = buildDedupeKey({
    institutionId: institution?._id,
    programmeId: programme?._id,
    cutoffType: rawExtraction.cutoffType,
    admissionSessionId: admissionSession?._id,
  });

  const overallConfidence = downgradeConfidence(rawExtraction.confidence, institutionConfidence, programmeConfidence);

  const candidateDoc = {
    cutoffType: rawExtraction.cutoffType,
    rawInstitutionName: rawExtraction.rawInstitutionName,
    rawProgrammeName: rawExtraction.rawProgrammeName,
    resolvedInstitution: institution?._id,
    resolvedProgramme: programme?._id,
    rawAdmissionSessionLabel: rawExtraction.rawAdmissionSessionLabel,
    admissionSession: admissionSession?._id,
    cutoffMark: rawExtraction.cutoffMark,
    scale: rawExtraction.scale || "UTME/400",
    confidence: overallConfidence,
    rawExtractionSnippet: rawExtraction.rawExtractionSnippet,
    dedupeKey,
    source: rawExtraction.source,
    scraperKey: rawExtraction.scraperKey,
  };

  const existingCandidate = await CutoffCandidate.findOne({ dedupeKey, status: { $ne: "DUPLICATE" } }).sort({ createdAt: -1 });
  const { duplicate: dupOfCandidate, warning: candidateWarning } = isExactDuplicate(candidateDoc, existingCandidate);
  if (dupOfCandidate) {
    candidateDoc.status = "DUPLICATE";
    candidateDoc.normalizationWarnings = [...warnings, `Duplicate of existing candidate ${existingCandidate._id}.`];
    return CutoffCandidate.create(candidateDoc);
  }
  if (candidateWarning) warnings.push(candidateWarning);

  let currentRecord = null;
  if (institution || programme) {
    currentRecord = await CutoffRecord.findOne({
      institution: institution?._id || null,
      programme: programme?._id || null,
      cutoffType: rawExtraction.cutoffType,
      admissionSession: admissionSession?._id,
      isCurrent: true,
    });
  }
  const { duplicate: dupOfRecord, warning: recordWarning } = isRedundantAgainstCurrentRecord(candidateDoc, currentRecord);
  if (dupOfRecord) {
    candidateDoc.status = "DUPLICATE";
    candidateDoc.normalizationWarnings = [...warnings, `Duplicate of current published record ${currentRecord._id}.`];
    return CutoffCandidate.create(candidateDoc);
  }
  if (recordWarning) warnings.push(recordWarning);

  candidateDoc.normalizationWarnings = warnings;
  return CutoffCandidate.create(candidateDoc);
}

function downgradeConfidence(extractionConfidence, institutionConfidence, programmeConfidence) {
  const order = ["low", "medium", "high"];
  const worst = [extractionConfidence, institutionConfidence, programmeConfidence]
    .filter(Boolean)
    .reduce((worstSoFar, c) => (order.indexOf(c) < order.indexOf(worstSoFar) ? c : worstSoFar), "high");
  return worst;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  buildDedupeKey,
  resolveInstitutionMatch,
  resolveProgrammeMatch,
  isExactDuplicate,
  isRedundantAgainstCurrentRecord,
  normalizeAndStageCandidate,
};
