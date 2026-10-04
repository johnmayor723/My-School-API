/**
 * Pilot: real, institution-specific (not tier-averaged) 2026/2027 UTME-scale
 * cutoffs for universities in the NORTH_EAST geopolitical zone — the first
 * zone of a planned-to-continue-incrementally full zone-by-zone pass (see
 * project memory). Unlike seed-tier-cutoffs-2026.js, these are written
 * directly onto each institution's own AdmissionRule (not CourseTierCutoff),
 * and marked verification.lastVerifiedAt so they're never silently
 * overwritten by a later generate-admission-rules.js re-run.
 *
 * Source: third-party admission-aggregator sites reporting each university's
 * 2026/2027 figures, not each university's own primary publication —
 * directional estimate, not officially verified. MAUTECH/AUN were excluded:
 * MAUTECH's own source admitted "does not publish departmental cut-offs,"
 * and its numbers were explicitly an "aggregate (JAMB + Post-UTME)" estimate
 * of uncertain scale; AUN gave no departmental breakdown at all.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const ENTRIES = [
  // Abubakar Tafawa Balewa University
  { institution: "Abubakar Tafawa Balewa University", course: "Architecture", mark: 170 },
  { institution: "Abubakar Tafawa Balewa University", course: "Computer Science", mark: 180 },
  { institution: "Abubakar Tafawa Balewa University", course: "Civil Engineering", mark: 200 },
  { institution: "Abubakar Tafawa Balewa University", course: "Mechanical Engineering", mark: 200 },
  { institution: "Abubakar Tafawa Balewa University", course: "Electrical Engineering", mark: 200 },
  { institution: "Abubakar Tafawa Balewa University", course: "Chemical Engineering", mark: 190 },
  { institution: "Abubakar Tafawa Balewa University", course: "Mathematics", mark: 170 },
  { institution: "Abubakar Tafawa Balewa University", course: "Chemistry", mark: 170 },
  { institution: "Abubakar Tafawa Balewa University", course: "Physics", mark: 160 },

  // University of Maiduguri
  { institution: "University of Maiduguri", course: "Medicine and Surgery", mark: 250 },
  { institution: "University of Maiduguri", course: "Dentistry and Dental Surgery", mark: 250 },
  { institution: "University of Maiduguri", course: "Anatomy", mark: 220 },
  { institution: "University of Maiduguri", course: "Physiotherapy", mark: 220 },
  { institution: "University of Maiduguri", course: "Accounting", mark: 170 },
  { institution: "University of Maiduguri", course: "Business Administration", mark: 160 },

  // Federal University Wukari
  { institution: "Federal University (Taraba)", course: "Nursing Science", mark: 248 },
  { institution: "Federal University (Taraba)", course: "Medicine and Surgery", mark: 240 },
  { institution: "Federal University (Taraba)", course: "Law", mark: 220 },
  { institution: "Federal University (Taraba)", course: "Accounting", mark: 224 },

  // Adamawa State University
  { institution: "Adamawa State University", course: "Biochemistry", mark: 170 },
  { institution: "Adamawa State University", course: "Microbiology", mark: 170 },
  { institution: "Adamawa State University", course: "Computer Science", mark: 170 },
  { institution: "Adamawa State University", course: "Cyber Security", mark: 160 },
  { institution: "Adamawa State University", course: "Mass Communication", mark: 160 },

  // Bauchi State University
  { institution: "Bauchi State University", course: "English Language", mark: 160 },
  { institution: "Bauchi State University", course: "History", mark: 160 },
  { institution: "Bauchi State University", course: "Theatre Arts", mark: 160 },
  { institution: "Bauchi State University", course: "Linguistics", mark: 160 },
  { institution: "Bauchi State University", course: "Computer Science", mark: 180 },
  { institution: "Bauchi State University", course: "Mathematics", mark: 170 },
  { institution: "Bauchi State University", course: "Physics", mark: 170 },
  { institution: "Bauchi State University", course: "Chemistry", mark: 170 },
  { institution: "Bauchi State University", course: "Microbiology", mark: 180 },
  { institution: "Bauchi State University", course: "Biochemistry", mark: 180 },
  { institution: "Bauchi State University", course: "Statistics", mark: 160 },
  { institution: "Bauchi State University", course: "Accounting", mark: 180 },
  { institution: "Bauchi State University", course: "Business Administration", mark: 180 },
  { institution: "Bauchi State University", course: "Economics", mark: 170 },
  { institution: "Bauchi State University", course: "Political Science", mark: 170 },
  { institution: "Bauchi State University", course: "Sociology", mark: 160 },
  { institution: "Bauchi State University", course: "Public Administration", mark: 170 },
  { institution: "Bauchi State University", course: "Mass Communication", mark: 180 },
  { institution: "Bauchi State University", course: "Geography", mark: 160 },

  // Gombe State University
  { institution: "Gombe State University", course: "Medicine and Surgery", mark: 200 },
  { institution: "Gombe State University", course: "Pharmacy", mark: 200 },
  { institution: "Gombe State University", course: "Nursing Science", mark: 200 },
  { institution: "Gombe State University", course: "Law", mark: 200 },
  { institution: "Gombe State University", course: "Computer Science", mark: 180 },
  { institution: "Gombe State University", course: "Architecture", mark: 160 },
  { institution: "Gombe State University", course: "Anatomy", mark: 160 },

  // Taraba State University
  { institution: "Taraba State University", course: "Business Administration", mark: 170 },
  { institution: "Taraba State University", course: "Political Science", mark: 160 },
  { institution: "Taraba State University", course: "Physics", mark: 150 },
  { institution: "Taraba State University", course: "Statistics", mark: 150 },
  { institution: "Taraba State University", course: "Zoology", mark: 150 },

  // Yobe State University
  { institution: "Yobe State University", course: "Physiotherapy", mark: 190 },
  { institution: "Yobe State University", course: "Anatomy", mark: 170 },
  { institution: "Yobe State University", course: "Biochemistry", mark: 150 },
  { institution: "Yobe State University", course: "Microbiology", mark: 150 },
  { institution: "Yobe State University", course: "Computer Science", mark: 170 },
  { institution: "Yobe State University", course: "Law", mark: 180 },

  // Borno State University
  { institution: "Borno State University", course: "Medicine and Surgery", mark: 250 },
  { institution: "Borno State University", course: "Nursing Science", mark: 230 },
  { institution: "Borno State University", course: "Physiotherapy", mark: 210 },
  { institution: "Borno State University", course: "Medical Laboratory Science", mark: 210 },
  { institution: "Borno State University", course: "English Language", mark: 160 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Institution, Programme, AdmissionRule, AdmissionSession, User } = require("../../src/models");

  const actor = await User.findOne({ email: "admin@myschoolplacement.ng" });
  const session = await AdmissionSession.findOne({ isActive: true });
  const stats = { updated: 0, alreadyVerified: 0, notFound: [] };

  for (const entry of ENTRIES) {
    const institution = await Institution.findOne({ name: entry.institution });
    const programme = await Programme.findOne({ name: entry.course });
    if (!institution || !programme) {
      stats.notFound.push(`${entry.institution} / ${entry.course} (institution or programme not found)`);
      continue;
    }

    const rule = await AdmissionRule.findOne({
      institution: institution._id,
      programme: programme._id,
      admissionSession: session._id,
      status: "PUBLISHED",
    });
    if (!rule) {
      stats.notFound.push(`${entry.institution} / ${entry.course} (no published rule — offering may not exist)`);
      continue;
    }

    if (rule.verification?.lastVerifiedAt) {
      stats.alreadyVerified += 1;
      continue;
    }

    rule.utme.minimumScore = entry.mark;
    rule.source = {
      title: `${entry.institution} 2026/2027 published cutoff (third-party aggregator)`,
      type: "other",
      sourceDate: new Date(),
    };
    rule.verification = {
      lastVerifiedAt: new Date(),
      verifiedBy: actor._id,
      notes:
        "Real institution-specific 2026/2027 cutoff from a third-party admission-aggregator site (NORTH_EAST zone pilot), not the institution's own primary publication. Directional estimate, not officially verified. Seeded 2026-10-04.",
    };
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
