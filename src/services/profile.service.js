const { StudentProfile } = require("../models");
const { NotFoundError } = require("../errors/AppError");

async function getProfile(userId) {
  const profile = await StudentProfile.findOne({ user: userId }).populate("preferredProgramme", "name slug");
  if (!profile) throw new NotFoundError("Student profile not found");
  return profile;
}

async function updateProfile(userId, updates) {
  const profile = await StudentProfile.findOneAndUpdate(
    { user: userId },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate("preferredProgramme", "name slug");
  if (!profile) throw new NotFoundError("Student profile not found");
  return profile;
}

module.exports = { getProfile, updateProfile };
