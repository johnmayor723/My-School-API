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

async function create(req, res) {
  const user = await userService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "User created", data: user });
}

async function update(req, res) {
  const user = await userService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "User updated", data: user });
}

async function remove(req, res) {
  await userService.remove(req.params.id, req.user, req);
  sendSuccess(res, { message: "User deleted", data: null });
}

module.exports = { list, getById, create, update, remove };
