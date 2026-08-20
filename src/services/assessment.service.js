const { Assessment, AssessmentRecommendation, StudentProfile, AdmissionSession } = require("../models");
const { runMatching } = require("../modules/matching-engine/matchingEngine");
const auditService = require("./audit.service");
const env = require("../config/env");
const { NotFoundError, ForbiddenError, PaymentRequiredError, BusinessRuleError } = require("../errors/AppError");
const { RESOURCE_TYPES, ASSESSMENT_STATUS, PAYMENT_STATUS_ON_ASSESSMENT } = require("../config/constants");

async function resolveAdmissionSession(admissionSessionId) {
  if (admissionSessionId) return admissionSessionId;
  const active = await AdmissionSession.findOne({ isActive: true }).sort({ createdAt: -1 });
  if (active) return active._id;
  const mostRecent = await AdmissionSession.findOne().sort({ createdAt: -1 });
  if (mostRecent) return mostRecent._id;
  throw new BusinessRuleError("No admission session is configured yet — an admin must create one before assessments can be run.");
}

function buildAcademicSnapshot(profile, override = {}) {
  return {
    fullName: override.fullName ?? profile.fullName,
    utmeRegNumber: override.utmeRegNumber ?? profile.utmeRegNumber,
    utmeScore: override.utmeScore ?? profile.utmeScore,
    utmeSubjects: override.utmeSubjects ?? profile.utmeSubjects ?? [],
    oLevelSubjects: override.oLevelSubjects ?? profile.oLevelSubjects ?? [],
    oLevelSittings: override.oLevelSittings ?? profile.oLevelSittings,
  };
}

function assertOwnerOrStaff(assessment, requestingUser) {
  const isOwner = String(assessment.student) === String(requestingUser._id);
  if (!isOwner && requestingUser.userType !== "staff") {
    throw new ForbiddenError("You do not have access to this assessment");
  }
}

async function createAssessment(studentUserId, { preferredProgramme, admissionSession, preferences, academicOverride }, req) {
  const profile = await StudentProfile.findOne({ user: studentUserId });
  if (!profile) throw new NotFoundError("Student profile not found");

  const academicSnapshot = buildAcademicSnapshot(profile, academicOverride);
  const resolvedAdmissionSession = await resolveAdmissionSession(admissionSession);

  const assessment = await Assessment.create({
    student: studentUserId,
    academicSnapshot,
    preferredProgramme,
    admissionSession: resolvedAdmissionSession,
    preferences: preferences || {},
    price: env.assessmentPriceNgn,
    currency: env.assessmentCurrency,
  });

  await auditService.record({
    user: studentUserId,
    action: "ASSESSMENT_CREATED",
    resourceType: RESOURCE_TYPES.ASSESSMENT,
    resourceId: assessment._id,
    req,
  });

  await runAndStoreMatching(assessment);
  return Assessment.findById(assessment._id);
}

async function runAndStoreMatching(assessment) {
  try {
    const result = await runMatching({
      academicSnapshot: assessment.academicSnapshot,
      preferredProgrammeId: assessment.preferredProgramme,
      admissionSessionId: assessment.admissionSession,
      preferences: assessment.preferences,
    });

    const docs = [...result.recommendations, ...result.alternativeRecommendations].map((rec) => ({
      assessment: assessment._id,
      institution: rec.institution,
      programme: rec.programme,
      admissionRule: rec.admissionRule,
      matchScore: rec.matchScore,
      category: rec.category,
      eligibility: rec.eligibility,
      reasons: rec.reasons,
      failedRequirements: rec.failedRequirements,
      warnings: rec.warnings,
      isAlternativeProgramme: rec.isAlternativeProgramme,
      rank: rec.rank,
    }));
    if (docs.length > 0) await AssessmentRecommendation.insertMany(docs);

    assessment.previewSummary = {
      totalPotentialMatches: result.totalPotentialMatches,
      strongMatches: result.strongMatches,
      possibleMatches: result.possibleMatches,
      borderlineMatches: result.borderlineMatches,
      institutionsAwaitingData: result.institutionsAwaitingData,
      alternativeOptionsAvailable: result.alternativeOptionsAvailable,
    };
    assessment.status = ASSESSMENT_STATUS.PROCESSED;
    await assessment.save();
  } catch (err) {
    assessment.status = ASSESSMENT_STATUS.FAILED;
    assessment.processingError = err.message;
    await assessment.save();
  }
}

async function getAssessment(id, requestingUser) {
  const assessment = await Assessment.findById(id)
    .populate("preferredProgramme", "name slug")
    .populate("admissionSession", "name status isActive");
  if (!assessment) throw new NotFoundError("Assessment not found");
  assertOwnerOrStaff(assessment, requestingUser);
  return assessment;
}

function isUnlocked(assessment) {
  return assessment.paymentStatus === PAYMENT_STATUS_ON_ASSESSMENT.PAID;
}

async function getRecommendations(id, requestingUser) {
  const assessment = await getAssessment(id, requestingUser);
  if (!isUnlocked(assessment)) {
    throw new PaymentRequiredError("Payment is required to view the full recommendations for this assessment", {
      price: assessment.price,
      currency: assessment.currency,
    });
  }
  const recommendations = await AssessmentRecommendation.find({ assessment: id })
    .populate("institution", "name slug state ownership institutionType")
    .populate("programme", "name slug faculty")
    .sort({ isAlternativeProgramme: 1, rank: 1 });
  return { assessment, recommendations };
}

async function listMine(studentUserId, { page = 1, limit = 20, status, paymentStatus }) {
  const filter = { student: studentUserId };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Assessment.find(filter).populate("preferredProgramme", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Assessment.countDocuments(filter),
  ]);
  return { items, total };
}

async function listAll({ page = 1, limit = 20, status, paymentStatus, student, from, to }) {
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (student) filter.student = student;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Assessment.find(filter)
      .populate("student", "firstName lastName email")
      .populate("preferredProgramme", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Assessment.countDocuments(filter),
  ]);
  return { items, total };
}

async function unlockAfterPayment(assessmentId) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw new NotFoundError("Assessment not found");
  assessment.paymentStatus = PAYMENT_STATUS_ON_ASSESSMENT.PAID;
  assessment.unlockedAt = new Date();
  await assessment.save();
  return assessment;
}

module.exports = {
  createAssessment,
  getAssessment,
  getRecommendations,
  listMine,
  listAll,
  unlockAfterPayment,
  isUnlocked,
  assertOwnerOrStaff,
};
