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
  VIEW_ASSESSMENTS: "VIEW_ASSESSMENTS",
  VIEW_PAYMENTS: "VIEW_PAYMENTS",
  VIEW_REPORTS: "VIEW_REPORTS",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_ROLES: "MANAGE_ROLES",
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
  ASSESSMENT: "Assessment",
  PAYMENT: "Payment",
  USER: "User",
  ROLE: "Role",
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
  MATCH_SCORE_WEIGHTS,
  MATCH_SCORE_THRESHOLDS,
  MATCH_SCORE_DISCLAIMER,
  OLEVEL_GRADE_SCALE,
  OLEVEL_EXAM_TYPES,
  RESOURCE_TYPES,
};
