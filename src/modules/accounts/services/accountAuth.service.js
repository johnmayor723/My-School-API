const { User, StudentProfile } = require("../../../models");
const otpService = require("./otp.service");
const registrationSession = require("./registrationSession.service");
const tokenService = require("../../../services/token.service");
const authService = require("../../../services/auth.service");
const auditService = require("../../../services/audit.service");
const { USER_TYPES, USER_STATUS, OTP_CHANNEL, OTP_PURPOSE, RESOURCE_TYPES } = require("../../../config/constants");
const { ForbiddenError, BusinessRuleError } = require("../../../errors/AppError");

function normalize(identifier) {
  return String(identifier).trim().toLowerCase();
}

async function findUserByIdentifier(identifier, channel) {
  const normalized = normalize(identifier);
  return channel === OTP_CHANNEL.EMAIL ? User.findOne({ email: normalized }) : User.findOne({ phone: normalized });
}

// One request/verify pair covers both sign-up and login — verify-time
// branches on whether the identifier already maps to a User, so rate-limit
// and cooldown logic isn't duplicated across two purposes.
async function requestCode({ identifier, channel }) {
  await otpService.generateAndSendCode({ identifier, channel, purpose: OTP_PURPOSE.AUTHENTICATE });
}

async function verifyCodeAndRoute({ identifier, channel, code }, { ip } = {}) {
  await otpService.verifyCode({ identifier, purpose: OTP_PURPOSE.AUTHENTICATE, code });

  const user = await findUserByIdentifier(identifier, channel).then((u) => (u ? u.populate("roles") : null));

  if (!user) {
    const registrationToken = registrationSession.issue({ identifier: normalize(identifier), channel });
    return { isNewAccount: true, registrationToken };
  }

  if (user.userType === USER_TYPES.STAFF) {
    throw new ForbiddenError("Staff accounts sign in with a password, not a one-time code");
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ForbiddenError("Account is not active");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await tokenService.issueTokenPair(user, { ip });
  return { isNewAccount: false, user: user.toSafeJSON(), ...tokens };
}

async function completeSignup({ registrationToken, firstName, lastName, dateOfBirth, profile }, { ip } = {}) {
  const { identifier, channel } = registrationSession.verify(registrationToken);

  const user = await User.create({
    firstName,
    lastName,
    // Verified by completing the OTP flow to get here.
    ...(channel === OTP_CHANNEL.EMAIL
      ? { email: identifier, emailVerified: true }
      : { phone: identifier, phoneVerified: true }),
    userType: USER_TYPES.STUDENT,
    status: USER_STATUS.ACTIVE,
    dateOfBirth,
  });

  await StudentProfile.create({
    user: user._id,
    fullName: profile?.fullName || `${firstName} ${lastName}`,
    utmeRegNumber: profile?.utmeRegNumber,
    utmeScore: profile?.utmeScore,
    utmeSubjects: profile?.utmeSubjects,
    oLevelSubjects: profile?.oLevelSubjects,
    oLevelSittings: profile?.oLevelSittings,
    interests: profile?.interests,
    desiredCareer: profile?.desiredCareer,
    preferredCountry: profile?.preferredCountry,
    stateOfOrigin: profile?.stateOfOrigin,
    residentialState: profile?.residentialState,
    preferredProgramme: profile?.preferredProgramme,
    preferredStates: profile?.preferredStates,
    preferredInstitutionTypes: profile?.preferredInstitutionTypes,
    preferredOwnership: profile?.preferredOwnership,
  });

  await auditService.record({ user: user._id, action: "USER_REGISTERED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id });

  const tokens = await tokenService.issueTokenPair(user, { ip });
  return { user: user.toSafeJSON(), ...tokens };
}

// Lets an account that signed up by phone (or any account without one yet)
// attach a verified email later — email stays important for account
// recovery/communication even though it's no longer required at sign-up.
async function requestAddEmail(user, email) {
  const normalized = normalize(email);
  const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
  if (taken) throw new ForbiddenError("That email is already in use");

  await otpService.generateAndSendCode({
    identifier: normalized,
    channel: OTP_CHANNEL.EMAIL,
    purpose: OTP_PURPOSE.ADD_EMAIL,
    userId: user._id,
  });
}

async function confirmAddEmail(user, { email, code }) {
  const normalized = normalize(email);
  await otpService.verifyCode({ identifier: normalized, purpose: OTP_PURPOSE.ADD_EMAIL, code });

  const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
  if (taken) throw new ForbiddenError("That email is already in use");

  user.email = normalized;
  user.emailVerified = true;
  await user.save();
  await auditService.record({ user: user._id, action: "EMAIL_ADDED", resourceType: RESOURCE_TYPES.USER, resourceId: user._id });
  return user.toSafeJSON();
}

async function requestAccountDeletion(user) {
  const channel = user.email ? OTP_CHANNEL.EMAIL : OTP_CHANNEL.PHONE;
  await otpService.generateAndSendCode({
    identifier: user.email || user.phone,
    channel,
    purpose: OTP_PURPOSE.ACCOUNT_DELETION,
    userId: user._id,
  });
}

async function confirmAccountDeletion(user, code, { req } = {}) {
  await otpService.verifyCode({ identifier: user.email || user.phone, purpose: OTP_PURPOSE.ACCOUNT_DELETION, code });
  await authService.deleteAccount(user._id, { req });
}

async function exportMyData(user) {
  const studentProfile = await StudentProfile.findOne({ user: user._id });

  return {
    account: user.toSafeJSON(),
    studentProfile: studentProfile || null,
  };
}

module.exports = {
  requestCode,
  verifyCodeAndRoute,
  completeSignup,
  requestAddEmail,
  confirmAddEmail,
  requestAccountDeletion,
  confirmAccountDeletion,
  exportMyData,
};
