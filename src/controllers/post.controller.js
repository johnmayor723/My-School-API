const postService = require("../services/post.service");
const { sendSuccess, paginationMeta } = require("../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const { items, total } = await postService.list({ page, limit });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getBySlug(req, res) {
  const post = await postService.getBySlug(req.params.slug);
  sendSuccess(res, { data: post });
}

module.exports = { list, getBySlug };
