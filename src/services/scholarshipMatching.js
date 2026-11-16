// Small, explainable rule-based filter -- not a new scoring system, consistent
// with the matching engine's own "never invent certainty" idiom (see
// matchingEngine.js). Every kept scholarship is annotated with which criteria
// actually matched, so nothing is silently invented for the student.

const UNDERGRADUATE_LEVEL_STRINGS = ["undergraduate", "ug", "bachelor", "bachelor's", "first degree", "100 level", "nd", "hnd"];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function fuzzyIncludes(haystack, needle) {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!h || !n) return false;
  return h.includes(n) || n.includes(h);
}

function matchesFieldOfStudy(scholarship, profile) {
  const fields = scholarship.fieldsOfStudy || [];
  if (fields.length === 0) return { matched: true, reason: "open to all fields of study" };

  const candidates = [profile.programmeName, profile.facultyName, profile.desiredCareer, ...(profile.interests || [])].filter(Boolean);

  for (const field of fields) {
    for (const candidate of candidates) {
      if (fuzzyIncludes(field, candidate)) {
        return { matched: true, reason: `field of study "${field}" matches "${candidate}"` };
      }
    }
  }
  return { matched: false };
}

function matchesLocation(scholarship, profile) {
  const locations = scholarship.eligibleLocations || [];
  if (locations.length === 0) return { matched: true, reason: "no location restriction" };

  const normalizedLocations = locations.map(normalize);
  if (normalizedLocations.includes("nigeria")) {
    return { matched: true, reason: "open to all of Nigeria" };
  }

  const candidates = [profile.stateOfOrigin, profile.residentialState, ...(profile.preferredStates || [])].filter(Boolean);
  for (const candidate of candidates) {
    if (normalizedLocations.includes(normalize(candidate))) {
      return { matched: true, reason: `eligible location matches "${candidate}"` };
    }
  }
  return { matched: false };
}

function matchesStudyLevel(scholarship) {
  const levels = scholarship.studyLevels || [];
  if (levels.length === 0) return { matched: true, reason: "no study-level restriction" };

  const matchedLevel = levels.find((level) => UNDERGRADUATE_LEVEL_STRINGS.some((ug) => fuzzyIncludes(level, ug)));
  if (matchedLevel) return { matched: true, reason: `study level "${matchedLevel}" covers undergraduates` };
  return { matched: false };
}

function deadlineSortValue(scholarship) {
  if (!scholarship.deadline) return Number.POSITIVE_INFINITY; // no deadline sorts last
  const parsed = new Date(scholarship.deadline).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function buildProfileContext(studentProfile, programme) {
  return {
    programmeName: programme?.name,
    facultyName: programme?.faculty,
    desiredCareer: studentProfile.desiredCareer,
    interests: studentProfile.interests,
    stateOfOrigin: studentProfile.stateOfOrigin,
    residentialState: studentProfile.residentialState,
    preferredStates: studentProfile.preferredStates,
  };
}

// scholarships: the raw list already fetched via scholarshipService.client.js#listScholarships
function personalize(scholarships, studentProfile, programme) {
  const profile = buildProfileContext(studentProfile, programme);

  const annotated = scholarships
    .map((scholarship) => {
      const fieldMatch = matchesFieldOfStudy(scholarship, profile);
      const locationMatch = matchesLocation(scholarship, profile);
      const levelMatch = matchesStudyLevel(scholarship);

      if (!fieldMatch.matched || !locationMatch.matched || !levelMatch.matched) return null;

      return {
        ...scholarship,
        matchedCriteria: [fieldMatch.reason, locationMatch.reason, levelMatch.reason].filter(Boolean),
      };
    })
    .filter(Boolean);

  annotated.sort((a, b) => deadlineSortValue(a) - deadlineSortValue(b));
  return annotated;
}

module.exports = { personalize };
