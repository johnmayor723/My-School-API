const institutionService = require("../services/institution.service");
const { sendSuccess, paginationMeta } = require("../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, state, ownership, institutionType, search } = req.query;
  const { items, total } = await institutionService.list({ page, limit, state, ownership, institutionType, search });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const result = await institutionService.getById(req.params.id);
  sendSuccess(res, { data: result });
}

module.exports = { list, getById };
