const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const generalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMinutes * 60 * 1000,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
});

const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMinutes * 60 * 1000,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many authentication attempts. Please try again later." },
  },
});

// Each message is a real, metered Anthropic API call — tighter than the
// general limiter regardless of the per-assessment message cap in
// chatService.js, which bounds total spend rather than request rate.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many chat messages. Please slow down." } },
});

module.exports = { generalLimiter, authLimiter, chatLimiter };
