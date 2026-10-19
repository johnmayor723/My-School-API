const { BlogPost } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function list({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    BlogPost.find({}).sort({ publishedAt: -1 }).skip(skip).limit(limit),
    BlogPost.countDocuments({}),
  ]);
  return { items, total };
}

async function getBySlug(slug) {
  const post = await BlogPost.findOne({ slug: slug.toLowerCase() });
  if (!post) throw new NotFoundError(`No blog post found for slug "${slug}"`);
  return post;
}

async function getById(id) {
  const post = await BlogPost.findById(id);
  if (!post) throw new NotFoundError("Blog post not found");
  return post;
}

async function create(payload, actor, req) {
  const post = await BlogPost.create(payload);
  await auditService.record({
    user: actor._id,
    action: "BLOG_POST_CREATED",
    resourceType: RESOURCE_TYPES.BLOG_POST,
    resourceId: post._id,
    newValue: payload,
    req,
  });
  return post;
}

async function update(id, payload, actor, req) {
  const previous = await BlogPost.findById(id);
  if (!previous) throw new NotFoundError("Blog post not found");
  const previousSnapshot = previous.toObject();
  Object.assign(previous, payload);
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "BLOG_POST_UPDATED",
    resourceType: RESOURCE_TYPES.BLOG_POST,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

async function remove(id, actor, req) {
  const post = await BlogPost.findById(id);
  if (!post) throw new NotFoundError("Blog post not found");
  await post.deleteOne();

  await auditService.record({
    user: actor._id,
    action: "BLOG_POST_DELETED",
    resourceType: RESOURCE_TYPES.BLOG_POST,
    resourceId: id,
    req,
  });
}

module.exports = { list, getBySlug, getById, create, update, remove };
