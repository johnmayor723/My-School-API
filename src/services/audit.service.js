const { AuditLog } = require("../models");
const logger = require("../config/logger");

async function record({ user, action, resourceType, resourceId, previousValue, newValue, req }) {
  try {
    await AuditLog.create({
      user: user || null,
      action,
      resourceType,
      resourceId,
      previousValue,
      newValue,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      correlationId: req?.headers?.["x-correlation-id"],
    });
  } catch (err) {
    // Auditing must never block the primary action it is observing.
    logger.error("Failed to write audit log", { error: err.message, action, resourceType, resourceId });
  }
}

module.exports = { record };
