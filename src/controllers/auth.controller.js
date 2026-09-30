const authService = require("../services/auth.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function login(req, res) {
  const result = await authService.login(req.body, { ip: req.ip });
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

async function me(req, res) {
  sendSuccess(res, { data: req.user.toSafeJSON() });
}

async function updateMe(req, res) {
  const user = await authService.updateAccount(req.user._id, req.body);
  sendSuccess(res, { message: "Account updated", data: user });
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  updateMe,
};
