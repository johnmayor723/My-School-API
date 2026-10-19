const { Program } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function list({ category } = {}) {
  const filter = {};
  if (category) filter.category = category;
  return Program.find(filter).sort({ category: 1, order: 1 });
}

async function getById(id) {
  const program = await Program.findById(id);
  if (!program) throw new NotFoundError("Program not found");
  return program;
}

async function create(payload, actor, req) {
  const program = await Program.create(payload);
  await auditService.record({
    user: actor._id,
    action: "PROGRAM_CREATED",
    resourceType: RESOURCE_TYPES.PROGRAM,
    resourceId: program._id,
    newValue: payload,
    req,
  });
  return program;
}

async function update(id, payload, actor, req) {
  const previous = await Program.findById(id);
  if (!previous) throw new NotFoundError("Program not found");
  const previousSnapshot = previous.toObject();
  Object.assign(previous, payload);
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "PROGRAM_UPDATED",
    resourceType: RESOURCE_TYPES.PROGRAM,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

async function remove(id, actor, req) {
  const program = await Program.findById(id);
  if (!program) throw new NotFoundError("Program not found");
  await program.deleteOne();

  await auditService.record({
    user: actor._id,
    action: "PROGRAM_DELETED",
    resourceType: RESOURCE_TYPES.PROGRAM,
    resourceId: id,
    req,
  });
}

module.exports = { list, getById, create, update, remove };
