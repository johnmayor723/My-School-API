const { ForbiddenError } = require("../errors/AppError");
const { USER_TYPES } = require("../config/constants");

/**
 * Requires the authenticated staff user to hold at least one of the given
 * permissions. Must run after `authenticate`.
 */
function permit(...permissions) {
  return function permitMiddleware(req, res, next) {
    if (!req.user || req.user.userType !== USER_TYPES.STAFF) {
      throw new ForbiddenError("This action is only available to authorised platform staff");
    }
    const granted = permissions.some((permission) => req.user.hasPermission(permission));
    if (!granted) {
      throw new ForbiddenError(`This action requires one of the following permissions: ${permissions.join(", ")}`);
    }
    next();
  };
}

module.exports = { permit };
