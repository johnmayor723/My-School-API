const { Page } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function getBySlug(slug) {
  const page = await Page.findOne({ slug: slug.toLowerCase() });
  if (!page) throw new NotFoundError(`No page found for slug "${slug}"`);
  return page;
}

async function list({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Page.find({}).sort({ title: 1 }).skip(skip).limit(limit),
    Page.countDocuments({}),
  ]);
  return { items, total };
}

async function getById(id) {
  const page = await Page.findById(id);
  if (!page) throw new NotFoundError("Page not found");
  return page;
}

async function create(payload, actor, req) {
  const page = await Page.create(payload);
  await auditService.record({
    user: actor._id,
    action: "PAGE_CREATED",
    resourceType: RESOURCE_TYPES.PAGE,
    resourceId: page._id,
    newValue: payload,
    req,
  });
  return page;
}

async function update(id, payload, actor, req) {
  const previous = await Page.findById(id);
  if (!previous) throw new NotFoundError("Page not found");
  const previousSnapshot = previous.toObject();
  Object.assign(previous, payload);
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "PAGE_UPDATED",
    resourceType: RESOURCE_TYPES.PAGE,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

async function remove(id, actor, req) {
  const page = await Page.findById(id);
  if (!page) throw new NotFoundError("Page not found");
  await page.deleteOne();

  await auditService.record({
    user: actor._id,
    action: "PAGE_DELETED",
    resourceType: RESOURCE_TYPES.PAGE,
    resourceId: id,
    req,
  });
}

module.exports = { getBySlug, list, getById, create, update, remove };
