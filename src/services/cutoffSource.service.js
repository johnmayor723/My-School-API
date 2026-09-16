const { CutoffSource } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function findOrThrow(id) {
  const source = await CutoffSource.findById(id);
  if (!source) throw new NotFoundError("Cutoff source not found");
  return source;
}

async function list() {
  return CutoffSource.find().sort({ name: 1 });
}

async function getById(id) {
  return findOrThrow(id);
}

async function create(payload, actor, req) {
  const source = await CutoffSource.create({ ...payload, createdBy: actor._id, updatedBy: actor._id });
  await auditService.record({
    user: actor._id,
    action: "CUTOFF_SOURCE_CREATED",
    resourceType: RESOURCE_TYPES.CUTOFF_SOURCE,
    resourceId: source._id,
    newValue: payload,
    req,
  });
  return source;
}

async function update(id, payload, actor, req) {
  const source = await findOrThrow(id);
  const previousSnapshot = source.toObject();
  Object.assign(source, payload, { updatedBy: actor._id });
  await source.save();

  await auditService.record({
    user: actor._id,
    action: "CUTOFF_SOURCE_UPDATED",
    resourceType: RESOURCE_TYPES.CUTOFF_SOURCE,
    resourceId: source._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return source;
}

module.exports = { list, getById, create, update };
