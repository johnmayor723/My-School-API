const { HomeContent } = require("../models");
const auditService = require("./audit.service");
const { RESOURCE_TYPES } = require("../config/constants");

// Singleton -- there is exactly one HomeContent document. get() creates an
// empty one on first access so the admin editor always has something to load.
async function get() {
  let content = await HomeContent.findOne({});
  if (!content) content = await HomeContent.create({});
  return content;
}

async function update(payload, actor, req) {
  const previous = await get();
  const previousSnapshot = previous.toObject();
  Object.assign(previous, payload);
  await previous.save();

  await auditService.record({
    user: actor._id,
    action: "HOME_CONTENT_UPDATED",
    resourceType: RESOURCE_TYPES.HOME_CONTENT,
    resourceId: previous._id,
    previousValue: previousSnapshot,
    newValue: payload,
    req,
  });
  return previous;
}

module.exports = { get, update };
