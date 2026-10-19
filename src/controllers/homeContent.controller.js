const homeContentService = require("../services/homeContent.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function get(_req, res) {
  const content = await homeContentService.get();
  sendSuccess(res, { data: content });
}

module.exports = { get };
