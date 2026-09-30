const { User } = require("../models");
const tokenService = require("./token.service");
const auditService = require("./audit.service");
const { UnauthorizedError, ForbiddenError } = require("../errors/AppError");
const { USER_TYPES, USER_STATUS, RESOURCE_TYPES } = require("../config/constants");

// Student accounts are OTP-only (see src/modules/accounts) — this endpoint
// now serves STAFF (admin console) exclusively.
async function login({ email, password }, { ip } = {}) {
  const user = await User.findOne({ email }).select("+passwordHash").populate("roles");
  if (!user) throw new UnauthorizedError("Invalid email or password");
  if (user.userType !== USER_TYPES.STAFF) throw new ForbiddenError("This account signs in with a one-time code, not a password");

  const valid = await user.comparePassword(password);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  if (user.status !== USER_STATUS.ACTIVE) throw new ForbiddenError("Account is not active");

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await tokenService.issueTokenPair(user, { ip });
  return { user: user.toSafeJSON(), ...tokens };
}

async function refresh(refreshToken, { ip } = {}) {
  const { user, accessToken, refreshToken: newRefreshToken } = await tokenService.rotateRefreshToken(refreshToken, { ip });
  return { user: user.toSafeJSON(), accessToken, refreshToken: newRefreshToken };
}

async function logout(refreshToken) {
  await tokenService.revokeRefreshToken(refreshToken);
}

async function updateAccount(userId, { firstName, lastName, phone }) {
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError("Account no longer exists");
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  await auditService.record({ user: user._id, action: "ACCOUNT_UPDATED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id });
  return user.toSafeJSON();
}

// Anonymizes and deactivates the account rather than removing the User row
// outright, so Payment records referencing it stay intact for the financial
// retention period the privacy policy promises. Academic/chat data, which
// has no such retention need, is deleted outright. Callers must confirm an
// OTP before reaching this (see accountAuth.service.js#confirmAccountDeletion).
async function deleteAccount(userId, { req } = {}) {
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError("Account no longer exists");

  const { Assessment, StudentProfile: StudentProfileModel, ChatMessage } = require("../models");

  const assessmentIds = await Assessment.find({ student: user._id }).distinct("_id");
  if (assessmentIds.length) {
    await ChatMessage.deleteMany({ assessment: { $in: assessmentIds } });
    await Assessment.updateMany(
      { _id: { $in: assessmentIds } },
      {
        $set: {
          "academicSnapshot.fullName": "Deleted user",
          "academicSnapshot.utmeRegNumber": undefined,
          "academicSnapshot.stateOfOrigin": undefined,
          "academicSnapshot.residentialState": undefined,
        },
      }
    );
  }
  await StudentProfileModel.deleteOne({ user: user._id });

  await tokenService.revokeAllRefreshTokensForUser(user._id);

  const deletedMarker = `deleted-${user._id}@myschoolplacement.deleted`;
  user.firstName = "Deleted";
  user.lastName = "User";
  user.email = deletedMarker;
  user.phone = undefined;
  user.googleId = undefined;
  user.appleId = undefined;
  user.emailVerified = false;
  user.status = USER_STATUS.DELETED;
  await user.save();

  await auditService.record({ user: user._id, action: "ACCOUNT_DELETED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id, req });
}

module.exports = {
  login,
  refresh,
  logout,
  updateAccount,
  deleteAccount,
};
