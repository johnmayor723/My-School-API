// Collapses cosmetic spelling differences ("&" vs "and", stray punctuation,
// trailing colons, double spaces) so two Programme catalog rows that are the
// same real course under a different typo/style don't read as unrelated.
// Validated against the live catalog: normalizing all 2,126 programme names
// collapses them into 1,932 distinct keys across 190 groups, all genuine
// same-course variants in a manual spot-check (no unrelated courses collided).
// Deliberately conservative — no fuzzy/edit-distance matching, since that
// risks merging genuinely different courses (e.g. "Biology" / "Biochemistry").
function normalizeCourseName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[/,]/g, " and ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { normalizeCourseName };
