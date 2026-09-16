const path = require("path");
const fs = require("fs/promises");
const { BaseScraper } = require("./base.scraper");
const { extractCutoffCandidatesFromText } = require("./jambCutoffExtractor");
const { normalizeAndStageCandidate } = require("../utils/cutoffNormalization");
const { CUTOFF_SOURCE_TYPE } = require("../config/constants");
const logger = require("../config/logger");

const API_BASE = "https://ibass-api.jamb.gov.ng/api/ibass";
// Reuse jamb-import.js's own cached requirement text (utme_requirements/remarks
// per institution+programme) instead of re-crawling JAMB from scratch — same
// data, same rate-limit budget already spent once.
const JAMB_REQUIREMENTS_CACHE_DIR = path.resolve(__dirname, "../../scripts/import/cache/requirements");

// Cache filenames from jamb-import.js are "<jambInstitutionId>-<slugified-name>.json".
function deriveInstitutionNameFromCacheFile(filename) {
  const base = filename.replace(/\.json$/, "");
  const withoutLeadingId = base.replace(/^\d+-/, "");
  return withoutLeadingId
    .replace(/-+$/, "")
    .replace(/-/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Reference scraper for the Cut-Off Marks Intelligence module. Does NOT
 * re-fetch JAMB's institution/programme catalog (jamb-import.js already owns
 * that) — it only reads that script's cached requirement text and runs the
 * conservative regex extractor over it, staging whatever it finds as
 * low/medium-confidence CutoffCandidates for human review.
 */
class JambCutoffScraper extends BaseScraper {
  constructor(cutoffSourceDoc) {
    super({
      sourceName: cutoffSourceDoc.name,
      sourceType: CUTOFF_SOURCE_TYPE.OFFICIAL,
      baseUrl: cutoffSourceDoc.baseUrl || API_BASE,
      rateLimitMs: cutoffSourceDoc.rateLimitMs,
      userAgentSuffix: "CutoffScraper",
    });
    this.cutoffSourceDoc = cutoffSourceDoc;
  }

  async run({ limit = Infinity, dryRun = false, sessionLabel, models } = {}) {
    const stats = { institutionsProcessed: 0, programmesScanned: 0, candidatesFound: 0, candidatesStaged: 0 };

    let files;
    try {
      files = (await fs.readdir(JAMB_REQUIREMENTS_CACHE_DIR)).filter((f) => f.endsWith(".json"));
    } catch (err) {
      throw new Error(
        `JAMB requirements cache not found at ${JAMB_REQUIREMENTS_CACHE_DIR} — run scripts/import/jamb-import.js first. (${err.message})`
      );
    }

    for (const file of files) {
      if (stats.institutionsProcessed >= limit) break;

      const programmes = await this.readCache(path.join(JAMB_REQUIREMENTS_CACHE_DIR, file));
      if (!programmes || programmes.length === 0) continue;

      const rawInstitutionName = deriveInstitutionNameFromCacheFile(file);
      stats.institutionsProcessed += 1;

      for (const programme of programmes) {
        stats.programmesScanned += 1;
        const text = [programme.utme_requirements, programme.remarks].filter(Boolean).join(" ");
        const hits = extractCutoffCandidatesFromText(text);
        stats.candidatesFound += hits.length;

        for (const hit of hits) {
          if (dryRun) continue;
          await normalizeAndStageCandidate(
            {
              ...hit,
              rawInstitutionName,
              rawProgrammeName: programme.title,
              rawAdmissionSessionLabel: sessionLabel,
              scale: "UTME/400",
              scraperKey: this.cutoffSourceDoc.scraperKey,
              source: {
                name: this.sourceName,
                url: this.baseUrl,
                type: CUTOFF_SOURCE_TYPE.OFFICIAL,
                retrievedAt: new Date(),
                sourceRef: this.cutoffSourceDoc._id,
              },
            },
            models
          );
          stats.candidatesStaged += 1;
        }
      }

      if (stats.institutionsProcessed % 50 === 0) {
        logger.info(`[JambCutoffScraper] ${stats.institutionsProcessed} institutions processed so far`, stats);
      }
    }

    return stats;
  }
}

module.exports = { JambCutoffScraper, deriveInstitutionNameFromCacheFile };
