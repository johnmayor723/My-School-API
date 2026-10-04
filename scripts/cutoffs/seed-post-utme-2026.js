/**
 * One-off seed: real 2026/2027 post-UTME/composite screening cutoffs for
 * University of Ibadan and UNILAG, the two universities whose publicly
 * reported "cutoff marks" turned out to be on a post-UTME composite scale
 * (not raw UTME/400) — excluded from scripts/cutoffs/seed-tier-cutoffs-2026.js
 * for exactly that reason, since mixing scales would have corrupted the
 * tier average. That real data belongs here instead, as an institution-
 * specific additional.postUtmeMinimumScore on the existing PUBLISHED rule,
 * not blended into any tier-wide number.
 *
 * Source: third-party admission-aggregator sites reporting each university's
 * 2026/2027 figures, not each university's own primary publication —
 * directional estimate, not officially verified.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const ENTRIES = [
  // University of Ibadan — post-UTME screening score, 0-100 scale.
  { institution: "University of Ibadan", course: "Music", score: 50.0 },
  { institution: "University of Ibadan", course: "English Language", score: 61.875 },
  { institution: "University of Ibadan", course: "Linguistics", score: 60.25 },
  { institution: "University of Ibadan", course: "Agricultural Economics", score: 55.0 },

  // UNILAG — post-UTME/composite screening score.
  { institution: "University of Lagos", course: "Medicine & Surgery", score: 83.425 },
  { institution: "University of Lagos", course: "Computer Science", score: 82.05 },
  { institution: "University of Lagos", course: "Nursing Science", score: 77.925 },
  { institution: "University of Lagos", course: "Systems Engineering", score: 78.8 },
  { institution: "University of Lagos", course: "Actuarial Science", score: 65.875 },
  { institution: "University of Lagos", course: "Statistics", score: 70.45 },
  { institution: "University of Lagos", course: "Political Science", score: 65.65 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Institution, Programme, AdmissionRule, AdmissionSession, User } = require("../../src/models");

  const actor = await User.findOne({ email: "admin@myschoolplacement.ng" });
  const session = await AdmissionSession.findOne({ isActive: true });
  const stats = { updated: 0, notFound: [] };

  for (const entry of ENTRIES) {
    const institution = await Institution.findOne({ name: entry.institution });
    const programme = await Programme.findOne({ name: entry.course });
    if (!institution || !programme) {
      stats.notFound.push(`${entry.institution} / ${entry.course}`);
      continue;
    }

    const rule = await AdmissionRule.findOne({
      institution: institution._id,
      programme: programme._id,
      admissionSession: session._id,
      status: "PUBLISHED",
    });
    if (!rule) {
      stats.notFound.push(`${entry.institution} / ${entry.course} (no published rule)`);
      continue;
    }

    rule.additional = rule.additional || {};
    rule.additional.postUtmeRequired = true;
    rule.additional.postUtmeMinimumScore = entry.score;
    rule.updatedBy = actor._id;
    await rule.save();
    stats.updated += 1;
  }

  console.log(JSON.stringify(stats, null, 2));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
