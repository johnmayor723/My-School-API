const postService = require("../../services/post.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const { items, total } = await postService.list({ page, limit });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const result = await postService.getById(req.params.id);
  sendSuccess(res, { data: result });
}

async function create(req, res) {
  const result = await postService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Post created", data: result });
}

async function update(req, res) {
  const result = await postService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Post updated", data: result });
}

async function remove(req, res) {
  await postService.remove(req.params.id, req.user, req);
  sendSuccess(res, { message: "Post deleted" });
}

module.exports = { list, getById, create, update, remove };
