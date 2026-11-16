const sessionPassService = require("../services/sessionPass.service");
const env = require("../config/env");
const { PaymentRequiredError } = require("../errors/AppError");

// serviceType may be a fixed string ("domestic"/"international") or a
// function of req (e.g. req => req.body.serviceType) for routes where the
// caller picks the track, like adviser-enquiry creation.
function requireSessionPass(serviceType) {
  return async function (req, res, next) {
    try {
      const resolvedType = typeof serviceType === "function" ? serviceType(req) : serviceType;
      const pass = await sessionPassService.getActivePass(req.user._id, resolvedType);
      if (!pass) {
        throw new PaymentRequiredError("An active session pass is required to access this feature", {
          serviceType: resolvedType,
          price: resolvedType ? env.sessionPassPrices[resolvedType] : undefined,
          currency: env.sessionPassCurrency,
        });
      }
      req.sessionPass = pass;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireSessionPass };
