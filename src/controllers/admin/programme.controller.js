const programmeService = require("../../services/programme.service");
const { sendSuccess } = require("../../responses/ApiResponse");

async function create(req, res) {
  const programme = await programmeService.create(req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, message: "Programme created", data: programme });
}

async function update(req, res) {
  const programme = await programmeService.update(req.params.id, req.body, req.user, req);
  sendSuccess(res, { message: "Programme updated", data: programme });
}

module.exports = { create, update };
