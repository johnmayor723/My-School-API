/**
 * Centralised enums, permission names and matching-engine configuration.
 * Nothing about *which* universities/programmes/requirements exist lives here —
 * that is all data, owned by the Admission Rules Management System. This file
 * only defines the fixed vocabulary the platform's code is built around.
 */

const USER_TYPES = Object.freeze({
  STUDENT: "student",
  STAFF: "staff",
});

const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  DELETED: "deleted",
});

const PERMISSIONS = Object.freeze({
  ALL: "*",
  MANAGE_INSTITUTIONS: "MANAGE_INSTITUTIONS",
  MANAGE_PROGRAMMES: "MANAGE_PROGRAMMES",
  MANAGE_ADMISSION_SESSIONS: "MANAGE_ADMISSION_SESSIONS",
  MANAGE_ADMISSION_RULES: "MANAGE_ADMISSION_RULES",
  REVIEW_ADMISSION_RULES: "REVIEW_ADMISSION_RULES",
  APPROVE_ADMISSION_RULES: "APPROVE_ADMISSION_RULES",
  PUBLISH_ADMISSION_RULES: "PUBLISH_ADMISSION_RULES",
  ARCHIVE_ADMISSION_RULES: "ARCHIVE_ADMISSION_RULES",
  VIEW_STUDENTS: "VIEW_STUDENTS",
  MANAGE_STUDENTS: "MANAGE_STUDENTS",
  VIEW_ASSESSMENTS: "VIEW_ASSESSMENTS",
  VIEW_PAYMENTS: "VIEW_PAYMENTS",
  VIEW_REPORTS: "VIEW_REPORTS",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_ROLES: "MANAGE_ROLES",
  MANAGE_CUTOFF_SOURCES: "MANAGE_CUTOFF_SOURCES",
  REVIEW_CUTOFF_CANDIDATES: "REVIEW_CUTOFF_CANDIDATES",
  MANAGE_CUTOFF_RECORDS: "MANAGE_CUTOFF_RECORDS",
});

const ROLE_NAMES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  RULES_EDITOR: "RULES_EDITOR",
  RULES_REVIEWER: "RULES_REVIEWER",
  RULES_APPROVER: "RULES_APPROVER",
  RULES_PUBLISHER: "RULES_PUBLISHER",
  CATALOG_MANAGER: "CATALOG_MANAGER",
  FINANCE: "FINANCE",
  SUPPORT: "SUPPORT",
});

const INSTITUTION_OWNERSHIP = Object.freeze({
  FEDERAL: "federal",
  STATE: "state",
  PRIVATE: "private",
});

const INSTITUTION_TYPE = Object.freeze({
  UNIVERSITY: "university",
  POLYTECHNIC: "polytechnic",
  COLLEGE_OF_EDUCATION: "college_of_education",
});

const RECORD_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

const DEGREE_TYPE = Object.freeze({
  BACHELOR: "bachelor",
  HND: "hnd",
  ND: "nd",
  NCE: "nce",
});

const ADMISSION_SESSION_STATUS = Object.freeze({
  UPCOMING: "upcoming",
  ACTIVE: "active",
  CLOSED: "closed",
});

const RULE_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  REVIEW: "REVIEW",
  APPROVED: "APPROVED",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
});

const RULE_SOURCE_TYPE = Object.freeze({
  OFFICIAL_BROCHURE: "official_brochure",
  UNIVERSITY_WEBSITE: "university_website",
  JAMB_BROCHURE: "jamb_brochure",
  PRESS_RELEASE: "press_release",
  OTHER: "other",
});

const ASSESSMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
});

const PAYMENT_STATUS_ON_ASSESSMENT = Object.freeze({
  UNPAID: "UNPAID",
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
});

const PAYMENT_PROVIDERS = Object.freeze({
  MOCK: "mock",
  PAYSTACK: "paystack",
  FLUTTERWAVE: "flutterwave",
});

const MATCH_CATEGORY = Object.freeze({
  STRONG_MATCH: "STRONG_MATCH",
  POSSIBLE_MATCH: "POSSIBLE_MATCH",
  BORDERLINE: "BORDERLINE",
  NOT_CURRENTLY_SUITABLE: "NOT_CURRENTLY_SUITABLE",
});

const ELIGIBILITY_STATUS = Object.freeze({
  LIKELY_ELIGIBLE_BASED_ON_RECORDED_RULES: "LIKELY_ELIGIBLE_BASED_ON_RECORDED_RULES",
  POSSIBLY_ELIGIBLE: "POSSIBLY_ELIGIBLE",
  NOT_CURRENTLY_ELIGIBLE: "NOT_CURRENTLY_ELIGIBLE",
  INSUFFICIENT_INFORMATION: "INSUFFICIENT_INFORMATION",
});

// Informational classification only — never folded into matchScore (see
// catchment.evaluator.js). ELDS isn't included yet: it's a specific JAMB-designated
// state list, not derivable from geopolitical zone, and isn't verified in this codebase yet.
const CATCHMENT_STATUS = Object.freeze({
  MERIT: "MERIT",
  CATCHMENT: "CATCHMENT",
  UNKNOWN: "UNKNOWN",
});

// Weights must sum to 100. Centralised here so scoring can be tuned in one
// place without touching the evaluators that produce the underlying facts.
const MATCH_SCORE_WEIGHTS = Object.freeze({
  utmeScore: 35,
  utmeSubjects: 15,
  olevel: 25,
  preferences: 15,
  competitiveness: 10,
});

const MATCH_SCORE_THRESHOLDS = Object.freeze({
  STRONG_MATCH: 85,
  POSSIBLE_MATCH: 65,
  BORDERLINE: 45,
});

// How a course's own competitiveness (Medicine, Law, Petroleum Engineering, ...)
// blends with its offering institution's competitiveness. Course dominates —
// a Tier 1 course at a Tier 2 institution should still outrank a Tier 3 course
// at a Tier 1 institution. Shared by scripts/rules/generate-admission-rules.js
// (UTME cutoff generation) and the matching engine's scoring.js so the two
// never drift out of sync with each other.
const COMPETITIVENESS_BLEND_WEIGHTS = Object.freeze({
  course: 0.6,
  institution: 0.4,
});

// The discrete institution-tier buckets used by scripts/tiers/apply-competitiveness-tiers.js.
// An institution's metadata.competitivenessIndex can be any 0..1 float (e.g. a manual
// admin override), so lookups against these tiers snap to the nearest bucket rather than
// requiring an exact match. Shared by the CourseTierCutoff matrix (per-course cutoff by
// institution tier) and its admin UI.
const INSTITUTION_TIERS = Object.freeze([
  { index: 0.9, label: "Tier 1 Federal" },
  { index: 0.75, label: "Tier 2 Federal" },
  { index: 0.65, label: "Elite Private" },
  { index: 0.55, label: "Standard" },
  { index: 0.35, label: "State University" },
  { index: 0.2, label: "Polytechnic" },
  { index: 0.1, label: "College of Education" },
]);

const MATCH_SCORE_DISCLAIMER =
  "This is a My School Placement matching score, not an official probability of admission. " +
  "Final admission decisions remain with the relevant institution and admission authorities.";

const OLEVEL_GRADE_SCALE = Object.freeze({
  A1: 1,
  B2: 2,
  B3: 3,
  C4: 4,
  C5: 5,
  C6: 6,
  D7: 7,
  E8: 8,
  F9: 9,
});

const OLEVEL_EXAM_TYPES = Object.freeze({
  WAEC: "WAEC",
  NECO: "NECO",
  NABTEB: "NABTEB",
});

const RESOURCE_TYPES = Object.freeze({
  INSTITUTION: "Institution",
  PROGRAMME: "Programme",
  ADMISSION_SESSION: "AdmissionSession",
  ADMISSION_RULE: "AdmissionRule",
  COURSE_TIER_CUTOFF: "CourseTierCutoff",
  ASSESSMENT: "Assessment",
  PAYMENT: "Payment",
  USER: "User",
  ROLE: "Role",
  CUTOFF_SOURCE: "CutoffSource",
  CUTOFF_CANDIDATE: "CutoffCandidate",
  CUTOFF_RECORD: "CutoffRecord",
});

// The 12 admission-threshold types the Cut-Off Marks Intelligence module must
// distinguish. Every CutoffCandidate/CutoffRecord carries exactly one of
// these — never mix e.g. an institutional minimum with a departmental merit
// cutoff in the same field.
const CUTOFF_TYPE = Object.freeze({
  NATIONAL_JAMB_MINIMUM: "national_jamb_minimum",
  INSTITUTIONAL_MINIMUM: "institutional_minimum",
  FACULTY_MINIMUM: "faculty_minimum",
  DEPARTMENTAL_CUTOFF: "departmental_cutoff",
  MERIT_CUTOFF: "merit_cutoff",
  CATCHMENT_CUTOFF: "catchment_cutoff",
  ELDS_CUTOFF: "elds_cutoff",
  SUPPLEMENTARY_CUTOFF: "supplementary_cutoff",
  POST_UTME_MINIMUM: "post_utme_minimum",
  AGGREGATE_SCORE: "aggregate_score",
  HISTORICAL_CUTOFF: "historical_cutoff",
  ESTIMATED_COMPETITIVE: "estimated_competitive",
});

const CUTOFF_SOURCE_TYPE = Object.freeze({
  OFFICIAL: "official",
  SECONDARY: "secondary",
});

const CUTOFF_CANDIDATE_STATUS = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  DUPLICATE: "DUPLICATE",
});

const CUTOFF_CONFIDENCE = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
});

// Only these cutoffTypes represent "the one number the matching engine cares
// about" for a given offering, so only these are ever eligible to update
// AdmissionRule.utme.minimumScore. Every other type is stored and displayed
// as data but never silently collapsed into that single field — deliberately
// conservative, matching the matching-engine evaluators' "never invent
// certainty" idiom. Extend only when a real product need justifies picking a
// winner among the remaining ambiguous types.
const PROMOTABLE_CUTOFF_TYPES = Object.freeze([CUTOFF_TYPE.INSTITUTIONAL_MINIMUM, CUTOFF_TYPE.DEPARTMENTAL_CUTOFF]);

const CHAT_ROLE = Object.freeze({
  USER: "user",
  ASSISTANT: "assistant",
});

module.exports = {
  USER_TYPES,
  USER_STATUS,
  PERMISSIONS,
  ROLE_NAMES,
  INSTITUTION_OWNERSHIP,
  INSTITUTION_TYPE,
  RECORD_STATUS,
  DEGREE_TYPE,
  ADMISSION_SESSION_STATUS,
  RULE_STATUS,
  RULE_SOURCE_TYPE,
  ASSESSMENT_STATUS,
  PAYMENT_STATUS_ON_ASSESSMENT,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  MATCH_CATEGORY,
  ELIGIBILITY_STATUS,
  CATCHMENT_STATUS,
  MATCH_SCORE_WEIGHTS,
  MATCH_SCORE_THRESHOLDS,
  COMPETITIVENESS_BLEND_WEIGHTS,
  INSTITUTION_TIERS,
  MATCH_SCORE_DISCLAIMER,
  OLEVEL_GRADE_SCALE,
  OLEVEL_EXAM_TYPES,
  RESOURCE_TYPES,
  CUTOFF_TYPE,
  CUTOFF_SOURCE_TYPE,
  CUTOFF_CANDIDATE_STATUS,
  CUTOFF_CONFIDENCE,
  PROMOTABLE_CUTOFF_TYPES,
  CHAT_ROLE,
};
