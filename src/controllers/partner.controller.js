const partnerService = require("../services/partner.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function list(_req, res) {
  const partners = await partnerService.list();
  sendSuccess(res, { data: partners });
}

module.exports = { list };
