const accountAuthService = require("../services/accountAuth.service");
const { sendSuccess } = require("../../../responses/ApiResponse");

async function requestCode(req, res) {
  await accountAuthService.requestCode(req.body);
  sendSuccess(res, { message: "If that identifier is valid, a code has been sent" });
}

async function verifyCode(req, res) {
  const result = await accountAuthService.verifyCodeAndRoute(req.body, { ip: req.ip });
  sendSuccess(res, { message: result.isNewAccount ? "Code verified — continue sign-up" : "Logged in", data: result });
}

async function completeSignup(req, res) {
  const result = await accountAuthService.completeSignup(req.body, { ip: req.ip });
  sendSuccess(res, { statusCode: 201, message: "Account created", data: result });
}

async function requestAddEmail(req, res) {
  await accountAuthService.requestAddEmail(req.user, req.body.email);
  sendSuccess(res, { message: "A code has been sent to that email" });
}

async function confirmAddEmail(req, res) {
  const user = await accountAuthService.confirmAddEmail(req.user, req.body);
  sendSuccess(res, { message: "Email added", data: { user } });
}

async function requestDeletionCode(req, res) {
  await accountAuthService.requestAccountDeletion(req.user);
  sendSuccess(res, { message: "A confirmation code has been sent to you" });
}

async function confirmDeletion(req, res) {
  await accountAuthService.confirmAccountDeletion(req.user, req.body.code, { req });
  sendSuccess(res, { message: "Account deleted" });
}

async function exportData(req, res) {
  const data = await accountAuthService.exportMyData(req.user);
  res.setHeader("Content-Disposition", "attachment; filename=my-school-placement-data.json");
  sendSuccess(res, { data });
}

module.exports = {
  requestCode,
  verifyCode,
  completeSignup,
  requestAddEmail,
  confirmAddEmail,
  requestDeletionCode,
  confirmDeletion,
  exportData,
};
