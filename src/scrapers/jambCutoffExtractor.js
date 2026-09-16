const { CUTOFF_TYPE, CUTOFF_CONFIDENCE } = require("../config/constants");

// JAMB's own utme_requirements/remarks text is free-form HTML prose about
// O'Level subjects and NCE/ND/HND credit levels — not structured UTME cutoff
// marks (that's why scripts/import/jamb-import.js only caches it, never
// parses it into rule fields). A real UTME cutoff mark on the 0-400 scale is
// realistically 100-400; numbers outside that range ("minimum 10", "minimum
// of 12") are almost always NCE points or credit counts, not cutoffs, and are
// deliberately skipped rather than staged as low-quality noise.
const PLAUSIBLE_MARK_RANGE = { min: 100, max: 400 };

const STRONG_PHRASE = /(?:minimum(?:\s+score)?(?:\s+of)?|not\s+(?:be\s+)?less\s+than|not\s+below|cut[\s-]?off\s*(?:mark|point)?\s*(?:of)?)\s*(\d{2,3})\b/gi;
const WEAK_PHRASE = /\b(\d{2,3})\s*(?:marks?|points?|and\s+above|or\s+above)\b/gi;

function stripHtml(text) {
  return (text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&dq;/gi, '"')
    .replace(/&sq;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pure text-in/data-out extractor: given plain prose (already HTML-stripped
 * or not), returns candidate numeric cutoffs found in it. Always low/medium
 * confidence — never treated as trustworthy without human review — and
 * always defaults to DEPARTMENTAL_CUTOFF, the most specific claim that's
 * still safely scoped to the one institution+programme this text is about;
 * a reviewer reclassifies to a different cutoffType if the surrounding
 * context (e.g. "national" or "post-UTME") warrants it.
 */
function extractCutoffCandidatesFromText(rawText) {
  const text = stripHtml(rawText);
  if (!text) return [];

  const hits = [];
  const seen = new Set();

  for (const [regex, confidence] of [
    [STRONG_PHRASE, CUTOFF_CONFIDENCE.MEDIUM],
    [WEAK_PHRASE, CUTOFF_CONFIDENCE.LOW],
  ]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const cutoffMark = Number(match[1]);
      if (cutoffMark < PLAUSIBLE_MARK_RANGE.min || cutoffMark > PLAUSIBLE_MARK_RANGE.max) continue;

      const start = Math.max(0, match.index - 60);
      const end = Math.min(text.length, match.index + match[0].length + 60);
      const snippet = text.slice(start, end).trim();
      const dedupeWithinCall = `${cutoffMark}:${snippet}`;
      if (seen.has(dedupeWithinCall)) continue;
      seen.add(dedupeWithinCall);

      hits.push({
        cutoffType: CUTOFF_TYPE.DEPARTMENTAL_CUTOFF,
        cutoffMark,
        confidence,
        rawExtractionSnippet: snippet,
        matchedPhrase: match[0].trim(),
      });
    }
  }

  return hits;
}

module.exports = { extractCutoffCandidatesFromText, stripHtml, PLAUSIBLE_MARK_RANGE };
