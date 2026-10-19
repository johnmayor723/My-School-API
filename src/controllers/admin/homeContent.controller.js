const homeContentService = require("../../services/homeContent.service");
const { sendSuccess } = require("../../responses/ApiResponse");

async function get(_req, res) {
  const result = await homeContentService.get();
  sendSuccess(res, { data: result });
}

async function update(req, res) {
  const result = await homeContentService.update(req.body, req.user, req);
  sendSuccess(res, { message: "Home content updated", data: result });
}

module.exports = { get, update };
