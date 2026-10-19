const programService = require("../../services/program.service");
const { sendSuccess } = require("../../responses/ApiResponse");

async function list(req, res) {
  const result = await programService.list({ category: req.query.category });
  sendSuccess(res, { data: result });
}

async function create(req, res) {
  const result = await programService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Program created", data: result });
}

async function update(req, res) {
  const result = await programService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Program updated", data: result });
}

async function remove(req, res) {
  await programService.remove(req.params.id, req.user, req);
  sendSuccess(res, { message: "Program deleted" });
}

module.exports = { list, create, update, remove };
