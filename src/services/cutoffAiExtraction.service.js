/**
 * PHASE 2 STUB. No AI SDK is wired into this backend yet. This module only
 * defines the shape the normalization pipeline will call once ambiguous
 * PDF/HTML cutoff extraction is implemented — see
 * docs/cutoff-intelligence-phase-2-backlog.md. It throws rather than
 * returning anything, so a caller that forgets to gate on
 * env.aiExtractionEnabled fails loudly instead of silently fabricating a
 * cutoff number (same "never invent certainty" idiom as the matching-engine
 * evaluators).
 *
 * Intended slot-in point: BaseScraper.runAiFallback(doc), called only when a
 * regex-based extractor (e.g. jambCutoffExtractor.js) finds zero
 * medium/high-confidence hits in a document.
 */
async function extractCutoffCandidatesFromDocument({ rawText, sourceUrl, mimeType }) {
  throw new Error(
    "AI-extraction fallback is not implemented yet (Phase 2) — see docs/cutoff-intelligence-phase-2-backlog.md"
  );
}

module.exports = { extractCutoffCandidatesFromDocument };
