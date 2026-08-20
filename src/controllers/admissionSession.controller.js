const admissionSessionService = require("../services/admissionSession.service");
const { sendSuccess, paginationMeta } = require("../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const { items, total } = await admissionSessionService.list({ page, limit });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

module.exports = { list };
