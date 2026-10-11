const scholarshipClient = require("../services/scholarshipService.client");
const { sendSuccess } = require("../responses/ApiResponse");

// Public, read-only: thin pass-through to scholarship-service's own public
// endpoints. No MACL-side filtering -- scholarship-service already withholds
// nothing on these routes (every status, including unconfirmed/review_required,
// is visible), so students can see provenance/verification state too.
async function list(req, res) {
  const { page, limit, session, status, q, level } = req.query;
  const offset = page && limit ? (page - 1) * limit : undefined;
  const result = await scholarshipClient.listScholarships({ session, status, q, level, limit, offset });
  sendSuccess(res, { data: result.data, meta: result.meta });
}

async function getById(req, res) {
  const result = await scholarshipClient.getScholarship(req.params.id);
  sendSuccess(res, { data: result.data, meta: result.meta });
}

module.exports = { list, getById };
