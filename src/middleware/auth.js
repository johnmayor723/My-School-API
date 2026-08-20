const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { User } = require("../models");
const { UnauthorizedError, ForbiddenError } = require("../errors/AppError");
const { USER_TYPES, USER_STATUS } = require("../config/constants");

function extractToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) throw new UnauthorizedError("Authentication token was not provided");

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }

  if (payload.type !== "access") throw new UnauthorizedError("Invalid token type");

  const user = await User.findById(payload.sub).populate("roles");
  if (!user) throw new UnauthorizedError("Account no longer exists");
  if (user.status !== USER_STATUS.ACTIVE) throw new ForbiddenError("Account is not active");

  req.user = user;
  req.tokenPayload = payload;
  next();
}

function requireStudent(req, res, next) {
  if (!req.user || req.user.userType !== USER_TYPES.STUDENT) {
    throw new ForbiddenError("This action is only available to students");
  }
  next();
}

function requireStaff(req, res, next) {
  if (!req.user || req.user.userType !== USER_TYPES.STAFF) {
    throw new ForbiddenError("This action is only available to platform staff");
  }
  next();
}

module.exports = { authenticate, requireStudent, requireStaff };
