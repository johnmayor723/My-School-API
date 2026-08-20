const compareService = require("../services/compare.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function compare(req, res) {
  const result = await compareService.compare(req.body.assessmentId, req.body.institutionIds, req.user);
  sendSuccess(res, { data: result });
}

module.exports = { compare };
