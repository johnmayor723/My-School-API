const programmeService = require("../services/programme.service");
const { sendSuccess, paginationMeta } = require("../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, search, faculty, institution } = req.query;
  const { items, total } = await programmeService.list({ page, limit, search, faculty, institution });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function search(req, res) {
  const items = await programmeService.search(req.query.q, req.query.limit ? Number(req.query.limit) : 20);
  sendSuccess(res, { data: items });
}

async function getById(req, res) {
  const result = await programmeService.getById(req.params.id);
  sendSuccess(res, { data: result });
}

module.exports = { list, search, getById };
