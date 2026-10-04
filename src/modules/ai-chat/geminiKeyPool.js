const { GoogleGenAI } = require("@google/genai");
const env = require("../../config/env");
const logger = require("../../config/logger");
const { ForbiddenError } = require("../../errors/AppError");

const COOLDOWN_MS = 60_000;

// One client per configured key (env.aiChat.apiKeys, GEMINI_API_KEYS — see
// env.js). Sticky round-robin: generateContent() keeps using whichever key
// last succeeded, and only moves on when that key actually comes back with
// a quota/rate-limit error (HTTP 429), rather than spreading every request
// thin across all keys. A key that 429s is put in cooldown and skipped
// until it expires, so the pool doesn't keep hammering an exhausted key on
// every request.
const pool = env.aiChat.apiKeys.map((key) => ({
  key,
  client: new GoogleGenAI({ apiKey: key }),
  exhaustedUntil: 0,
}));

let currentIndex = 0;

function maskKey(key) {
  return key.length <= 8 ? "****" : `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function isQuotaError(err) {
  return err?.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(err?.message || "");
}

async function generateContent(params) {
  if (pool.length === 0) throw new ForbiddenError("Gemini API key not configured");

  const now = Date.now();
  const order = pool.map((_, offset) => (currentIndex + offset) % pool.length);

  let lastQuotaErr;
  for (const i of order) {
    const entry = pool[i];
    if (entry.exhaustedUntil > now) continue;

    try {
      const response = await entry.client.models.generateContent(params);
      currentIndex = i;
      return response;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      entry.exhaustedUntil = Date.now() + COOLDOWN_MS;
      lastQuotaErr = err;
      logger.warn("Gemini key hit its rate/quota limit, failing over to the next key", {
        key: maskKey(entry.key),
        poolSize: pool.length,
      });
    }
  }

  // Every key is in cooldown (or just hit one on this pass) — nothing left
  // to fail over to.
  throw lastQuotaErr || new ForbiddenError("All configured Gemini API keys are currently rate-limited");
}

module.exports = { generateContent };
