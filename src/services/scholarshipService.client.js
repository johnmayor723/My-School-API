const axios = require("axios");
const env = require("../config/env");
const { AppError } = require("../errors/AppError");

function client() {
  return axios.create({
    baseURL: env.scholarshipService.baseUrl,
    timeout: 15000,
  });
}

function adminClient() {
  if (!env.scholarshipService.adminApiKey) {
    throw new AppError(
      "Scholarship service admin actions are not configured (SCHOLARSHIP_SERVICE_ADMIN_API_KEY is missing)",
      500,
      "SCHOLARSHIP_SERVICE_NOT_CONFIGURED"
    );
  }
  return axios.create({
    baseURL: env.scholarshipService.baseUrl,
    timeout: 20000,
    headers: { "x-admin-api-key": env.scholarshipService.adminApiKey },
  });
}

// scholarship-service already wraps its own responses as { success, data, meta }
// (same envelope convention this app uses) -- pass that through rather than
// re-wrapping, callers here just unwrap .data.
async function unwrap(promise) {
  try {
    const { data } = await promise;
    return data;
  } catch (err) {
    if (err.response) {
      const upstream = err.response.data;
      throw new AppError(
        upstream?.error || "Scholarship service request failed",
        err.response.status >= 500 ? 502 : err.response.status,
        "SCHOLARSHIP_SERVICE_ERROR"
      );
    }
    throw new AppError("Could not reach the scholarship service", 502, "SCHOLARSHIP_SERVICE_UNREACHABLE");
  }
}

async function listScholarships(params) {
  return unwrap(client().get("/api/scholarships", { params }));
}

async function getScholarship(id) {
  return unwrap(client().get(`/api/scholarships/${encodeURIComponent(id)}`));
}

async function listSources() {
  return unwrap(client().get("/api/sources"));
}

async function listCrawlRuns() {
  return unwrap(client().get("/api/crawl-runs"));
}

async function triggerCrawl() {
  return unwrap(adminClient().post("/api/admin/crawl"));
}

async function addSource(payload) {
  return unwrap(adminClient().post("/api/admin/sources", payload));
}

async function patchSource(id, payload) {
  return unwrap(adminClient().patch(`/api/admin/sources/${encodeURIComponent(id)}`, payload));
}

// Covers both "verify" (status/verified/verificationNotes) and "confirm dates"
// (deadline/applicationUrl) -- scholarship-service exposes these as one
// endpoint since they're the same editorial-review action.
async function updateVerification(id, payload) {
  return unwrap(adminClient().patch(`/api/admin/scholarships/${encodeURIComponent(id)}/verification`, payload));
}

async function deleteScholarship(id) {
  return unwrap(adminClient().delete(`/api/admin/scholarships/${encodeURIComponent(id)}`));
}

module.exports = {
  listScholarships,
  getScholarship,
  listSources,
  listCrawlRuns,
  triggerCrawl,
  addSource,
  patchSource,
  updateVerification,
  deleteScholarship,
};
