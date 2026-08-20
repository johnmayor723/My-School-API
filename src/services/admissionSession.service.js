const { AdmissionSession } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function list({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AdmissionSession.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdmissionSession.countDocuments(),
  ]);
  return { items, total };
}

async function create(payload, actor, req) {
  const session = await AdmissionSession.create(payload);
  await auditService.record({
    user: actor._id,
    action: "ADMISSION_SESSION_CREATED",
    resourceType: RESOURCE_TYPES.ADMISSION_SESSION,
    resourceId: session._id,
    newValue: payload,
    req,
  });
  return session;
}

async function update(id, payload, actor, req) {
  const previous = await AdmissionSession.findById(id);
  if (!previous) throw new NotFoundError("Admission session not found");
  const previousSnapshot = previous.toObject();

  Object.assign(previous, payload);
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "ADMISSION_SESSION_UPDATED",
    resourceType: RESOURCE_TYPES.ADMISSION_SESSION,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

module.exports = { list, create, update };
