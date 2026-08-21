/**
 * One-time (re-runnable) pass that sets Programme.subjectProfile — the O'Level
 * subjects and UTME subject combination a course generically requires — based
 * on a hand-curated category mapping, not any field JAMB's catalog provides.
 *
 * Nigerian JAMB subject combinations are set nationally per course, so a
 * category-keyword match on the programme name (falling back to its faculty)
 * is a reasonable general pattern — the same "best-effort general knowledge,
 * not verified per-institution data" caveat already applied to institution
 * competitiveness tiers in apply-competitiveness-tiers.js.
 *
 * Usage: node scripts/rules/apply-subject-profiles.js [--dry-run]
 */

const { connectDb, disconnectDb } = require("../../src/config/db");
const { Programme } = require("../../src/models");
const logger = require("../../src/config/logger");

const DRY_RUN = process.argv.includes("--dry-run");

// Ordered keyword categories, most specific/high-stakes first. Each profile's
// subjects are drawn only from the fixed 36-subject list the assessment
// wizard's O'Level step offers, so student-submitted subjects always compare
// cleanly against these.
const CATEGORIES = [
  {
    label: "Medicine & Surgery / Dentistry",
    test: /medicine|surgery|dentistry|dental/i,
    olevel: ["English Language", "Mathematics", "Biology", "Chemistry", "Physics"],
    utme: ["English Language", "Biology", "Chemistry", "Physics"],
  },
  {
    label: "Pharmacy",
    test: /pharmac/i,
    olevel: ["English Language", "Mathematics", "Biology", "Chemistry", "Physics"],
    utme: ["English Language", "Biology", "Chemistry", "Physics"],
  },
  {
    label: "Nursing & Allied Health",
    test: /nursing|physiotherapy|medical laboratory|radiography|public health|physiology|anatomy/i,
    olevel: ["English Language", "Mathematics", "Biology", "Chemistry", "Physics"],
    utme: ["English Language", "Biology", "Chemistry", "Physics"],
  },
  {
    label: "Law",
    test: /\blaw\b|jurisprudence/i,
    olevel: ["English Language", "Mathematics", "Literature in English", "Government"],
    utme: ["English Language", "Literature in English", "Government", "History"],
  },
  {
    label: "Computing",
    test: /computer|software|cyber ?security|information technology|data science|artificial intelligence/i,
    olevel: ["English Language", "Mathematics", "Physics", "Chemistry"],
    utme: ["English Language", "Mathematics", "Physics", "Chemistry"],
  },
  {
    label: "Architecture & Built Environment",
    test: /architecture|building|quantity surv|estate management|urban.*plan|surveying/i,
    olevel: ["English Language", "Mathematics", "Physics", "Chemistry"],
    utme: ["English Language", "Mathematics", "Physics", "Geography"],
  },
  {
    label: "Engineering",
    test: /engineering/i,
    olevel: ["English Language", "Mathematics", "Physics", "Chemistry"],
    utme: ["English Language", "Mathematics", "Physics", "Chemistry"],
  },
  {
    label: "Business, Accounting & Management",
    test: /accounting|banking|finance|business admin|insurance|actuarial|economics|management|marketing|procurement|entrepreneur/i,
    olevel: ["English Language", "Mathematics", "Economics"],
    utme: ["English Language", "Mathematics", "Economics", "Commerce"],
  },
  {
    label: "Mass Communication & Media",
    test: /mass comm|journalism|media studies|broadcasting|theatre|film/i,
    olevel: ["English Language", "Mathematics", "Literature in English"],
    utme: ["English Language", "Literature in English", "Government", "Christian Religious Studies"],
  },
  {
    label: "Agriculture & Environment",
    test: /agric|forestry|fisher|animal (science|production)|crop production|wildlife/i,
    olevel: ["English Language", "Mathematics", "Biology", "Chemistry"],
    utme: ["English Language", "Biology", "Chemistry", "Agricultural Science"],
  },
  {
    label: "Life Sciences",
    test: /biochemistry|microbiology|botany|zoology|genetics|biotechnology|molecular biology|plant science/i,
    olevel: ["English Language", "Mathematics", "Biology", "Chemistry"],
    utme: ["English Language", "Biology", "Chemistry", "Physics"],
  },
  {
    label: "Physical Sciences",
    test: /\bphysics\b|\bchemistry\b|\bmathematics\b|statistics|\bgeology\b|geophysics/i,
    olevel: ["English Language", "Mathematics", "Physics", "Chemistry"],
    utme: ["English Language", "Mathematics", "Physics", "Chemistry"],
  },
  {
    label: "Social Sciences",
    test: /sociology|political science|psychology|criminology|international relations|social work/i,
    olevel: ["English Language", "Mathematics", "Government"],
    utme: ["English Language", "Government", "Economics", "History"],
  },
  {
    label: "Education",
    test: /education/i,
    olevel: ["English Language", "Mathematics"],
    utme: ["English Language", "Mathematics", "Government", "Biology"],
  },
  {
    label: "Arts, Humanities & Languages",
    test: /\barts?\b|language|linguistic|religious studies|\bhistory\b|literature|philosophy/i,
    olevel: ["English Language", "Literature in English"],
    utme: ["English Language", "Literature in English", "Government", "Christian Religious Studies"],
  },
];

// Faculty-level fallback for programmes whose name doesn't match any keyword
// category above (mostly compound/local-language combos JAMB's catalog is
// full of, e.g. "Igala/Political Science").
const FACULTY_FALLBACK = [
  { test: /medical|med.*pharm|health/i, categoryLabel: "Nursing & Allied Health" },
  { test: /^law$/i, categoryLabel: "Law" },
  { test: /engineering/i, categoryLabel: "Engineering" },
  { test: /agriculture/i, categoryLabel: "Agriculture & Environment" },
  { test: /^sciences?$/i, categoryLabel: "Physical Sciences" },
  { test: /social sciences/i, categoryLabel: "Social Sciences" },
  { test: /administration/i, categoryLabel: "Business, Accounting & Management" },
  { test: /education/i, categoryLabel: "Education" },
  { test: /arts/i, categoryLabel: "Arts, Humanities & Languages" },
];

const GENERIC_PROFILE = {
  label: "Generic (unclassified)",
  olevel: ["English Language", "Mathematics"],
  utme: ["English Language"],
};

const categoryByLabel = new Map(CATEGORIES.map((c) => [c.label, c]));

function profileFor(programme) {
  const name = programme.name || "";
  for (const category of CATEGORIES) {
    if (category.test.test(name)) return category;
  }
  const faculty = programme.faculty || "";
  for (const fallback of FACULTY_FALLBACK) {
    if (fallback.test.test(faculty)) return categoryByLabel.get(fallback.categoryLabel);
  }
  return GENERIC_PROFILE;
}

function sameProfile(existing, next) {
  const a = existing?.olevelRequiredSubjects || [];
  const b = next.olevel;
  const c = existing?.utmeRequiredSubjects || [];
  const d = next.utme;
  return JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(c) === JSON.stringify(d);
}

async function run() {
  await connectDb();
  logger.info(`Applying subject profiles${DRY_RUN ? " (dry run)" : ""}`);

  const programmes = await Programme.find({}, { name: 1, faculty: 1, subjectProfile: 1 });
  const stats = { updated: 0, unchanged: 0 };
  const byCategory = new Map();

  for (const programme of programmes) {
    const profile = profileFor(programme);
    byCategory.set(profile.label, (byCategory.get(profile.label) || 0) + 1);

    if (sameProfile(programme.subjectProfile, profile)) {
      stats.unchanged += 1;
      continue;
    }

    stats.updated += 1;
    if (!DRY_RUN) {
      await Programme.updateOne(
        { _id: programme._id },
        {
          $set: {
            "subjectProfile.olevelRequiredSubjects": profile.olevel,
            "subjectProfile.olevelMinimumCredits": 5,
            "subjectProfile.utmeRequiredSubjects": profile.utme,
          },
        }
      );
    }
  }

  logger.info("Subject profile assignment complete", stats);
  logger.info("By category:", Object.fromEntries(byCategory));
  await disconnectDb();
}

run().catch((err) => {
  logger.error("Subject profile assignment failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
