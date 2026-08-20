const auditLogService = require("../../services/auditLog.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, resourceType, resourceId, action, user } = req.query;
  const { items, total } = await auditLogService.list({ page, limit, resourceType, resourceId, action, user });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

module.exports = { list };
