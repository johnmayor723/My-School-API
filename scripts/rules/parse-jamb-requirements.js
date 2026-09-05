/**
 * Populates InstitutionProgramme.jambRequirements from the raw admission-text
 * jamb-import.js already cached to disk per institution
 * (scripts/import/cache/requirements/*.json) — JAMB's own published UTME
 * subject combination and O'Level credit requirement for that *specific*
 * institution+programme offering, as opposed to Programme.subjectProfile's
 * generic guess shared by every institution offering a similarly-named
 * course (see apply-subject-profiles.js).
 *
 * Parsing itself lives in subject-lexicon.js — deliberately permissive where
 * JAMB's prose lists an open "pick N more" pool (dropped rather than forced
 * mandatory) or is empty/unparseable (left unset; generate-admission-rules.js
 * falls back to subjectProfile in that case). Every parsed offering can be
 * re-derived from the same cache at any time, so this is safe to re-run.
 *
 * Usage: node scripts/rules/parse-jamb-requirements.js [--dry-run] [--limit=N]
 */

const fs = require("fs/promises");
const path = require("path");
const { connectDb, disconnectDb } = require("../../src/config/db");
const { Institution, Programme, InstitutionProgramme } = require("../../src/models");
const logger = require("../../src/config/logger");
const { properCase, findAmbiguousNames, resolvedInstitutionName } = require("../import/jamb-catalog-utils");
const { slugify } = require("../../src/utils/slugify");
const { parseUtmeSubjectCombinations, parseOlevelRequirement } = require("./subject-lexicon");

const CACHE_DIR = path.resolve(__dirname, "../import/cache");
const REQUIREMENTS_CACHE_DIR = path.join(CACHE_DIR, "requirements");

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || Infinity;

function stripHtml(raw) {
  return String(raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildInstitutionIndex() {
  const rawInstitutions = JSON.parse(await fs.readFile(path.join(CACHE_DIR, "institutions-all.json"), "utf8"));
  const ambiguousNames = findAmbiguousNames(rawInstitutions);
  const nameByJambId = new Map();
  for (const raw of rawInstitutions) {
    nameByJambId.set(String(raw.id), resolvedInstitutionName(raw, ambiguousNames));
  }
  return nameByJambId;
}

async function run() {
  await connectDb();
  logger.info(`Parsing JAMB brochure requirements${DRY_RUN ? " (dry run)" : ""}`);

  const nameByJambId = await buildInstitutionIndex();
  const [institutions, programmes] = await Promise.all([
    Institution.find({}, { name: 1 }).lean(),
    Programme.find({}, { name: 1, slug: 1 }).lean(),
  ]);
  const institutionByName = new Map(institutions.map((i) => [i.name, i._id]));
  const institutionBySlug = new Map(institutions.map((i) => [slugify(i.name), i._id]));
  const programmeByName = new Map(programmes.map((p) => [p.name, p._id]));
  const programmeBySlug = new Map(programmes.map((p) => [p.slug, p._id]));

  const files = (await fs.readdir(REQUIREMENTS_CACHE_DIR)).filter((f) => f.endsWith(".json"));
  logger.info(`Found ${files.length} cached institution requirement files`);

  const stats = {
    filesProcessed: 0,
    institutionNotFound: 0,
    offeringsSeen: 0,
    programmeNotFound: 0,
    institutionProgrammeNotFound: 0,
    utmeParsed: 0,
    olevelParsed: 0,
    bothEmpty: 0,
    updated: 0,
  };

  const bulkOps = [];

  let processed = 0;
  for (const file of files) {
    if (processed >= LIMIT) break;
    processed += 1;

    const jambId = file.split("-")[0];
    const institutionName = nameByJambId.get(jambId);
    // Falls back to a slug match for the same reason upsertInstitution() in
    // jamb-import.js does: JAMB's raw catalog has near-duplicate institution
    // titles (e.g. "(Tech.)" vs "(Tech)", hyphenated vs not) that produce
    // different parsed names but an identical slug, in which case the import
    // already collapsed them onto one Institution doc under whichever name
    // won the race — so an exact-name miss here doesn't mean "not imported".
    const institutionId =
      (institutionName && institutionByName.get(institutionName)) ||
      (institutionName && institutionBySlug.get(slugify(institutionName)));
    if (!institutionId) {
      stats.institutionNotFound += 1;
      continue;
    }
    stats.filesProcessed += 1;

    let records;
    try {
      records = JSON.parse(await fs.readFile(path.join(REQUIREMENTS_CACHE_DIR, file), "utf8"));
    } catch (err) {
      logger.warn(`Skipping unreadable cache file ${file}`, { error: err.message });
      continue;
    }

    for (const rawProgramme of records) {
      if (rawProgramme.status && rawProgramme.status !== "Approved") continue;
      stats.offeringsSeen += 1;

      const name = properCase(String(rawProgramme.title || "").trim());
      if (!name) continue;
      const programmeId = programmeByName.get(name) || programmeBySlug.get(slugify(name));
      if (!programmeId) {
        stats.programmeNotFound += 1;
        continue;
      }

      const subjectsText = stripHtml(rawProgramme.subjects);
      const utmeReqText = stripHtml(rawProgramme.utme_requirements);
      const utmeSubjectCombinations = parseUtmeSubjectCombinations(subjectsText);
      const olevelParsed = parseOlevelRequirement(utmeReqText);

      if (utmeSubjectCombinations.length > 0) stats.utmeParsed += 1;
      if (olevelParsed) stats.olevelParsed += 1;
      if (utmeSubjectCombinations.length === 0 && !olevelParsed) {
        stats.bothEmpty += 1;
        continue;
      }

      const jambRequirements = { parsedAt: new Date() };
      if (utmeSubjectCombinations.length > 0) {
        jambRequirements.utmeSubjectCombinations = utmeSubjectCombinations;
        jambRequirements.rawSubjectsText = subjectsText;
      }
      if (olevelParsed) {
        if (olevelParsed.requiredSubjects.length > 0) jambRequirements.olevelRequiredSubjects = olevelParsed.requiredSubjects;
        if (olevelParsed.minimumCredits !== null) jambRequirements.olevelMinimumCredits = olevelParsed.minimumCredits;
        jambRequirements.rawUtmeRequirementsText = utmeReqText;
      }

      stats.updated += 1;
      bulkOps.push({
        updateOne: {
          filter: { institution: institutionId, programme: programmeId },
          update: { $set: { jambRequirements } },
        },
      });
    }

    if (processed % 100 === 0) logger.info(`  ...${processed}/${files.length} institution files processed`);
  }

  logger.info("Parse pass complete", stats);

  if (!DRY_RUN && bulkOps.length > 0) {
    const BATCH = 1000;
    let applied = 0;
    let matched = 0;
    for (let i = 0; i < bulkOps.length; i += BATCH) {
      const batch = bulkOps.slice(i, i + BATCH);
      const res = await InstitutionProgramme.bulkWrite(batch, { ordered: false });
      applied += batch.length;
      matched += res.matchedCount || 0;
      logger.info(`  applied ${applied}/${bulkOps.length} updates (${matched} matched an existing offering)`);
    }
    if (matched < applied) {
      stats.institutionProgrammeNotFound = applied - matched;
      logger.info(`${applied - matched} parsed offerings had no matching InstitutionProgramme (not an active offering)`);
    }
  }

  await disconnectDb();
}

run().catch((err) => {
  logger.error("JAMB requirement parsing failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
