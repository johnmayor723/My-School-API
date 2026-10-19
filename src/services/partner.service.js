const { Partner } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function list() {
  return Partner.find({}).sort({ order: 1, name: 1 });
}

async function getById(id) {
  const partner = await Partner.findById(id);
  if (!partner) throw new NotFoundError("Partner not found");
  return partner;
}

async function create(payload, actor, req) {
  const partner = await Partner.create(payload);
  await auditService.record({
    user: actor._id,
    action: "PARTNER_CREATED",
    resourceType: RESOURCE_TYPES.PARTNER,
    resourceId: partner._id,
    newValue: payload,
    req,
  });
  return partner;
}

async function update(id, payload, actor, req) {
  const previous = await Partner.findById(id);
  if (!previous) throw new NotFoundError("Partner not found");
  const previousSnapshot = previous.toObject();
  Object.assign(previous, payload);
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "PARTNER_UPDATED",
    resourceType: RESOURCE_TYPES.PARTNER,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

async function remove(id, actor, req) {
  const partner = await Partner.findById(id);
  if (!partner) throw new NotFoundError("Partner not found");
  await partner.deleteOne();

  await auditService.record({
    user: actor._id,
    action: "PARTNER_DELETED",
    resourceType: RESOURCE_TYPES.PARTNER,
    resourceId: id,
    req,
  });
}

module.exports = { list, getById, create, update, remove };
