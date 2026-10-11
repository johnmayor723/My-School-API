const { SavedScholarship } = require("../models");
const scholarshipClient = require("./scholarshipService.client");
const { NotFoundError, ConflictError } = require("../errors/AppError");

async function save(studentId, scholarshipId) {
  const existing = await SavedScholarship.findOne({ student: studentId, scholarshipId });
  if (existing) throw new ConflictError("This scholarship is already saved");

  const result = await scholarshipClient.getScholarship(scholarshipId);
  const scholarship = result.data;

  return SavedScholarship.create({
    student: studentId,
    scholarshipId,
    title: scholarship.title,
    deadline: scholarship.deadline,
    applicationUrl: scholarship.application_url,
  });
}

async function unsave(studentId, scholarshipId) {
  const result = await SavedScholarship.deleteOne({ student: studentId, scholarshipId });
  if (!result.deletedCount) throw new NotFoundError("This scholarship is not in your saved list");
}

async function list(studentId) {
  return SavedScholarship.find({ student: studentId }).sort({ createdAt: -1 });
}

module.exports = { save, unsave, list };
