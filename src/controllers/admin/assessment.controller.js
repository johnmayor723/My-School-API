const assessmentService = require("../../services/assessment.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, status, paymentStatus, student, from, to } = req.query;
  const { items, total } = await assessmentService.listAll({ page, limit, status, paymentStatus, student, from, to });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const assessment = await assessmentService.getAssessment(req.params.id, req.user);
  sendSuccess(res, { data: assessment });
}

module.exports = { list, getById };
