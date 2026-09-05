/**
 * One-time catalog import from JAMB's public IBASS brochure system
 * (ibass.jamb.gov.ng / ibass-api.jamb.gov.ng) — the same data the "brochure by
 * institution" feature shows any candidate for free, accessed via the browser
 * app's own API instead of clicking through the UI by hand.
 *
 * Imports: Institution + Programme (global, de-duplicated by name) +
 * InstitutionProgramme (offering links). Deliberately does NOT create
 * AdmissionRule records — JAMB's utme_requirements/de_requirements/subjects
 * text is free-form HTML prose, not the structured minimumScore/requiredSubjects
 * shape our matching engine needs, and turning it into "verified" rule data
 * without a human reading it would defeat the point of the review workflow.
 * That raw text is cached to disk per institution instead, as reference
 * material for whoever drafts the real rules later.
 *
 * Resumable: raw API responses are cached to disk, and every DB write is an
 * upsert keyed by name, so re-running is safe and cheap after a partial run.
 *
 * Usage: node scripts/import/jamb-import.js [--limit=N] [--dry-run]
 */

const path = require("path");
const fs = require("fs/promises");
const { connectDb, disconnectDb } = require("../../src/config/db");
const { Institution, Programme, InstitutionProgramme } = require("../../src/models");
const logger = require("../../src/config/logger");
const { INSTITUTION_OWNERSHIP, RECORD_STATUS } = require("../../src/config/constants");
const { slugify } = require("../../src/utils/slugify");
const {
  properCase,
  classifyInstitutionType,
  parseNameAndTown,
  findAmbiguousNames,
  resolvedInstitutionName,
} = require("./jamb-catalog-utils");

const API_BASE = "https://ibass-api.jamb.gov.ng/api/ibass";
const REQUEST_DELAY_MS = 300;
const CACHE_DIR = path.resolve(__dirname, "cache");
const REQUIREMENTS_CACHE_DIR = path.join(CACHE_DIR, "requirements");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = Number((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || Infinity;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; MySchoolPlacementCatalogImport/1.0)",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
  return res.json();
}

async function fetchAllInstitutions() {
  const cachePath = path.join(CACHE_DIR, "institutions-all.json");
  try {
    const cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
    logger.info(`Using cached institutions list (${cached.length} records)`);
    return cached;
  } catch {
    // no cache yet, fetch fresh
  }

  const all = [];
  let page = 1;
  let lastPage = 1;
  do {
    const payload = await fetchJson(`${API_BASE}/institutions?page=${page}`, {
      inst_type: null,
      inst_category: null,
      inst_search: null,
    });
    all.push(...payload.data.data);
    lastPage = payload.data.last_page;
    logger.info(`Fetched institutions page ${page}/${lastPage} (${all.length} so far)`);
    page += 1;
    if (page <= lastPage) await sleep(REQUEST_DELAY_MS);
  } while (page <= lastPage);

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(all, null, 2));
  return all;
}

async function fetchAllProgrammesForInstitution(jambInstitutionId, cacheKey) {
  const cachePath = path.join(CACHE_DIR, "programmes", `${cacheKey}.json`);
  try {
    return JSON.parse(await fs.readFile(cachePath, "utf8"));
  } catch {
    // no cache yet, fetch fresh
  }

  const all = [];
  let page = 1;
  let lastPage = 1;
  do {
    const payload = await fetchJson(`${API_BASE}/institution/programmes/${jambInstitutionId}?page=${page}`, {
      course_search: null,
    });
    all.push(...(payload.data?.data || []));
    lastPage = payload.data?.last_page || 1;
    page += 1;
    if (page <= lastPage) await sleep(REQUEST_DELAY_MS);
  } while (page <= lastPage);

  await fs.mkdir(path.join(CACHE_DIR, "programmes"), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(all, null, 2));
  return all;
}

async function upsertInstitution(raw, ambiguousNames) {
  const { town } = parseNameAndTown(raw.title);
  const institutionType = classifyInstitutionType(raw.title);
  const ownership = (raw.ownership || "").toLowerCase();

  if (!institutionType) return { skipped: "unrecognised institution type", raw };
  if (!Object.values(INSTITUTION_OWNERSHIP).includes(ownership)) {
    return { skipped: `unrecognised ownership "${raw.ownership}"`, raw };
  }
  if (!raw.state) return { skipped: "missing state", raw };

  const name = resolvedInstitutionName(raw, ambiguousNames);

  if (DRY_RUN) return { institution: { name, state: raw.state, ownership, institutionType }, dryRun: true };

  const slug = slugify(name);
  try {
    const institution = await Institution.findOneAndUpdate(
      { name },
      {
        $set: {
          // findOneAndUpdate upserts bypass the schema's pre('validate') slug hook,
          // so the slug has to be set explicitly here rather than left to it.
          slug,
          state: raw.state,
          town,
          ownership,
          institutionType,
          status: RECORD_STATUS.ACTIVE,
          "metadata.shortName": raw.abbreviation || undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { institution };
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.slug) {
      return { institution: await Institution.findOne({ slug }) };
    }
    throw err;
  }
}

// Some institutions (mostly polytechnics) put the diploma level here instead
// of a real faculty name — e.g. "NATIONAL DIPLOMA" — since that's not useful
// as a faculty label, drop it rather than storing a misleading value.
const NON_FACULTY_DEPARTMENTS = new Set(["NATIONAL DIPLOMA", "HIGHER NATIONAL DIPLOMA", "ND", "HND"]);

async function upsertProgramme(rawProgramme) {
  const name = properCase(rawProgramme.title.trim());
  if (!name) return null;

  const dept = (rawProgramme.department || "").trim().toUpperCase();
  const faculty = dept && !NON_FACULTY_DEPARTMENTS.has(dept) ? properCase(rawProgramme.department) : undefined;

  if (DRY_RUN) return { _id: name, name };

  const slug = slugify(name);
  try {
    return await Programme.findOneAndUpdate(
      { name },
      { $set: { slug, faculty } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    // Different institutions spell the same programme differently enough that the
    // names differ but the slug collides (e.g. "Electrical/Electronics Engineering"
    // vs "Electrical & Electronics Engineering") — that's really the same programme,
    // so fall back to the one that already claimed this slug instead of failing.
    if (err.code === 11000 && err.keyPattern?.slug) {
      return Programme.findOne({ slug });
    }
    throw err;
  }
}

async function run() {
  await connectDb();
  logger.info(`Starting JAMB catalog import${DRY_RUN ? " (dry run)" : ""}${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ""}`);

  const rawInstitutions = await fetchAllInstitutions();
  const ambiguousNames = findAmbiguousNames(rawInstitutions);
  logger.info(`${ambiguousNames.size} institution names are ambiguous across states and will be disambiguated`);
  const stats = { institutionsImported: 0, institutionsSkipped: 0, programmesImported: 0, offeringsCreated: 0 };

  let processed = 0;
  for (const raw of rawInstitutions) {
    if (processed >= LIMIT) break;

    const { institution, skipped } = await upsertInstitution(raw, ambiguousNames);
    if (skipped) {
      stats.institutionsSkipped += 1;
      continue;
    }
    processed += 1;
    stats.institutionsImported += 1;
    logger.info(`[${processed}] Institution: ${institution.name} (${institution.institutionType}, ${institution.ownership})`);

    const cacheKey = `${raw.id}-${institution.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    const programmes = await fetchAllProgrammesForInstitution(raw.id, cacheKey);
    await sleep(REQUEST_DELAY_MS);

    // Cache the raw admission-requirement text (utme_requirements, de_requirements,
    // subjects, remarks) for human reference when drafting real AdmissionRule entries —
    // deliberately not parsed into structured fields, see file header.
    if (!DRY_RUN && programmes.length > 0) {
      await fs.mkdir(REQUIREMENTS_CACHE_DIR, { recursive: true });
      await fs.writeFile(
        path.join(REQUIREMENTS_CACHE_DIR, `${cacheKey}.json`),
        JSON.stringify(
          programmes.map((p) => ({
            title: p.title,
            department: p.department,
            status: p.status,
            utme_requirements: p.utme_requirements,
            de_requirements: p.de_requirements,
            subjects: p.subjects,
            remarks: p.remarks,
          })),
          null,
          2
        )
      );
    }

    for (const rawProgramme of programmes) {
      if (rawProgramme.status && rawProgramme.status !== "Approved") continue;
      const programme = await upsertProgramme(rawProgramme);
      if (!programme) continue;
      stats.programmesImported += 1;

      if (!DRY_RUN) {
        await InstitutionProgramme.findOneAndUpdate(
          { institution: institution._id, programme: programme._id },
          { $set: { status: RECORD_STATUS.ACTIVE } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        stats.offeringsCreated += 1;
      }
    }
    logger.info(`  -> ${programmes.length} programmes cached/linked`);
  }

  logger.info("JAMB catalog import complete", stats);
  if (!DRY_RUN && LIMIT === Infinity) {
    await fs.writeFile(path.join(CACHE_DIR, ".import-complete"), new Date().toISOString());
  }
  await disconnectDb();
}

run().catch((err) => {
  logger.error("JAMB import failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
