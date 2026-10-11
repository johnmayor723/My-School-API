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
  // INACTIVE (pending parental consent) deliberately passes through here —
  // those students still need to reach /auth/me, /profile, and
  // /parent-consent. requireActive is the gate for everything else.
  if (user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.DELETED) {
    throw new ForbiddenError("Account is not active");
  }

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

// Gate for features a pending-consent student shouldn't reach yet
// (assessments, chat, payments, compare) — profile/account routes stay
// reachable under plain authenticate() so the student can see their status.
function requireActive(req, res, next) {
  if (!req.user || req.user.status !== USER_STATUS.ACTIVE) {
    throw new ForbiddenError(
      "This account is pending parental consent. Ask a parent or guardian to verify before using this feature."
    );
  }
  next();
}

module.exports = { authenticate, requireStudent, requireStaff, requireActive };
