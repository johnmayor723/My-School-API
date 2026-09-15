const authService = require("../services/auth.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function register(req, res) {
  const result = await authService.register(req.body, { ip: req.ip });
  sendSuccess(res, { statusCode: 201, message: "Account created", data: result });
}

async function login(req, res) {
  const result = await authService.login(req.body, { ip: req.ip });
  sendSuccess(res, { message: "Logged in", data: result });
}

async function googleLogin(req, res) {
  const result = await authService.loginWithGoogle(req.body, { ip: req.ip });
  sendSuccess(res, { message: "Logged in", data: result });
}

async function appleLogin(req, res) {
  const result = await authService.loginWithApple(req.body, { ip: req.ip });
  sendSuccess(res, { message: "Logged in", data: result });
}

async function refresh(req, res) {
  const result = await authService.refresh(req.body.refreshToken, { ip: req.ip });
  sendSuccess(res, { message: "Token refreshed", data: result });
}

async function logout(req, res) {
  await authService.logout(req.body.refreshToken);
  sendSuccess(res, { message: "Logged out" });
}

async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, { message: "If an account with that email exists, a reset link has been sent" });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, { message: "Password has been reset" });
}

async function verifyEmail(req, res) {
  const user = await authService.verifyEmail(req.body.token);
  sendSuccess(res, { message: "Email verified", data: user });
}

async function resendVerification(req, res) {
  await authService.resendVerification(req.body.email);
  sendSuccess(res, { message: "If an account with that email exists and isn't already verified, a new link has been sent" });
}

async function me(req, res) {
  sendSuccess(res, { data: req.user.toSafeJSON() });
}

async function updateMe(req, res) {
  const user = await authService.updateAccount(req.user._id, req.body);
  sendSuccess(res, { message: "Account updated", data: user });
}

async function changePassword(req, res) {
  await authService.changePassword(req.user._id, req.body);
  sendSuccess(res, { message: "Password changed" });
}

module.exports = {
  register,
  login,
  googleLogin,
  appleLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  me,
  updateMe,
  changePassword,
};
