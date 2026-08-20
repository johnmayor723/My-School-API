const assessmentService = require("../services/assessment.service");
const { sendSuccess, paginationMeta } = require("../responses/ApiResponse");

async function create(req, res) {
  const assessment = await assessmentService.createAssessment(req.user._id, req.body, req);
  sendSuccess(res, { statusCode: 201, message: "Assessment created", data: assessment });
}

async function list(req, res) {
  const { page = 1, limit = 20, status, paymentStatus } = req.query;
  const { items, total } = await assessmentService.listMine(req.user._id, { page, limit, status, paymentStatus });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const assessment = await assessmentService.getAssessment(req.params.id, req.user);
  sendSuccess(res, { data: assessment });
}

async function getRecommendations(req, res) {
  const { assessment, recommendations } = await assessmentService.getRecommendations(req.params.id, req.user);
  sendSuccess(res, { data: { assessment, recommendations } });
}

module.exports = { create, list, getById, getRecommendations };
