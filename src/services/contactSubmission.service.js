const { ContactSubmission } = require("../models");
const auditService = require("./audit.service");
const { NotFoundError } = require("../errors/AppError");
const { RESOURCE_TYPES } = require("../config/constants");

async function submit(payload) {
  return ContactSubmission.create(payload);
}

async function list({ page = 1, limit = 20, read } = {}) {
  const filter = {};
  if (read !== undefined) filter.read = read;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ContactSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactSubmission.countDocuments(filter),
  ]);
  return { items, total };
}

async function markRead(id, read, actor, req) {
  const submission = await ContactSubmission.findById(id);
  if (!submission) throw new NotFoundError("Contact submission not found");
  submission.read = read;
  await submission.save();

  await auditService.record({
    user: actor._id,
    action: "CONTACT_SUBMISSION_MARKED",
    resourceType: RESOURCE_TYPES.CONTACT_SUBMISSION,
    resourceId: submission._id,
    newValue: { read },
    req,
  });
  return submission;
}

module.exports = { submit, list, markRead };
