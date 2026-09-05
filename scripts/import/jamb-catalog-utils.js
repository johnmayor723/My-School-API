/**
 * Institution-name reconstruction logic shared between jamb-import.js (which
 * writes Institution/Programme docs) and parse-jamb-requirements.js (which
 * needs to map the cached requirements files back to those same docs without
 * re-fetching anything). Both must derive identical names from the same raw
 * JAMB institution record, so this lives in one place instead of two.
 */

const MINOR_WORDS = new Set(["of", "and", "the", "in", "for", "at"]);

function properCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (i !== 0 && MINOR_WORDS.has(word)) return word;
      return word
        .split(/([-/])/)
        .map((w) => (w && w !== "-" && w !== "/" ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join("");
    })
    .join(" ");
}

function classifyInstitutionType(title) {
  const t = title.toUpperCase();
  if (t.includes("COLLEGE OF EDUCATION")) return "college_of_education";
  if (t.includes("POLYTECHNIC") || t.includes("MONOTECHNIC")) return "polytechnic";
  if (t.includes("UNIVERSITY") || t.includes("UNIVERSITI")) return "university";
  return null;
}

function parseNameAndTown(title) {
  const parts = title.split(",").map((p) => p.trim());
  const name = properCase(parts[0]);
  const town = parts.length >= 3 ? properCase(parts[1]) : undefined;
  return { name, town };
}

/**
 * Some JAMB titles put the distinguishing town in a later comma-separated
 * segment rather than in the institution-name segment itself (e.g. "FEDERAL
 * COLLEGE OF EDUCATION, KANO, ..." vs "..., OBUDU, ..." both reduce to the
 * bare name "Federal College of Education") — so genuinely different
 * institutions in different states can collapse onto the same parsed name.
 * Precomputes which parsed names are ambiguous (map to more than one state)
 * so those can be disambiguated with the state appended, symmetrically for
 * every institution sharing the name — not just the second one encountered.
 */
function findAmbiguousNames(rawInstitutions) {
  const statesByName = new Map();
  for (const raw of rawInstitutions) {
    if (!classifyInstitutionType(raw.title) || !raw.state) continue;
    const { name } = parseNameAndTown(raw.title);
    if (!statesByName.has(name)) statesByName.set(name, new Set());
    statesByName.get(name).add(raw.state);
  }
  return new Set([...statesByName.entries()].filter(([, states]) => states.size > 1).map(([name]) => name));
}

// The exact resolved DB name for a raw JAMB institution record, matching
// what upsertInstitution() in jamb-import.js would have written.
function resolvedInstitutionName(raw, ambiguousNames) {
  const { name: parsedName } = parseNameAndTown(raw.title);
  return ambiguousNames.has(parsedName) ? `${parsedName} (${raw.state})` : parsedName;
}

module.exports = {
  MINOR_WORDS,
  properCase,
  classifyInstitutionType,
  parseNameAndTown,
  findAmbiguousNames,
  resolvedInstitutionName,
};
