const crypto = require("crypto");
const { User, StudentProfile } = require("../models");
const tokenService = require("./token.service");
const notificationService = require("./notification.service");
const auditService = require("./audit.service");
const logger = require("../config/logger");
const { ConflictError, UnauthorizedError, ForbiddenError } = require("../errors/AppError");
const { USER_TYPES, USER_STATUS, RESOURCE_TYPES } = require("../config/constants");

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function register({ firstName, lastName, email, phone, password, fullName, utmeRegNumber, utmeScore }, { ip } = {}) {
  const existing = await User.findOne({ email });
  if (existing) throw new ConflictError("An account with this email already exists");

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    passwordHash: password,
    userType: USER_TYPES.STUDENT,
  });

  await StudentProfile.create({
    user: user._id,
    fullName: fullName || `${firstName} ${lastName}`,
    utmeRegNumber,
    utmeScore,
  });

  notificationService.sendWelcomeEmail(user).catch((err) => logger.warn("Welcome email failed", { error: err.message }));
  await auditService.record({ user: user._id, action: "USER_REGISTERED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id });

  const tokens = await tokenService.issueTokenPair(user, { ip });
  return { user: user.toSafeJSON(), ...tokens };
}

async function login({ email, password }, { ip } = {}) {
  const user = await User.findOne({ email }).select("+passwordHash").populate("roles");
  if (!user) throw new UnauthorizedError("Invalid email or password");

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

async function forgotPassword(email) {
  const user = await User.findOne({ email });
  // Always behave the same whether or not the account exists, to avoid leaking which emails are registered.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = hashResetToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  await notificationService.sendPasswordResetEmail(user, rawToken);
  await auditService.record({ user: user._id, action: "PASSWORD_RESET_REQUESTED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id });
}

async function resetPassword(token, newPassword) {
  const tokenHash = hashResetToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");

  if (!user) throw new UnauthorizedError("This password reset link is invalid or has expired");

  user.passwordHash = newPassword;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await tokenService.revokeAllRefreshTokensForUser(user._id);
  await auditService.record({ user: user._id, action: "PASSWORD_RESET_COMPLETED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id });
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

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new UnauthorizedError("Account no longer exists");

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new UnauthorizedError("Current password is incorrect");

  user.passwordHash = newPassword;
  await user.save();

  await tokenService.revokeAllRefreshTokensForUser(user._id);
  await auditService.record({ user: user._id, action: "PASSWORD_CHANGED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id });
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, updateAccount, changePassword };
