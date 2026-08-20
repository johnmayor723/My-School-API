const admissionRuleService = require("../../services/admissionRule.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, institution, programme, admissionSession, status } = req.query;
  const { items, total } = await admissionRuleService.list({ page, limit, institution, programme, admissionSession, status });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const rule = await admissionRuleService.getById(req.params.id);
  sendSuccess(res, { data: rule });
}

async function create(req, res) {
  const rule = await admissionRuleService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Admission rule created as draft", data: rule });
}

async function update(req, res) {
  const rule = await admissionRuleService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Admission rule updated", data: rule });
}

async function submitForReview(req, res) {
  const rule = await admissionRuleService.submitForReview(req.params.id, req.user, req);
  sendSuccess(res, { message: "Admission rule submitted for review", data: rule });
}

async function review(req, res) {
  const rule = await admissionRuleService.review(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Admission rule review recorded", data: rule });
}

async function approve(req, res) {
  const rule = await admissionRuleService.approve(req.params.id, req.user, req);
  sendSuccess(res, { message: "Admission rule approved", data: rule });
}

async function publish(req, res) {
  const rule = await admissionRuleService.publish(req.params.id, req.user, req);
  sendSuccess(res, { message: "Admission rule published", data: rule });
}

async function archive(req, res) {
  const rule = await admissionRuleService.archive(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Admission rule archived", data: rule });
}

module.exports = { list, getById, create, update, submitForReview, review, approve, publish, archive };
