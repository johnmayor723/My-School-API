const contactSubmissionService = require("../../services/contactSubmission.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, read } = req.query;
  const readFilter = read === undefined ? undefined : read === "true";
  const { items, total } = await contactSubmissionService.list({ page, limit, read: readFilter });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function markRead(req, res) {
  const result = await contactSubmissionService.markRead(req.params.id, req.body.read !== false, req.user, req);
  sendSuccess(res, { message: "Contact submission updated", data: result });
}

module.exports = { list, markRead };
