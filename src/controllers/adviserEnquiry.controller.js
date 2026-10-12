const adviserEnquiryService = require("../services/adviserEnquiry.service");
const messageService = require("../services/adviserEnquiryMessage.service");
const { sendSuccess } = require("../responses/ApiResponse");

async function create(req, res) {
  const { sourcePage, profileConsent, preferredCallbackWindow } = req.body;
  const enquiry = await adviserEnquiryService.create(req.user, { sourcePage, profileConsent, preferredCallbackWindow });
  sendSuccess(res, { statusCode: 201, message: "Enquiry submitted", data: enquiry });
}

async function listMine(req, res) {
  const enquiries = await adviserEnquiryService.listMine(req.user);
  sendSuccess(res, { data: enquiries });
}

async function getMine(req, res) {
  const enquiry = await adviserEnquiryService.getMine(req.params.id, req.user);
  sendSuccess(res, { data: enquiry });
}

async function listMessages(req, res) {
  const messages = await messageService.listForStudent(req.params.id, req.user);
  sendSuccess(res, { data: messages });
}

async function sendMessage(req, res) {
  const message = await messageService.sendFromStudent(req.params.id, req.user, req.body.content);
  sendSuccess(res, { statusCode: 201, data: message });
}

module.exports = { create, listMine, getMine, listMessages, sendMessage };
