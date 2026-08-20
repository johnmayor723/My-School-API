const paymentService = require("../services/payment.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function initialize(req, res) {
  const payment = await paymentService.initializePayment(req.body.assessmentId, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Payment initialized", data: payment });
}

async function verify(req, res) {
  const payment = await paymentService.verifyPayment(req.params.reference, req);
  sendSuccess(res, { message: "Payment verified", data: payment });
}

async function getByReference(req, res) {
  const payment = await paymentService.getByReference(req.params.reference, req.user);
  sendSuccess(res, { data: payment });
}

async function webhook(req, res) {
  await paymentService.handleWebhook(req.params.provider, req.rawBody, req.headers["x-paystack-signature"] || req.headers["verif-hash"] || req.headers["x-webhook-signature"]);
  res.status(200).json({ received: true });
}

module.exports = { initialize, verify, getByReference, webhook };
