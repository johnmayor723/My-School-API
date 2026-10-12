const { AdviserEnquiry, AdviserEnquiryMessage } = require("../models");
const { ADVISER_ENQUIRY_MESSAGE_AUTHOR, ADVISER_ENQUIRY_STATUS } = require("../config/constants");
const { NotFoundError, BusinessRuleError } = require("../errors/AppError");

const CLOSED_STATUSES = new Set([ADVISER_ENQUIRY_STATUS.CLIENT, ADVISER_ENQUIRY_STATUS.CLOSED]);

async function listForStudent(enquiryId, student) {
  const enquiry = await AdviserEnquiry.findOne({ _id: enquiryId, student: student._id });
  if (!enquiry) throw new NotFoundError("Enquiry not found");
  return AdviserEnquiryMessage.find({ enquiry: enquiry._id }).sort({ createdAt: 1 });
}

async function sendFromStudent(enquiryId, student, content) {
  const enquiry = await AdviserEnquiry.findOne({ _id: enquiryId, student: student._id });
  if (!enquiry) throw new NotFoundError("Enquiry not found");
  if (CLOSED_STATUSES.has(enquiry.status)) throw new BusinessRuleError("This enquiry is closed to new messages");

  return AdviserEnquiryMessage.create({
    enquiry: enquiry._id,
    author: ADVISER_ENQUIRY_MESSAGE_AUTHOR.STUDENT,
    authorUser: student._id,
    content,
  });
}

// No ownership check here -- any staff with VIEW_ADVISER_ENQUIRIES can read
// any thread (not just their own assigned enquiries), same as the rest of
// the admin console's staff-wide visibility convention.
async function listForStaff(enquiryId) {
  const enquiry = await AdviserEnquiry.findById(enquiryId);
  if (!enquiry) throw new NotFoundError("Enquiry not found");
  return AdviserEnquiryMessage.find({ enquiry: enquiry._id }).sort({ createdAt: 1 });
}

async function sendFromStaff(enquiryId, staffUser, content) {
  const enquiry = await AdviserEnquiry.findById(enquiryId);
  if (!enquiry) throw new NotFoundError("Enquiry not found");

  return AdviserEnquiryMessage.create({
    enquiry: enquiry._id,
    author: ADVISER_ENQUIRY_MESSAGE_AUTHOR.STAFF,
    authorUser: staffUser._id,
    content,
  });
}

module.exports = { listForStudent, sendFromStudent, listForStaff, sendFromStaff };
