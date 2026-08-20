const { Role } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError, ConflictError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function list() {
  return Role.find().sort({ name: 1 });
}

async function getById(id) {
  const role = await Role.findById(id);
  if (!role) throw new NotFoundError("Role not found");
  return role;
}

async function create(payload, actor, req) {
  const existing = await Role.findOne({ name: payload.name.toUpperCase() });
  if (existing) throw new ConflictError("A role with this name already exists");

  const role = await Role.create(payload);
  await auditService.record({
    user: actor._id,
    action: "ROLE_CREATED",
    resourceType: RESOURCE_TYPES.ROLE,
    resourceId: role._id,
    newValue: payload,
    req,
  });
  return role;
}

async function update(id, payload, actor, req) {
  const role = await getById(id);
  if (role.isSystem) throw new ConflictError("System roles cannot be modified");

  const previousSnapshot = role.toObject();
  Object.assign(role, payload);
  await role.save();

  await auditService.record({
    user: actor._id,
    action: "ROLE_UPDATED",
    resourceType: RESOURCE_TYPES.ROLE,
    resourceId: role._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return role;
}

module.exports = { list, getById, create, update };
