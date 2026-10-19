const programService = require("../services/program.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function list(req, res) {
  const programs = await programService.list({ category: req.query.category });
  sendSuccess(res, { data: programs });
}

module.exports = { list };
