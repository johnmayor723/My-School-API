const userService = require("../../services/user.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, userType, status, search } = req.query;
  const { items, total } = await userService.list({ page, limit, userType, status, search });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const user = await userService.getById(req.params.id);
  sendSuccess(res, { data: user });
}

async function createStaffUser(req, res) {
  const user = await userService.createStaffUser(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Staff user created", data: user });
}

async function updateStaffUser(req, res) {
  const user = await userService.updateStaffUser(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Staff user updated", data: user });
}

module.exports = { list, getById, createStaffUser, updateStaffUser };
