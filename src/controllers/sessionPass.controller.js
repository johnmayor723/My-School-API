const sessionPassService = require("../services/sessionPass.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function initialize(req, res) {
  const pass = await sessionPassService.initializePass(req.user, req, req.body.serviceType);
  sendSuccess(res, { statusCode: 201, message: "Session pass initialized", data: pass });
}

async function verify(req, res) {
  const pass = await sessionPassService.verifyPass(req.params.reference, req);
  sendSuccess(res, { message: "Session pass verified", data: pass });
}

async function getActive(req, res) {
  const pass = await sessionPassService.getActivePass(req.user._id, req.query.serviceType);
  sendSuccess(res, { data: pass });
}

async function webhook(req, res) {
  await sessionPassService.handleWebhook(
    req.params.provider,
    req.rawBody,
    req.headers["x-paystack-signature"] || req.headers["verif-hash"] || req.headers["x-webhook-signature"]
  );
  res.status(200).json({ received: true });
}

// ProvidusBank calls this directly -- no app auth, no shared error envelope.
// The response body's exact shape is the contract; always 200, the bank
// reads responseCode to decide success/duplicate/rejected/retry.
async function providusSettlementNotification(req, res) {
  const result = await sessionPassService.handleProvidusSettlementNotification(req.body, req.headers["x-auth-signature"]);
  res.status(200).json(result);
}

module.exports = { initialize, verify, getActive, webhook, providusSettlementNotification };
