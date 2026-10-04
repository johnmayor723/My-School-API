/**
 * One-off seed: real 2026/2027 UTME-scale departmental cutoffs sampled from
 * 3 real universities per institution tier (OAU/UNN/UNIBEN for Tier 1;
 * Unilorin/UNIPORT/BUK for Tier 2; Babcock/ABUAD for Elite Private — Covenant
 * had no usable per-course breakdown, University of Ibadan and UNILAG were
 * EXCLUDED because their publicly reported "cutoffs" are on a post-UTME
 * composite/aggregate scale (0-100 with decimals), not the raw UTME/400
 * scale this table requires — mixing the two would corrupt the average).
 *
 * Source: web search of third-party admission-aggregator sites reporting
 * each university's 2026/2027 figures — NOT each university's own primary
 * publication. Treat as directional estimates, not officially verified
 * numbers (same caveat convention as apply-competitiveness-tiers.js).
 *
 * Only fills genuine gaps — skips any (programme, tier) pair that already
 * has a CourseTierCutoff value, so a real admin review is never clobbered.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const TIER1 = { tier: 0.9, label: "Tier 1 Federal", sources: ["OAU", "UNN", "UNIBEN"] };
const TIER2 = { tier: 0.75, label: "Tier 2 Federal", sources: ["Unilorin", "UNIPORT", "BUK"] };
const ELITE = { tier: 0.65, label: "Elite Private", sources: ["Babcock", "ABUAD"] };

// course: exact Programme.name in the catalog (confirmed to exist before writing this script)
const ENTRIES = [
  // ---- Tier 1 (0.9) ----
  { tier: 0.9, course: "Medicine and Surgery", marks: [285, 314, 260] },
  { tier: 0.9, course: "Pharmacy", marks: [260, 293, 250] },
  { tier: 0.9, course: "Computer Science", marks: [250, 220] },
  { tier: 0.9, course: "Law", marks: [270] },
  { tier: 0.9, course: "Accounting", marks: [246, 200] },
  { tier: 0.9, course: "Business Management", marks: [213] },
  { tier: 0.9, course: "Business Administration", marks: [210] },
  { tier: 0.9, course: "Linguistics", marks: [212, 200] },
  { tier: 0.9, course: "Geography", marks: [200, 200] },
  { tier: 0.9, course: "Microbiology", marks: [200, 210] },
  { tier: 0.9, course: "Biochemistry", marks: [207, 210] },
  { tier: 0.9, course: "Nursing Science", marks: [250] },
  { tier: 0.9, course: "Dentistry and Dental Surgery", marks: [250] },
  { tier: 0.9, course: "Medical Laboratory Science", marks: [230] },
  { tier: 0.9, course: "Physiotherapy", marks: [230] },
  { tier: 0.9, course: "Civil Engineering", marks: [230] },
  { tier: 0.9, course: "Mechanical Engineering", marks: [220] },
  { tier: 0.9, course: "Electrical Engineering", marks: [220] },
  { tier: 0.9, course: "Computer Engineering", marks: [220] },
  { tier: 0.9, course: "Chemical Engineering", marks: [220] },
  { tier: 0.9, course: "Petroleum Engineering", marks: [220] },
  { tier: 0.9, course: "Mathematics", marks: [200] },
  { tier: 0.9, course: "Physics", marks: [200] },
  { tier: 0.9, course: "Chemistry", marks: [200] },
  { tier: 0.9, course: "Mass Communication", marks: [220] },
  { tier: 0.9, course: "Economics", marks: [210] },
  { tier: 0.9, course: "Banking and Finance", marks: [200] },
  { tier: 0.9, course: "Marketing", marks: [200] },
  { tier: 0.9, course: "Political Science", marks: [200] },
  { tier: 0.9, course: "Sociology", marks: [200] },
  { tier: 0.9, course: "Public Administration", marks: [200] },
  { tier: 0.9, course: "Psychology", marks: [210] },
  { tier: 0.9, course: "English Language", marks: [200] },
  { tier: 0.9, course: "Philosophy", marks: [200] },
  { tier: 0.9, course: "Theatre Arts", marks: [200] },
  { tier: 0.9, course: "History", marks: [200] },
  { tier: 0.9, course: "Religious Studies", marks: [200] },
  { tier: 0.9, course: "Agricultural Economics and Extension", marks: [210] },

  // ---- Tier 2 (0.75) ----
  { tier: 0.75, course: "Medicine and Surgery", marks: [255] },
  { tier: 0.75, course: "Nursing Science", marks: [230] },
  { tier: 0.75, course: "Pharmacy", marks: [240, 230] },
  { tier: 0.75, course: "Doctor of Pharmacy", marks: [220] },
  { tier: 0.75, course: "Physiotherapy", marks: [220] },
  { tier: 0.75, course: "Law", marks: [235] },
  { tier: 0.75, course: "Mass Communication", marks: [220, 200] },
  { tier: 0.75, course: "English Language", marks: [210] },
  { tier: 0.75, course: "Computer Science", marks: [210, 200] },
  { tier: 0.75, course: "Architecture", marks: [200] },
  { tier: 0.75, course: "Mechanical Engineering", marks: [195] },
  { tier: 0.75, course: "Electrical Engineering", marks: [195, 220, 200] },
  { tier: 0.75, course: "Civil Engineering", marks: [195, 230, 200] },
  { tier: 0.75, course: "Chemical Engineering", marks: [230, 200] },
  { tier: 0.75, course: "Petroleum Engineering", marks: [230] },
  { tier: 0.75, course: "Environmental Engineering", marks: [220] },
  { tier: 0.75, course: "Agricultural Economics and Extension", marks: [180] },
  { tier: 0.75, course: "Animal Science", marks: [180] },
  { tier: 0.75, course: "Fisheries & Aquaculture", marks: [180] },
  { tier: 0.75, course: "Forestry & Wildlife Management", marks: [180] },
  { tier: 0.75, course: "Computer Engineering", marks: [200] },
  { tier: 0.75, course: "Cyber Security", marks: [190] },
  { tier: 0.75, course: "Dentistry and Dental Surgery", marks: [220] },

  // ---- Elite Private (0.65) ----
  { tier: 0.65, course: "Medicine and Surgery", marks: [250] },
  { tier: 0.65, course: "Anatomy", marks: [200] },
  { tier: 0.65, course: "Computer Science", marks: [180] },
  { tier: 0.65, course: "Economics", marks: [180, 230] },
  { tier: 0.65, course: "Political Science", marks: [180] },
  { tier: 0.65, course: "Social Work", marks: [180] },
  { tier: 0.65, course: "Mass Communication", marks: [190] },
  { tier: 0.65, course: "Plant Science", marks: [230] },
  { tier: 0.65, course: "Sport Science", marks: [220] },
  { tier: 0.65, course: "Statistics", marks: [230] },
  { tier: 0.65, course: "Zoology", marks: [230] },
  { tier: 0.65, course: "Accounting", marks: [250] },
  { tier: 0.65, course: "Banking and Finance", marks: [230] },
  { tier: 0.65, course: "Psychology", marks: [220] },
];

const TIER_SOURCES = { 0.9: TIER1.sources, 0.75: TIER2.sources, 0.65: ELITE.sources };

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Programme, CourseTierCutoff, User } = require("../../src/models");
  const courseTierCutoffService = require("../../src/services/courseTierCutoff.service");

  const actor = await User.findOne({ email: "admin@myschoolplacement.ng" });
  if (!actor) throw new Error("seed admin not found");

  const stats = { written: 0, skippedExisting: 0, programmeNotFound: 0 };
  const notFound = [];

  for (const entry of ENTRIES) {
    const programme = await Programme.findOne({ name: entry.course });
    if (!programme) {
      stats.programmeNotFound += 1;
      notFound.push(entry.course);
      continue;
    }

    const existing = await CourseTierCutoff.findOne({ programme: programme._id, institutionTier: entry.tier });
    if (existing) {
      stats.skippedExisting += 1;
      continue;
    }

    const avg = Math.round(entry.marks.reduce((a, b) => a + b, 0) / entry.marks.length);
    const sources = TIER_SOURCES[entry.tier];
    const notes = `Estimated 2026/2027 UTME cutoff, averaged from ${entry.marks.length} of ${sources.length} sampled tier universities (${sources.join(", ")}) via third-party admission-aggregator sites — not each university's own primary publication. Directional estimate, not officially verified. Seeded 2026-10-04.`;

    await courseTierCutoffService.upsertForProgramme(programme._id, [{ institutionTier: entry.tier, cutoffMark: avg, notes }], actor, null);
    stats.written += 1;
  }

  console.log(JSON.stringify(stats, null, 2));
  if (notFound.length) console.log("Programme not found for:", notFound);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
