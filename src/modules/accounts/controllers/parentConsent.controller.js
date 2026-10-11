const parentConsentService = require("../services/parentConsent.service");
const { sendSuccess } = require("../../../responses/ApiResponse");

async function getStatus(req, res) {
  const consent = await parentConsentService.getStatus(req.user);
  sendSuccess(res, { data: { consent } });
}

async function resend(req, res) {
  await parentConsentService.resend(req.user);
  sendSuccess(res, { message: "A new code has been sent to your parent or guardian" });
}

async function verify(req, res) {
  const result = await parentConsentService.verify(req.body);
  sendSuccess(res, { message: "Consent verified — the student's account is now active", data: result });
}

module.exports = { getStatus, resend, verify };
