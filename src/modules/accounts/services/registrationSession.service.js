const jwt = require("jsonwebtoken");
const env = require("../../../config/env");
const { UnauthorizedError } = require("../../../errors/AppError");

const SESSION_TYPE = "registration_session";
const SESSION_TTL = "15m";

/**
 * Carries state across the multi-step sign-up flow (code verified -> account
 * type -> DOB -> profile) without ever writing a partial/draft User document.
 * Reuses env.jwtSecret rather than adding another required env var to a live
 * deployment — the `type` claim is the same discriminator token.service.js
 * already uses to tell access/refresh tokens apart.
 */
function issue(payload) {
  return jwt.sign({ ...payload, type: SESSION_TYPE }, env.jwtSecret, { expiresIn: SESSION_TTL });
}

function verify(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new UnauthorizedError("This sign-up session has expired. Please start again.");
  }
  if (payload.type !== SESSION_TYPE) throw new UnauthorizedError("Invalid session token");

  const { iat, exp, type, ...rest } = payload;
  return rest;
}

module.exports = { issue, verify };
