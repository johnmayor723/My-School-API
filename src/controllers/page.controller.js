const pageService = require("../services/page.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function getBySlug(req, res) {
  const page = await pageService.getBySlug(req.params.slug);
  sendSuccess(res, { data: page });
}

module.exports = { getBySlug };
