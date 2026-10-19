const partnerService = require("../../services/partner.service");
const { sendSuccess } = require("../../responses/ApiResponse");

async function list(_req, res) {
  const result = await partnerService.list();
  sendSuccess(res, { data: result });
}

async function create(req, res) {
  const result = await partnerService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Partner created", data: result });
}

async function update(req, res) {
  const result = await partnerService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Partner updated", data: result });
}

async function remove(req, res) {
  await partnerService.remove(req.params.id, req.user, req);
  sendSuccess(res, { message: "Partner deleted" });
}

module.exports = { list, create, update, remove };
