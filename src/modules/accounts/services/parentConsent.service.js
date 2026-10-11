const { User, ParentConsent } = require("../../../models");
const otpService = require("./otp.service");
const auditService = require("../../../services/audit.service");
const { OTP_CHANNEL, OTP_PURPOSE, USER_STATUS, PARENT_CONSENT_STATUS, RESOURCE_TYPES } = require("../../../config/constants");
const { BusinessRuleError, NotFoundError } = require("../../../errors/AppError");

function normalize(identifier) {
  return String(identifier).trim().toLowerCase();
}

// Called from accountAuth.service#completeSignup once a new student is
// found to be under MINIMUM_CONSENT_AGE. The student account already exists
// (status INACTIVE) by the time this runs.
async function initiate(student, { parentName, parentEmail, parentPhone }) {
  const channel = parentEmail ? OTP_CHANNEL.EMAIL : OTP_CHANNEL.PHONE;
  const identifier = normalize(parentEmail || parentPhone);

  const consent = await ParentConsent.create({
    student: student._id,
    parentName,
    parentEmail: parentEmail ? identifier : undefined,
    parentPhone: parentPhone ? identifier : undefined,
    channel,
  });

  await otpService.generateAndSendCode({ identifier, channel, purpose: OTP_PURPOSE.PARENT_CONSENT, userId: student._id });
  return consent;
}

async function getStatus(student) {
  return ParentConsent.findOne({ student: student._id });
}

async function resend(student) {
  const consent = await ParentConsent.findOne({ student: student._id });
  if (!consent) throw new NotFoundError("No pending parental consent request for this account");
  if (consent.status === PARENT_CONSENT_STATUS.VERIFIED) {
    throw new BusinessRuleError("Parental consent has already been verified");
  }

  const identifier = consent.parentEmail || consent.parentPhone;
  await otpService.generateAndSendCode({ identifier, channel: consent.channel, purpose: OTP_PURPOSE.PARENT_CONSENT, userId: student._id });
}

// Called by the PARENT, who has no student session — identifier is the
// parent's own email/phone, not the student's. otpService.verifyCode's
// returned record carries `.user` (the student id set at initiate() time),
// which is what ties this back to the right ParentConsent even if the same
// parent contact is ever reused across more than one sibling.
async function verify({ identifier, code }) {
  const normalized = normalize(identifier);
  const record = await otpService.verifyCode({ identifier: normalized, purpose: OTP_PURPOSE.PARENT_CONSENT, code });

  const consent = await ParentConsent.findOne({ student: record.user, status: PARENT_CONSENT_STATUS.PENDING });
  if (!consent) throw new BusinessRuleError("No pending parental consent request matches this code");

  consent.status = PARENT_CONSENT_STATUS.VERIFIED;
  consent.verifiedAt = new Date();
  await consent.save();

  const student = await User.findById(consent.student);
  student.status = USER_STATUS.ACTIVE;
  await student.save();

  await auditService.record({
    user: student._id,
    action: "PARENTAL_CONSENT_VERIFIED",
    resourceType: RESOURCE_TYPES.PARENT_CONSENT,
    resourceId: consent._id,
  });

  return { consent, studentActivated: true };
}

module.exports = { initiate, getStatus, resend, verify };
