const scholarshipClient = require("../services/scholarshipService.client");
const savedScholarshipService = require("../services/savedScholarship.service");
const { sendSuccess } = require("../responses/ApiResponse");

// Public, read-only: thin pass-through to scholarship-service's own public
// endpoints. No MACL-side filtering -- scholarship-service already withholds
// nothing on these routes (every status, including unconfirmed/review_required,
// is visible), so students can see provenance/verification state too.
async function list(req, res) {
  const { page, limit, session, status, q, level, fundingType, sourceType } = req.query;
  const offset = page && limit ? (page - 1) * limit : undefined;
  const result = await scholarshipClient.listScholarships({ session, status, q, level, fundingType, sourceType, limit, offset });
  sendSuccess(res, { data: result.data, meta: result.meta });
}

async function getById(req, res) {
  const result = await scholarshipClient.getScholarship(req.params.id);
  sendSuccess(res, { data: result.data, meta: result.meta });
}

// Save/unsave/list deliberately sit behind only authenticate+requireStudent,
// not requireActive -- a confirmed, deliberate exception to the pattern
// assessments/compare/payments use (see SCHOLARSHIP_IMPLEMENTATION_PLAN.md
// Stage 6 decisions, 2026-10-11): a pending-parental-consent student can
// still save scholarships.
async function saveScholarship(req, res) {
  const saved = await savedScholarshipService.save(req.user._id, req.params.id);
  sendSuccess(res, { statusCode: 201, message: "Scholarship saved", data: saved });
}

async function unsaveScholarship(req, res) {
  await savedScholarshipService.unsave(req.user._id, req.params.id);
  sendSuccess(res, { message: "Scholarship removed from saved list" });
}

async function listSaved(req, res) {
  const saved = await savedScholarshipService.list(req.user._id);
  sendSuccess(res, { data: saved });
}

module.exports = { list, getById, saveScholarship, unsaveScholarship, listSaved };
