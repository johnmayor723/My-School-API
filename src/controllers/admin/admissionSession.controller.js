const admissionSessionService = require("../../services/admissionSession.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const { items, total } = await admissionSessionService.list({ page, limit });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function create(req, res) {
  const session = await admissionSessionService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Admission session created", data: session });
}

async function update(req, res) {
  const session = await admissionSessionService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Admission session updated", data: session });
}

module.exports = { list, create, update };
