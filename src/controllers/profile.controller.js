const profileService = require("../services/profile.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function getProfile(req, res) {
  const profile = await profileService.getProfile(req.user._id);
  sendSuccess(res, { data: profile });
}

async function updateProfile(req, res) {
  const profile = await profileService.updateProfile(req.user._id, req.body);
  sendSuccess(res, { message: "Profile updated", data: profile });
}

module.exports = { getProfile, updateProfile };
