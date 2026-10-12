const adviserEnquiryService = require("../../services/adviserEnquiry.service");
const messageService = require("../../services/adviserEnquiryMessage.service");
const { sendSuccess, paginationMeta } = require("../../responses/ApiResponse");

async function list(req, res) {
  const { page = 1, limit = 20, status, assignedAdviser } = req.query;
  const { items, total } = await adviserEnquiryService.listAll({ page, limit, status, assignedAdviser });
  sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
}

async function getById(req, res) {
  const enquiry = await adviserEnquiryService.getById(req.params.id);
  sendSuccess(res, { data: enquiry });
}

async function update(req, res) {
  const { status, notes, assignedAdviser } = req.body;
  const enquiry = await adviserEnquiryService.updateStatus(req.params.id, req.user, { status, notes, assignedAdviser }, req);
  sendSuccess(res, { message: "Enquiry updated", data: enquiry });
}

async function listMessages(req, res) {
  const messages = await messageService.listForStaff(req.params.id);
  sendSuccess(res, { data: messages });
}

async function sendMessage(req, res) {
  const message = await messageService.sendFromStaff(req.params.id, req.user, req.body.content);
  sendSuccess(res, { statusCode: 201, data: message });
}

module.exports = { list, getById, update, listMessages, sendMessage };
