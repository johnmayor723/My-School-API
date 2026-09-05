/**
 * Turns JAMB's free-form admission-requirement prose (see
 * scripts/import/cache/requirements/*.json, cached by jamb-import.js) into
 * subject lists the matching engine can actually compare against a student's
 * submitted subjects — used by parse-jamb-requirements.js.
 *
 * JAMB's text mixes two things in one sentence: subjects that are always
 * mandatory, and a "pick N more from this pool" clause (e.g. "English
 * Language and Mathematics and any three (3) other subjects from: History,
 * Government, ..."). We can extract the mandatory part reliably; the pool
 * genuinely doesn't map to a fixed requirement (any N of an open list is
 * satisfied by many different students), so it's deliberately dropped rather
 * than guessed at — this is a permissive choice: a real requirement might be
 * slightly under-represented, but a student is never falsely rejected over a
 * subject the source text never actually mandated.
 *
 * Only the fixed 36-subject list the assessment wizard's O'Level step offers
 * (StepOLevel.jsx in the admin repo) is ever produced, so parsed output
 * always compares cleanly against what a student can submit.
 */

const CANONICAL_SUBJECTS = [
  "Agricultural Science", "Arabic", "Auto Mechanics", "Basic Electricity", "Biology",
  "Building Construction", "Chemistry", "Christian Religious Studies", "Civic Education",
  "Commerce", "Computer Studies", "Economics", "English Language", "Financial Accounting",
  "Fine Art", "Food and Nutrition", "French", "Further Mathematics", "Geography", "Government",
  "Hausa", "History", "Home Management", "Igbo", "Insurance", "Islamic Religious Studies",
  "Literature in English", "Marketing", "Mathematics", "Music", "Office Practice",
  "Physical Education", "Physics", "Technical Drawing", "Visual Art", "Yoruba",
];

// JAMB/WAEC phrasing that names a subject differently from the canonical list
// above. Checked before the canonical names themselves, longest pattern first,
// so e.g. "Islamic Religious Knowledge" doesn't get chopped up by a shorter
// unrelated match first.
const SYNONYMS = [
  ["Islamic Religious Knowledge", "Islamic Religious Studies"],
  ["Christian Religious Knowledge", "Christian Religious Studies"],
  ["Islamic Studies", "Islamic Religious Studies"],
  ["Additional Mathematics", "Further Mathematics"],
  ["Principles of Accounts", "Financial Accounting"],
  ["Book Keeping", "Financial Accounting"],
  ["Bookkeeping", "Financial Accounting"],
  ["Home Economics", "Home Management"],
  ["Agricultural Sciences", "Agricultural Science"],
  ["Agric Science", "Agricultural Science"],
  ["Use of English", "English Language"],
  ["Fine Arts", "Fine Art"],
  ["Visual Arts", "Visual Art"],
];

// Every phrase we'll scan for, longest first so multi-word canonical names
// (e.g. "Literature in English") aren't shadowed by a shorter substring match.
const ALL_PATTERNS = [
  ...SYNONYMS.map(([raw, canonical]) => ({ raw, canonical })),
  ...CANONICAL_SUBJECTS.map((name) => ({ raw: name, canonical: name })),
].sort((a, b) => b.raw.length - a.raw.length);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PATTERN_REGEXES = ALL_PATTERNS.map(({ raw, canonical }) => ({
  canonical,
  // Optional trailing "s" absorbs JAMB's inconsistent pluralisation
  // ("Fine Art" vs "Fine Arts" already handled via synonym, but plain
  // canonical names like "Mathematics" already end in s naturally; this only
  // ever matches an extra literal "s" so it can't misfire).
  regex: new RegExp(`\\b${escapeRegExp(raw)}s?\\b`, "gi"),
}));

// A clause introducing an open "pick N more" pool — everything from here on
// is not a fixed requirement (see file header). The word "any" reliably
// signals this in JAMB's brochure phrasing ("any three (3) other subjects
// from", "any two (2) subjects chosen from", "Any of the three (3): 1. ...",
// "and any Chemistry, Geography, ..."), so it's treated as a hard cutoff on
// its own; "one of"/"two (2) of ..." catch the same pool phrased without
// "any" ("Mathematics and two (2) of Geography, Commerce, ...", "one of
// Biology, Chemistry and Geography" — the latter phrased with "and" rather
// than "or", which would otherwise get misread by extractSlots as N separate
// mandatory subjects).
const POOL_TRIGGER = new RegExp(
  [
    "\\bany\\b",
    "\\bone\\s+of\\b",
    "\\b(?:one|two|three|four|five)\\s*\\(\\d+\\)\\s*(?:other\\s+)?subjects?\\b",
    "\\b(?:one|two|three|four|five)\\s*\\(\\d+\\)\\s*of\\b",
    "\\b(?:one|two|three|four|five)\\s+other\\s+subjects?\\b",
    "\\bsuch as\\b",
    "\\bin place of\\b",
  ].join("|"),
  "i"
);

function coreText(text) {
  const match = POOL_TRIGGER.exec(text);
  return match ? text.slice(0, match.index) : text;
}

// Finds every canonical-subject mention in `text`, in order, without
// overlapping matches (first/longest pattern at a given position wins).
function findMentions(text) {
  const taken = new Array(text.length).fill(false);
  const mentions = [];
  for (const { canonical, regex } of PATTERN_REGEXES) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      let overlaps = false;
      for (let i = start; i < end; i += 1) {
        if (taken[i]) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        for (let i = start; i < end; i += 1) taken[i] = true;
        mentions.push({ canonical, start, end });
      }
    }
  }
  return mentions.sort((a, b) => a.start - b.start);
}

// Splits `text` into requirement "slots" on commas/and/&, treating anything
// left joined by a literal " or " (or "/") within one slot as alternatives
// for that single slot rather than separate mandatory subjects — e.g.
// "Biology/General Science or Mathematics" is one slot with alternatives
// [Biology, Mathematics], not two mandatory subjects.
function extractSlots(text) {
  const segments = text.split(/,|\band\b|&/i);
  const slots = [];
  for (const segment of segments) {
    const mentions = findMentions(segment);
    if (mentions.length === 0) continue;
    const names = [...new Set(mentions.map((m) => m.canonical))];
    slots.push(names);
  }
  return slots;
}

function cartesianCombine(slots, { cap = 8 } = {}) {
  let combos = [[]];
  for (const slot of slots) {
    const next = [];
    for (const combo of combos) {
      for (const option of slot) {
        next.push([...combo, option]);
        if (next.length >= cap) break;
      }
      if (next.length >= cap) break;
    }
    combos = next;
    if (combos.length >= cap) break;
  }
  return combos;
}

/**
 * Parses a programme's JAMB "subjects" field (the UTME subject requirement)
 * into one or more acceptable subject combinations, each including the
 * UTME-compulsory "English Language" (JAMB's text virtually never restates
 * it since every candidate already sits it). Returns [] if nothing reliable
 * could be extracted (empty text, or the whole thing was an open pool like
 * "Any three (3) subjects from Arts/Social Science/Physical Science").
 */
function parseUtmeSubjectCombinations(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const slots = extractSlots(coreText(text));
  if (slots.length === 0) return [];

  const combos = cartesianCombine(slots).map((combo) => {
    const set = new Set(combo);
    if (![...set].some((s) => s.toLowerCase() === "english language")) set.add("English Language");
    return [...set];
  });

  // De-duplicate identical combos (common when every slot has only one option).
  const seen = new Set();
  const unique = [];
  for (const combo of combos) {
    const key = [...combo].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(combo);
  }
  return unique;
}

/**
 * Parses a programme's JAMB "utme_requirements" field (the O'Level credit
 * requirement) into a required-subjects list and a minimum-credit count.
 * OR-alternative slots are dropped, not forced mandatory (see file header) —
 * only unambiguous singleton subjects are ever returned as required.
 */
function parseOlevelRequirement(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return null;

  const slots = extractSlots(coreText(text));
  const requiredSubjects = [...new Set(slots.filter((slot) => slot.length === 1).map((slot) => slot[0]))];

  const creditMatch = text.match(
    /\b(one|two|three|four|five|six|seven|eight|nine)\s*\((\d)\)/i
  );
  const minimumCredits = creditMatch ? Number(creditMatch[2]) : null;

  if (requiredSubjects.length === 0 && minimumCredits === null) return null;
  return { requiredSubjects, minimumCredits };
}

module.exports = {
  CANONICAL_SUBJECTS,
  parseUtmeSubjectCombinations,
  parseOlevelRequirement,
};
