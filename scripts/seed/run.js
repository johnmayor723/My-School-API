const { connectDb, disconnectDb } = require("../../src/config/db");
const { Role, User, AdmissionSession } = require("../../src/models");
const logger = require("../../src/config/logger");
const env = require("../../src/config/env");
const { PERMISSIONS, ROLE_NAMES, USER_TYPES, ADMISSION_SESSION_STATUS } = require("../../src/config/constants");

const SYSTEM_ROLES = [
  { name: ROLE_NAMES.SUPER_ADMIN, description: "Full platform access", permissions: [PERMISSIONS.ALL], isSystem: true },
  {
    name: ROLE_NAMES.RULES_EDITOR,
    description: "Drafts and edits admission rules",
    permissions: [PERMISSIONS.MANAGE_ADMISSION_RULES, PERMISSIONS.MANAGE_INSTITUTIONS, PERMISSIONS.MANAGE_PROGRAMMES],
    isSystem: true,
  },
  { name: ROLE_NAMES.RULES_REVIEWER, description: "Reviews draft admission rules", permissions: [PERMISSIONS.REVIEW_ADMISSION_RULES], isSystem: true },
  { name: ROLE_NAMES.RULES_APPROVER, description: "Approves reviewed admission rules", permissions: [PERMISSIONS.APPROVE_ADMISSION_RULES], isSystem: true },
  { name: ROLE_NAMES.RULES_PUBLISHER, description: "Publishes approved admission rules", permissions: [PERMISSIONS.PUBLISH_ADMISSION_RULES, PERMISSIONS.ARCHIVE_ADMISSION_RULES], isSystem: true },
  {
    name: ROLE_NAMES.CATALOG_MANAGER,
    description: "Manages institutions, programmes and admission sessions",
    permissions: [PERMISSIONS.MANAGE_INSTITUTIONS, PERMISSIONS.MANAGE_PROGRAMMES, PERMISSIONS.MANAGE_ADMISSION_SESSIONS],
    isSystem: true,
  },
  {
    name: ROLE_NAMES.FINANCE,
    description: "Views payments and assessments",
    permissions: [PERMISSIONS.VIEW_PAYMENTS, PERMISSIONS.VIEW_ASSESSMENTS, PERMISSIONS.VIEW_REPORTS],
    isSystem: true,
  },
  {
    name: ROLE_NAMES.SUPPORT,
    description: "Views students, assessments and audit logs to assist users",
    permissions: [PERMISSIONS.VIEW_STUDENTS, PERMISSIONS.VIEW_ASSESSMENTS, PERMISSIONS.VIEW_AUDIT_LOGS],
    isSystem: true,
  },
];

async function upsertRoles() {
  const roles = {};
  for (const definition of SYSTEM_ROLES) {
    const role = await Role.findOneAndUpdate(
      { name: definition.name },
      { $set: definition },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roles[definition.name] = role;
    logger.info(`Role ready: ${role.name}`);
  }
  return roles;
}

async function upsertAdminUser(superAdminRole) {
  if (!env.seed.adminPassword) {
    logger.warn("SEED_ADMIN_PASSWORD not set — skipping admin user seed");
    return;
  }
  const existing = await User.findOne({ email: env.seed.adminEmail });
  if (existing) {
    logger.info(`Admin user already exists: ${env.seed.adminEmail}`);
    return;
  }
  await User.create({
    firstName: "Platform",
    lastName: "Administrator",
    email: env.seed.adminEmail,
    passwordHash: env.seed.adminPassword,
    userType: USER_TYPES.STAFF,
    roles: [superAdminRole._id],
  });
  logger.info(`Admin user created: ${env.seed.adminEmail}`);
}

async function upsertDemoSession() {
  const name = "2026/2027";
  const existing = await AdmissionSession.findOne({ name });
  if (existing) {
    logger.info(`Admission session already exists: ${name}`);
    return;
  }
  await AdmissionSession.create({
    name,
    startDate: new Date("2026-08-01"),
    endDate: new Date("2027-07-31"),
    status: ADMISSION_SESSION_STATUS.ACTIVE,
    isActive: true,
  });
  logger.info(`Admission session created: ${name}`);
}

async function run() {
  await connectDb();
  const roles = await upsertRoles();
  await upsertAdminUser(roles[ROLE_NAMES.SUPER_ADMIN]);
  await upsertDemoSession();
  await disconnectDb();
  logger.info("Seed complete");
}

run().catch((err) => {
  logger.error("Seed failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
