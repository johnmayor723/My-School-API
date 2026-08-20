const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuid } = require("uuid");
const env = require("../config/env");
const { RefreshToken } = require("../models");
const { UnauthorizedError } = require("../errors/AppError");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), userType: user.userType, type: "access" }, env.jwtSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

function signRefreshToken(user, jti) {
  return jwt.sign({ sub: String(user._id), type: "refresh", jti }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

function msFromDuration(durationString) {
  // Minimal parser for values like "30d", "15m", "12h" used elsewhere in this codebase.
  const match = /^(\d+)([smhd])$/.exec(durationString);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unit;
}

async function issueTokenPair(user, { ip } = {}) {
  const accessToken = signAccessToken(user);
  const jti = uuid();
  const refreshToken = signRefreshToken(user, jti);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + msFromDuration(env.jwtRefreshExpiresIn)),
    createdByIp: ip,
  });

  return { accessToken, refreshToken };
}

async function rotateRefreshToken(refreshToken, { ip } = {}) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
  if (payload.type !== "refresh") throw new UnauthorizedError("Invalid token type");

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
  if (!stored || !stored.isActive()) throw new UnauthorizedError("Refresh token has been revoked or has expired");

  const { User } = require("../models");
  const user = await User.findById(payload.sub).populate("roles");
  if (!user) throw new UnauthorizedError("Account no longer exists");

  const newPair = await issueTokenPair(user, { ip });

  stored.revokedAt = new Date();
  stored.replacedByTokenHash = hashToken(newPair.refreshToken);
  await stored.save();

  return { user, ...newPair };
}

async function revokeRefreshToken(refreshToken) {
  await RefreshToken.updateOne({ tokenHash: hashToken(refreshToken), revokedAt: null }, { revokedAt: new Date() });
}

async function revokeAllRefreshTokensForUser(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  hashToken,
};
