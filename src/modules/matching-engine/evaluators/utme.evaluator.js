function normalize(subject) {
  return String(subject || "").trim().toLowerCase();
}

/**
 * Evaluates the student's UTME score against a rule's minimum requirement.
 * Mandatory: a student below the recorded minimum cannot be a strong/possible match.
 */
function evaluateUtmeScore(studentScore, utmeRule) {
  if (studentScore === undefined || studentScore === null) {
    return {
      passed: false,
      hasData: false,
      message: "No UTME score was provided, so UTME eligibility could not be confirmed.",
    };
  }

  const passed = studentScore >= utmeRule.minimumScore;
  return {
    passed,
    hasData: true,
    studentScore,
    minimumScore: utmeRule.minimumScore,
    message: passed
      ? `Your UTME score of ${studentScore} meets the recorded minimum requirement of ${utmeRule.minimumScore}.`
      : `Your UTME score of ${studentScore} is below the recorded minimum requirement of ${utmeRule.minimumScore}.`,
  };
}

/**
 * Evaluates the student's UTME subjects against the rule's required combination,
 * or any of its accepted alternative combinations.
 */
function evaluateUtmeSubjects(studentSubjects, utmeRule) {
  const combos = [utmeRule.requiredSubjects, ...(utmeRule.subjectCombinations || [])].filter(
    (combo) => Array.isArray(combo) && combo.length > 0
  );

  if (!Array.isArray(studentSubjects) || studentSubjects.length === 0) {
    return {
      passed: false,
      hasData: false,
      message: "No UTME subject combination was provided, so subject eligibility could not be confirmed.",
    };
  }

  const studentSet = new Set(studentSubjects.map(normalize));

  let bestCombo = null;
  let bestMissing = null;
  for (const combo of combos) {
    const missing = combo.filter((subject) => !studentSet.has(normalize(subject)));
    if (missing.length === 0) {
      bestCombo = combo;
      bestMissing = [];
      break;
    }
    if (!bestMissing || missing.length < bestMissing.length) {
      bestCombo = combo;
      bestMissing = missing;
    }
  }

  const passed = bestMissing !== null && bestMissing.length === 0;
  const requiredCount = bestCombo ? bestCombo.length : utmeRule.requiredSubjects.length;
  const matchedCount = requiredCount - (bestMissing ? bestMissing.length : requiredCount);

  return {
    passed,
    hasData: true,
    matchedFraction: requiredCount > 0 ? matchedCount / requiredCount : 0,
    missingSubjects: bestMissing || [],
    message: passed
      ? `Your listed UTME subjects satisfy the required subject combination (${(bestCombo || utmeRule.requiredSubjects).join(", ")}).`
      : `Your listed UTME subjects do not include: ${(bestMissing || []).join(", ")}.`,
  };
}

module.exports = { evaluateUtmeScore, evaluateUtmeSubjects };
