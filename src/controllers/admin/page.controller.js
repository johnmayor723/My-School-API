const pageService = require("../../services/page.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const { items, total } = await pageService.list({ page, limit });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const result = await pageService.getById(req.params.id);
  sendSuccess(res, { data: result });
}

async function create(req, res) {
  const result = await pageService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Page created", data: result });
}

async function update(req, res) {
  const result = await pageService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Page updated", data: result });
}

async function remove(req, res) {
  await pageService.remove(req.params.id, req.user, req);
  sendSuccess(res, { message: "Page deleted" });
}

module.exports = { list, getById, create, update, remove };
