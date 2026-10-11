const scholarshipClient = require("../../services/scholarshipService.client");
const auditService = require("../../services/audit.service");
const { sendSuccess } = require("../../responses/ApiResponse");
const { RESOURCE_TYPES } = require("../../config/constants");

// scholarship-service's public listing already returns every status
// (unconfirmed/review_required included), so admin "list" reuses the same
// upstream call as the public controller -- there is nothing extra to reveal.
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

// One action covers both "verify" (status/verified/verificationNotes) and
// "confirm dates" (deadline/applicationUrl) -- scholarship-service treats
// them as the same editorial-review PATCH, so this does too.
async function update(req, res) {
  const { status, verified, verificationNotes, deadline, applicationUrl } = req.body;
  const payload = {};
  if (status !== undefined) payload.status = status;
  if (verified !== undefined) payload.verified = verified;
  if (verificationNotes !== undefined) payload.verificationNotes = verificationNotes;
  if (deadline !== undefined) payload.deadline = deadline;
  if (applicationUrl !== undefined) payload.applicationUrl = applicationUrl;

  const result = await scholarshipClient.updateVerification(req.params.id, payload);

  await auditService.record({
    user: req.user._id,
    action: "SCHOLARSHIP_VERIFICATION_UPDATED",
    resourceType: RESOURCE_TYPES.SCHOLARSHIP,
    resourceId: req.params.id,
    newValue: payload,
    req,
  });
  sendSuccess(res, { message: "Scholarship updated", data: result.data });
}

async function remove(req, res) {
  await scholarshipClient.deleteScholarship(req.params.id);

  await auditService.record({
    user: req.user._id,
    action: "SCHOLARSHIP_DELETED",
    resourceType: RESOURCE_TYPES.SCHOLARSHIP,
    resourceId: req.params.id,
    req,
  });
  sendSuccess(res, { message: "Scholarship deleted" });
}

async function listSources(_req, res) {
  const result = await scholarshipClient.listSources();
  sendSuccess(res, { data: result.data, meta: result.meta });
}

async function addSource(req, res) {
  const result = await scholarshipClient.addSource(req.body);

  await auditService.record({
    user: req.user._id,
    action: "SCHOLARSHIP_SOURCE_ADDED",
    resourceType: RESOURCE_TYPES.SCHOLARSHIP_SOURCE,
    newValue: req.body,
    req,
  });
  sendSuccess(res, { statusCode: 201, message: "Source added", data: result.data });
}

async function patchSource(req, res) {
  const result = await scholarshipClient.patchSource(req.params.id, req.body);

  await auditService.record({
    user: req.user._id,
    action: "SCHOLARSHIP_SOURCE_UPDATED",
    resourceType: RESOURCE_TYPES.SCHOLARSHIP_SOURCE,
    newValue: { sourceId: req.params.id, ...req.body },
    req,
  });
  sendSuccess(res, { message: "Source updated", data: result.data });
}

async function listCrawlRuns(_req, res) {
  const result = await scholarshipClient.listCrawlRuns();
  sendSuccess(res, { data: result.data, meta: result.meta });
}

async function triggerCrawl(req, res) {
  const result = await scholarshipClient.triggerCrawl();

  await auditService.record({
    user: req.user._id,
    action: "SCHOLARSHIP_CRAWL_TRIGGERED",
    resourceType: RESOURCE_TYPES.SCHOLARSHIP_SOURCE,
    newValue: result.data,
    req,
  });
  sendSuccess(res, { message: "Crawl started", data: result.data });
}

module.exports = { list, getById, update, remove, listSources, addSource, patchSource, listCrawlRuns, triggerCrawl };
