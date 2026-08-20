const { AdmissionRule } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError, ConflictError } = require("../errors/AppError");
const { RESOURCE_TYPES, RULE_STATUS } = require("../config/constants");

const POPULATE_FIELDS = [
  { path: "institution", select: "name slug state ownership institutionType" },
  { path: "programme", select: "name slug faculty" },
  { path: "admissionSession", select: "name status isActive" },
  { path: "createdBy reviewedBy approvedBy publishedBy verification.verifiedBy", select: "firstName lastName email" },
];

async function findOrThrow(id) {
  const rule = await AdmissionRule.findById(id).populate(POPULATE_FIELDS);
  if (!rule) throw new NotFoundError("Admission rule not found");
  return rule;
}

async function list({ page = 1, limit = 20, institution, programme, admissionSession, status }) {
  const filter = {};
  if (institution) filter.institution = institution;
  if (programme) filter.programme = programme;
  if (admissionSession) filter.admissionSession = admissionSession;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AdmissionRule.find(filter).populate(POPULATE_FIELDS).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    AdmissionRule.countDocuments(filter),
  ]);
  return { items, total };
}

async function getById(id) {
  return findOrThrow(id);
}

async function create(payload, actor, req) {
  const rule = await AdmissionRule.create({
    ...payload,
    status: RULE_STATUS.DRAFT,
    createdBy: actor._id,
    updatedBy: actor._id,
  });
  await auditService.record({
    user: actor._id,
    action: "ADMISSION_RULE_CREATED",
    resourceType: RESOURCE_TYPES.ADMISSION_RULE,
    resourceId: rule._id,
    newValue: payload,
    req,
  });
  return findOrThrow(rule._id);
}

async function update(id, payload, actor, req) {
  const rule = await AdmissionRule.findById(id);
  if (!rule) throw new NotFoundError("Admission rule not found");
  if (rule.status !== RULE_STATUS.DRAFT) {
    throw new ConflictError(`Only DRAFT rules can be edited directly (current status: ${rule.status}). Archive it and create a new draft instead.`);
  }
  const previousSnapshot = rule.toObject();
  Object.assign(rule, payload, { updatedBy: actor._id });
  await rule.save();

  await auditService.record({
    user: actor._id,
    action: "ADMISSION_RULE_UPDATED",
    resourceType: RESOURCE_TYPES.ADMISSION_RULE,
    resourceId: rule._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return findOrThrow(rule._id);
}

async function submitForReview(id, actor, req) {
  const rule = await AdmissionRule.findById(id);
  if (!rule) throw new NotFoundError("Admission rule not found");
  if (rule.status !== RULE_STATUS.DRAFT) {
    throw new ConflictError(`Cannot submit for review from status ${rule.status}; a rule must be in DRAFT.`);
  }
  rule.status = RULE_STATUS.REVIEW;
  rule.submittedForReviewAt = new Date();
  rule.reviewApproved = false;
  rule.updatedBy = actor._id;
  await rule.save();

  await auditService.record({
    user: actor._id,
    action: "ADMISSION_RULE_SUBMITTED_FOR_REVIEW",
    resourceType: RESOURCE_TYPES.ADMISSION_RULE,
    resourceId: rule._id,
    req,
  });
  return findOrThrow(rule._id);
}

async function review(id, { decision, notes }, actor, req) {
  const rule = await AdmissionRule.findById(id);
  if (!rule) throw new NotFoundError("Admission rule not found");
  if (rule.status !== RULE_STATUS.REVIEW) {
    throw new ConflictError(`Cannot review a rule with status ${rule.status}; a rule must be in REVIEW.`);
  }

  rule.reviewedBy = actor._id;
  rule.reviewedAt = new Date();
  rule.reviewNotes = notes;

  if (decision === "approve") {
    rule.reviewApproved = true;
  } else {
    rule.reviewApproved = false;
    rule.status = RULE_STATUS.DRAFT;
  }
  await rule.save();

  await auditService.record({
    user: actor._id,
    action: "ADMISSION_RULE_REVIEWED",
    resourceType: RESOURCE_TYPES.ADMISSION_RULE,
    resourceId: rule._id,
    newValue: { decision, notes },
    req,
  });
  return findOrThrow(rule._id);
}

async function approve(id, actor, req) {
  const rule = await AdmissionRule.findById(id);
  if (!rule) throw new NotFoundError("Admission rule not found");
  if (rule.status !== RULE_STATUS.REVIEW) {
    throw new ConflictError(`Cannot approve a rule with status ${rule.status}; a rule must be in REVIEW.`);
  }
  if (!rule.reviewApproved) {
    throw new ConflictError("This rule has not passed review yet and cannot be approved.");
  }

  rule.status = RULE_STATUS.APPROVED;
  rule.approvedBy = actor._id;
  rule.approvedAt = new Date();
  await rule.save();

  await auditService.record({
    user: actor._id,
    action: "ADMISSION_RULE_APPROVED",
    resourceType: RESOURCE_TYPES.ADMISSION_RULE,
    resourceId: rule._id,
    req,
  });
  return findOrThrow(rule._id);
}

async function publish(id, actor, req) {
  const rule = await AdmissionRule.findById(id);
  if (!rule) throw new NotFoundError("Admission rule not found");
  if (rule.status !== RULE_STATUS.APPROVED) {
    throw new ConflictError(`Cannot publish a rule with status ${rule.status}; a rule must be APPROVED.`);
  }

  rule.status = RULE_STATUS.PUBLISHED;
  rule.publishedBy = actor._id;
  rule.publishedAt = new Date();

  try {
    await rule.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError(
        "A published rule already exists for this institution, programme and admission session. Archive it before publishing a replacement."
      );
    }
    throw err;
  }

  await auditService.record({
    user: actor._id,
    action: "ADMISSION_RULE_PUBLISHED",
    resourceType: RESOURCE_TYPES.ADMISSION_RULE,
    resourceId: rule._id,
    req,
  });
  return findOrThrow(rule._id);
}

async function archive(id, { notes } = {}, actor, req) {
  const rule = await AdmissionRule.findById(id);
  if (!rule) throw new NotFoundError("Admission rule not found");
  if (rule.status === RULE_STATUS.ARCHIVED) {
    throw new ConflictError("This rule is already archived");
  }

  const previousStatus = rule.status;
  rule.status = RULE_STATUS.ARCHIVED;
  rule.archivedAt = new Date();
  rule.updatedBy = actor._id;
  await rule.save();

  await auditService.record({
    user: actor._id,
    action: "ADMISSION_RULE_ARCHIVED",
    resourceType: RESOURCE_TYPES.ADMISSION_RULE,
    resourceId: rule._id,
    previousValue: { status: previousStatus },
    newValue: { notes },
    req,
  });
  return findOrThrow(rule._id);
}

module.exports = { list, getById, create, update, submitForReview, review, approve, publish, archive };
