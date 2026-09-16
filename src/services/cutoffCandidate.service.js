const { CutoffCandidate } = require("../models");
const auditService = require("./audit.service");
const cutoffRecordService = require("./cutoffRecord.service");
const { NotFoundError, ConflictError } = require("../errors/AppError");
const { RESOURCE_TYPES, CUTOFF_CANDIDATE_STATUS } = require("../config/constants");

const POPULATE_FIELDS = [
  { path: "resolvedInstitution", select: "name slug state" },
  { path: "resolvedProgramme", select: "name slug faculty" },
  { path: "admissionSession", select: "name status isActive" },
  { path: "reviewedBy", select: "firstName lastName email" },
];

async function findOrThrow(id) {
  const candidate = await CutoffCandidate.findById(id).populate(POPULATE_FIELDS);
  if (!candidate) throw new NotFoundError("Cutoff candidate not found");
  return candidate;
}

async function list({ page = 1, limit = 20, status, cutoffType, confidence, institution }) {
  const filter = {};
  if (status) filter.status = status;
  if (cutoffType) filter.cutoffType = cutoffType;
  if (confidence) filter.confidence = confidence;
  if (institution) filter.resolvedInstitution = institution;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CutoffCandidate.find(filter).populate(POPULATE_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CutoffCandidate.countDocuments(filter),
  ]);
  return { items, total };
}

async function getById(id) {
  return findOrThrow(id);
}

// Lets a reviewer fix a scraper's unresolved/ambiguous fields (institution,
// programme, session, cutoffType, mark) before deciding — only while still
// PENDING, matching AdmissionRule's "only DRAFT rules can be edited" guard.
async function update(id, payload, actor, req) {
  const candidate = await CutoffCandidate.findById(id);
  if (!candidate) throw new NotFoundError("Cutoff candidate not found");
  if (candidate.status !== CUTOFF_CANDIDATE_STATUS.PENDING) {
    throw new ConflictError(`Only PENDING candidates can be edited (current status: ${candidate.status}).`);
  }
  const previousSnapshot = candidate.toObject();
  Object.assign(candidate, payload);
  await candidate.save();

  await auditService.record({
    user: actor._id,
    action: "CUTOFF_CANDIDATE_UPDATED",
    resourceType: RESOURCE_TYPES.CUTOFF_CANDIDATE,
    resourceId: candidate._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return findOrThrow(candidate._id);
}

async function approve(id, actor, req) {
  return cutoffRecordService.promoteCandidate(id, actor, req);
}

async function reject(id, { notes }, actor, req) {
  const candidate = await CutoffCandidate.findById(id);
  if (!candidate) throw new NotFoundError("Cutoff candidate not found");
  if (candidate.status !== CUTOFF_CANDIDATE_STATUS.PENDING) {
    throw new ConflictError(`Only PENDING candidates can be rejected (current status: ${candidate.status}).`);
  }
  candidate.status = CUTOFF_CANDIDATE_STATUS.REJECTED;
  candidate.reviewNotes = notes;
  candidate.reviewedBy = actor._id;
  candidate.reviewedAt = new Date();
  await candidate.save();

  await auditService.record({
    user: actor._id,
    action: "CUTOFF_CANDIDATE_REJECTED",
    resourceType: RESOURCE_TYPES.CUTOFF_CANDIDATE,
    resourceId: candidate._id,
    newValue: { notes },
    req,
  });
  return findOrThrow(candidate._id);
}

module.exports = { list, getById, update, approve, reject, findOrThrow };
