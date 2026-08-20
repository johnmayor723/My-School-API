const roleService = require("../../services/role.service");
const { sendSuccess } = require("../../responses/ApiResponse");

async function list(req, res) {
  const roles = await roleService.list();
  sendSuccess(res, { data: roles });
}

async function getById(req, res) {
  const role = await roleService.getById(req.params.id);
  sendSuccess(res, { data: role });
}

async function create(req, res) {
  const role = await roleService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Role created", data: role });
}

async function update(req, res) {
  const role = await roleService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Role updated", data: role });
}

module.exports = { list, getById, create, update };
