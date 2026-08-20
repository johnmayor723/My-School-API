const { AuditLog } = require("../models");

async function list({ page = 1, limit = 20, resourceType, resourceId, action, user }) {
  const filter = {};
  if (resourceType) filter.resourceType = resourceType;
  if (resourceId) filter.resourceId = resourceId;
  if (action) filter.action = action;
  if (user) filter.user = user;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate("user", "firstName lastName email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total };
}

module.exports = { list };
