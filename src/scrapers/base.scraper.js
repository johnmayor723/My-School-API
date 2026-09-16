const path = require("path");
const fs = require("fs/promises");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Shared scraper infrastructure, deliberately mirroring
 * scripts/import/jamb-import.js's own safe-fetch pattern (native fetch,
 * throttled, descriptive User-Agent, disk-cached) rather than introducing a
 * new HTTP/caching convention. Subclasses implement run().
 */
class BaseScraper {
  constructor({ sourceName, sourceType, baseUrl, rateLimitMs = 300, userAgentSuffix = "" }) {
    this.sourceName = sourceName;
    this.sourceType = sourceType;
    this.baseUrl = baseUrl;
    this.rateLimitMs = rateLimitMs;
    this.userAgent = `Mozilla/5.0 (compatible; MySchoolPlacementCutoffIntelligence/1.0${userAgentSuffix ? `; ${userAgentSuffix}` : ""})`;
  }

  async fetchJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
    return res.json();
  }

  async throttle() {
    await sleep(this.rateLimitMs);
  }

  async readCache(cachePath) {
    try {
      return JSON.parse(await fs.readFile(cachePath, "utf8"));
    } catch {
      return null;
    }
  }

  async writeCache(cachePath, data) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
  }

  // Abstract — subclasses implement the actual crawl/extract/stage loop.
  async run(_options) {
    throw new Error(`${this.constructor.name} must implement run()`);
  }

  // PHASE 2 slot-in point — present but unused by the JAMB adapter in MVP.
  // See src/services/cutoffAiExtraction.service.js.
  async runAiFallback(doc) {
    const { extractCutoffCandidatesFromDocument } = require("../services/cutoffAiExtraction.service");
    return extractCutoffCandidatesFromDocument(doc);
  }
}

module.exports = { BaseScraper };
