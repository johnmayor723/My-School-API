const institutionService = require("../../services/institution.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, state, ownership, institutionType, search, status } = req.query;
  const { items, total } = await institutionService.list({ page, limit, state, ownership, institutionType, search, status });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const result = await institutionService.getById(req.params.id);
  sendSuccess(res, { data: result });
}

async function create(req, res) {
  const institution = await institutionService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Institution created", data: institution });
}

async function update(req, res) {
  const institution = await institutionService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Institution updated", data: institution });
}

async function remove(req, res) {
  await institutionService.remove(req.params.id, req.user, req);
  sendSuccess(res, { message: "Institution deactivated" });
}

async function addProgrammeOffering(req, res) {
  const offering = await institutionService.addProgrammeOffering(req.params.id, req.body.programme, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Programme offering added", data: offering });
}

module.exports = { list, getById, create, update, remove, addProgrammeOffering };
