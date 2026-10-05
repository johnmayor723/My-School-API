const crypto = require("crypto");
const { OneTimeCode } = require("../../../models");
const { OTP_CHANNEL } = require("../../../config/constants");
const { UnauthorizedError, TooManyRequestsError } = require("../../../errors/AppError");
const env = require("../../../config/env");
const notificationService = require("../../../services/notification.service");
const { sendSms } = require("../../../utils/smsSender");

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function normalizeIdentifier(identifier) {
  return String(identifier).trim().toLowerCase();
}

/**
 * Generates and dispatches a one-time code for the given identifier+purpose,
 * enforcing a per-identifier cooldown and hourly cap so IP-based rate
 * limiting isn't the only defense against someone spamming a victim's inbox
 * from many IPs.
 */
function isReviewIdentifier(normalized) {
  return Boolean(env.otp.reviewIdentifier) && normalized === normalizeIdentifier(env.otp.reviewIdentifier);
}

async function generateAndSendCode({ identifier, channel, purpose, userId }) {
  const normalized = normalizeIdentifier(identifier);

  // App-store reviewer: no code is generated/sent — they sign in with the
  // fixed OTP_REVIEW_CODE straight away. Never touches OneTimeCode.
  if (isReviewIdentifier(normalized)) return null;

  const recent = await OneTimeCode.findOne({ identifier: normalized, purpose }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < env.otp.cooldownSeconds * 1000) {
    throw new TooManyRequestsError("Please wait before requesting another code");
  }

  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  const countInWindow = await OneTimeCode.countDocuments({ identifier: normalized, purpose, createdAt: { $gte: windowStart } });
  if (countInWindow >= env.otp.maxPerHourPerIdentifier) {
    throw new TooManyRequestsError("Too many code requests for this identifier. Please try again later.");
  }

  const code = crypto.randomInt(0, 10 ** env.otp.codeLength).toString().padStart(env.otp.codeLength, "0");
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60 * 1000);

  const record = await OneTimeCode.create({
    identifier: normalized,
    channel,
    purpose,
    codeHash: hashCode(code),
    user: userId || null,
    expiresAt,
  });

  if (channel === OTP_CHANNEL.EMAIL) {
    await notificationService.sendOtpEmail(normalized, code, { ttlMinutes: env.otp.ttlMinutes });
  } else {
    await sendSms(normalized, `Your My School Placement code is ${code}. It expires in ${env.otp.ttlMinutes} minutes.`);
  }

  return record;
}

const MAX_ATTEMPTS = 5;

/**
 * Verifies a code without ever distinguishing "wrong code" vs "expired" vs
 * "already used" in the response — that distinction is an oracle an attacker
 * shouldn't get for free.
 */
async function verifyCode({ identifier, purpose, code }) {
  const normalized = normalizeIdentifier(identifier);

  if (isReviewIdentifier(normalized)) {
    if (code !== env.otp.reviewCode) throw new UnauthorizedError("Invalid or expired code");
    return { identifier: normalized, purpose, consumedAt: new Date() };
  }

  const record = await OneTimeCode.findOne({
    identifier: normalized,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record || record.attempts >= MAX_ATTEMPTS) {
    throw new UnauthorizedError("Invalid or expired code");
  }

  if (hashCode(code) !== record.codeHash) {
    record.attempts += 1;
    await record.save();
    throw new UnauthorizedError("Invalid or expired code");
  }

  record.consumedAt = new Date();
  await record.save();
  return record;
}

module.exports = { generateAndSendCode, verifyCode };
