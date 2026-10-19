const contactSubmissionService = require("../services/contactSubmission.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function submit(req, res) {
  const { name, email, phone, message } = req.body;
  await contactSubmissionService.submit({ name, email, phone, message });
  sendSuccess(res, { statusCode: 201, message: "Thanks — we'll be in touch soon." });
}

module.exports = { submit };
