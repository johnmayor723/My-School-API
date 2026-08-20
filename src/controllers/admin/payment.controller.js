const paymentService = require("../../services/payment.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, status, user } = req.query;
  const { items, total } = await paymentService.listAll({ page, limit, status, user });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getByReference(req, res) {
  const payment = await paymentService.getByReference(req.params.reference, req.user);
  sendSuccess(res, { data: payment });
}

module.exports = { list, getByReference };
