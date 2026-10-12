const { AdviserEnquiry, Role, User } = require("../models");
const { ROLE_NAMES, USER_TYPES, USER_STATUS, ADVISER_ENQUIRY_STATUS, NOTIFICATION_TYPES, RESOURCE_TYPES } = require("../config/constants");
const { NotFoundError, ValidationAppError } = require("../errors/AppError");
const { sendMail } = require("../utils/mailer");
const { sendWhatsApp } = require("../utils/whatsappSender");
const { notifyStudent } = require("./reminders/notifyStudent");
const auditService = require("./audit.service");
const logger = require("../config/logger");

// Simple counter-based rotation (per decision #1 in the plan doc), not a
// pointer document -- "next adviser" is just "how many enquiries exist so
// far, mod how many advisers exist now". Stateless and good enough at this
// volume; the tradeoff is that adding/removing an adviser reshuffles whose
// turn is next, which was accepted as fine (not a load-balancing system).
async function pickNextAdviser() {
  const adviserRole = await Role.findOne({ name: ROLE_NAMES.ADVISER });
  if (!adviserRole) return null;

  const advisers = await User.find({ userType: USER_TYPES.STAFF, roles: adviserRole._id, status: USER_STATUS.ACTIVE }).sort({ _id: 1 });
  if (!advisers.length) return null;

  const count = await AdviserEnquiry.countDocuments();
  return advisers[count % advisers.length];
}

// "Within 5 minutes" (memo §6.3) means synchronous on creation, not batched
// -- there's no live-push infra to alert a staff dashboard instead (see plan
// doc). Always both channels, no staff-side opt-out -- this is a job
// responsibility alert, not a student reminder preference.
async function alertAdviser(adviser, enquiry, student) {
  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const subject = `New adviser enquiry: ${studentName}`;
  const text = `Hi ${adviser.firstName},\n\nYou've been assigned a new adviser enquiry from ${studentName} (${
    student.email || student.phone
  }).\n\nSource: ${enquiry.sourcePage}\nPreferred callback window: ${
    enquiry.preferredCallbackWindow || "not specified"
  }\n\nReview and respond in the admin console.`;
  const html = `<p>Hi ${adviser.firstName},</p><p>You've been assigned a new adviser enquiry from <strong>${studentName}</strong> (${
    student.email || student.phone
  }).</p><p>Source: ${enquiry.sourcePage}<br/>Preferred callback window: ${
    enquiry.preferredCallbackWindow || "not specified"
  }</p><p>Review and respond in the admin console.</p>`;

  try {
    await sendMail({ to: adviser.email, subject, text, html });
  } catch (err) {
    logger.error("Adviser enquiry email alert failed", { enquiry: String(enquiry._id), adviser: String(adviser._id), error: err.message });
  }

  if (adviser.phone) {
    try {
      await sendWhatsApp(adviser.phone, "adviser_enquiry_alert", [adviser.firstName, studentName, enquiry.sourcePage]);
    } catch (err) {
      logger.error("Adviser enquiry WhatsApp alert failed", { enquiry: String(enquiry._id), adviser: String(adviser._id), error: err.message });
    }
  }
}

async function create(student, { sourcePage, profileConsent, preferredCallbackWindow }) {
  if (!profileConsent) throw new ValidationAppError("Profile consent is required to submit an enquiry");

  const assignedAdviser = await pickNextAdviser();

  const enquiry = await AdviserEnquiry.create({
    student: student._id,
    sourcePage,
    profileConsent,
    preferredCallbackWindow,
    assignedAdviser: assignedAdviser ? assignedAdviser._id : null,
    status: ADVISER_ENQUIRY_STATUS.NEW,
  });

  if (assignedAdviser) {
    await alertAdviser(assignedAdviser, enquiry, student);
  } else {
    logger.warn("Adviser enquiry created with no ADVISER-role staff available to assign", { enquiry: String(enquiry._id) });
  }

  return enquiry;
}

async function listMine(student) {
  return AdviserEnquiry.find({ student: student._id }).sort({ createdAt: -1 });
}

async function getMine(enquiryId, student) {
  const enquiry = await AdviserEnquiry.findOne({ _id: enquiryId, student: student._id });
  if (!enquiry) throw new NotFoundError("Enquiry not found");
  return enquiry;
}

async function listAll({ status, assignedAdviser, page, limit }) {
  const filter = {};
  if (status) filter.status = status;
  if (assignedAdviser) filter.assignedAdviser = assignedAdviser;

  const offset = page && limit ? (page - 1) * limit : 0;
  const query = AdviserEnquiry.find(filter).populate("student", "firstName lastName email phone").populate("assignedAdviser", "firstName lastName email").sort({ createdAt: -1 });
  if (limit) query.skip(offset).limit(limit);

  const [items, total] = await Promise.all([query, AdviserEnquiry.countDocuments(filter)]);
  return { items, total };
}

async function getById(enquiryId) {
  const enquiry = await AdviserEnquiry.findById(enquiryId)
    .populate("student", "firstName lastName email phone")
    .populate("assignedAdviser", "firstName lastName email");
  if (!enquiry) throw new NotFoundError("Enquiry not found");
  return enquiry;
}

const STATUS_NOTIFY = new Set([ADVISER_ENQUIRY_STATUS.CONTACTED, ADVISER_ENQUIRY_STATUS.CLIENT, ADVISER_ENQUIRY_STATUS.CLOSED]);

// Per decision #4: student is notified on both NEW -> CONTACTED and
// -> CLIENT/CLOSED, but not on any other field-only edit (notes, reassign).
async function notifyStudentOfStatusChange(enquiry) {
  const student = await User.findById(enquiry.student);
  if (!student) return;

  const copy = {
    [ADVISER_ENQUIRY_STATUS.CONTACTED]: {
      subject: "A MACL adviser has picked up your enquiry",
      body: "An adviser has taken your enquiry and will be reaching out during your preferred callback window.",
    },
    [ADVISER_ENQUIRY_STATUS.CLIENT]: {
      subject: "Your MACL adviser enquiry has been resolved",
      body: "Your adviser enquiry is now marked resolved. Reach out again any time if you need further help.",
    },
    [ADVISER_ENQUIRY_STATUS.CLOSED]: {
      subject: "Your MACL adviser enquiry has been closed",
      body: "Your adviser enquiry has been closed. Reach out again any time if you need further help.",
    },
  }[enquiry.status];
  if (!copy) return;

  await notifyStudent(student, {
    type: NOTIFICATION_TYPES.ADVISER_ENQUIRY_STUDENT_UPDATE,
    dedupeKey: `adviser_enquiry:${enquiry._id}:${enquiry.status}`,
    email: {
      subject: copy.subject,
      text: `Hi ${student.firstName},\n\n${copy.body}`,
      html: `<p>Hi ${student.firstName},</p><p>${copy.body}</p>`,
    },
    whatsapp: { templateName: "adviser_enquiry_status_update", params: [student.firstName, enquiry.status] },
  });
}

async function updateStatus(enquiryId, staffUser, { status, notes, assignedAdviser }, req) {
  const enquiry = await AdviserEnquiry.findById(enquiryId);
  if (!enquiry) throw new NotFoundError("Enquiry not found");

  const previousValue = { status: enquiry.status, notes: enquiry.notes, assignedAdviser: enquiry.assignedAdviser };
  const statusChanged = status !== undefined && status !== enquiry.status;

  if (status !== undefined) enquiry.status = status;
  if (notes !== undefined) enquiry.notes = notes;
  if (assignedAdviser !== undefined) enquiry.assignedAdviser = assignedAdviser || null;
  await enquiry.save();

  await auditService.record({
    user: staffUser._id,
    action: "ADVISER_ENQUIRY_UPDATED",
    resourceType: RESOURCE_TYPES.ADVISER_ENQUIRY,
    resourceId: enquiry._id,
    previousValue,
    newValue: { status: enquiry.status, notes: enquiry.notes, assignedAdviser: enquiry.assignedAdviser },
    req,
  });

  if (statusChanged && STATUS_NOTIFY.has(enquiry.status)) {
    await notifyStudentOfStatusChange(enquiry);
  }

  return enquiry;
}

module.exports = { pickNextAdviser, create, listMine, getMine, listAll, getById, updateStatus };
