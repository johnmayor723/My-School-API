const cutoffSourceService = require("../../services/cutoffSource.service");
const { sendSuccess } = require("../../responses/ApiResponse");

async function list(req, res) {
  const sources = await cutoffSourceService.list();
  sendSuccess(res, { data: sources });
}

async function getById(req, res) {
  const source = await cutoffSourceService.getById(req.params.id);
  sendSuccess(res, { data: source });
}

async function create(req, res) {
  const source = await cutoffSourceService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Cutoff source created", data: source });
}

async function update(req, res) {
  const source = await cutoffSourceService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Cutoff source updated", data: source });
}

module.exports = { list, getById, create, update };
