const scholarshipClient = require("../services/scholarshipService.client");
const savedScholarshipService = require("../services/savedScholarship.service");
const scholarshipMatching = require("../services/scholarshipMatching");
const scholarshipRedaction = require("../services/scholarshipRedaction");
const sessionPassService = require("../services/sessionPass.service");
const { StudentProfile, Programme } = require("../models");
const { sendSuccess } = require("../responses/ApiResponse");

// Any active session pass (either track) unlocks the full, non-redacted
// fields -- scholarship assistance isn't domestic/international-specific.
async function isUnlocked(req) {
  if (!req.user) return false;
  return sessionPassService.hasActivePass(req.user._id);
}

// Public, read-only, reachable by anonymous visitors (authenticateOptional).
// No MACL-side filtering on status/provenance -- every status, including
// unconfirmed/review_required, stays visible so students can judge source
// quality themselves. The only thing withheld pre-payment is application_url
// and deadline (see scholarshipRedaction.js).
async function list(req, res) {
  const { page, limit, session, status, q, level, fundingType, sourceType } = req.query;
  const offset = page && limit ? (page - 1) * limit : undefined;
  const result = await scholarshipClient.listScholarships({ session, status, q, level, fundingType, sourceType, limit, offset });
  const unlocked = await isUnlocked(req);
  sendSuccess(res, { data: scholarshipRedaction.redactList(result.data, unlocked), meta: result.meta });
}

async function getById(req, res) {
  const result = await scholarshipClient.getScholarship(req.params.id);
  const unlocked = await isUnlocked(req);
  sendSuccess(res, { data: scholarshipRedaction.redact(result.data, unlocked), meta: result.meta });
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

// Free -- matching itself is not the paid feature, only the exact
// application_url/deadline are (same redaction as list/getById above).
// Filters/sorts the scholarship-service list against the student's own
// profile via scholarshipMatching.js, rather than inventing a new scoring system.
async function personalized(req, res) {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  const programme = profile?.preferredProgramme ? await Programme.findById(profile.preferredProgramme) : null;

  const result = await scholarshipClient.listScholarships({ status: "open,upcoming", limit: 100 });
  const personalizedList = scholarshipMatching.personalize(result.data, profile || {}, programme);
  const unlocked = await isUnlocked(req);

  sendSuccess(res, { data: scholarshipRedaction.redactList(personalizedList, unlocked) });
}

module.exports = { list, getById, saveScholarship, unsaveScholarship, listSaved, personalized };
