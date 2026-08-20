const { OLEVEL_GRADE_SCALE } = require("../../../config/constants");

function normalize(subject) {
  return String(subject || "").trim().toLowerCase();
}

/**
 * Evaluates the student's O'Level results against a rule's required subjects,
 * minimum grade and minimum credit count. Mandatory.
 */
function evaluateOlevel(studentOLevelSubjects, studentSittings, olevelRule) {
  if (!Array.isArray(studentOLevelSubjects) || studentOLevelSubjects.length === 0) {
    return {
      passed: false,
      hasData: false,
      message: "No O'Level results were provided, so O'Level eligibility could not be confirmed.",
      warnings: [],
    };
  }

  const acceptedExamTypes = new Set(olevelRule.acceptedExaminations || []);
  const minRank = OLEVEL_GRADE_SCALE[olevelRule.minimumGrade] ?? OLEVEL_GRADE_SCALE.C6;

  const warnings = [];
  const eligibleEntries = studentOLevelSubjects.filter((entry) => {
    if (acceptedExamTypes.size > 0 && entry.examType && !acceptedExamTypes.has(entry.examType)) return false;
    return true;
  });
  if (eligibleEntries.length < studentOLevelSubjects.length) {
    warnings.push("Some of your listed O'Level results are from an examination type this programme does not accept and were not counted.");
  }

  // Best (lowest-rank) grade per subject, in case of repeats/multiple sittings.
  const bestGradeBySubject = new Map();
  for (const entry of eligibleEntries) {
    const key = normalize(entry.subject);
    const rank = OLEVEL_GRADE_SCALE[String(entry.grade || "").toUpperCase()];
    if (rank === undefined) continue;
    const current = bestGradeBySubject.get(key);
    if (current === undefined || rank < current) bestGradeBySubject.set(key, rank);
  }

  const requiredSubjects = olevelRule.requiredSubjects || [];
  const missingSubjects = requiredSubjects.filter((subject) => {
    const rank = bestGradeBySubject.get(normalize(subject));
    return rank === undefined || rank > minRank;
  });

  const totalCredits = Array.from(bestGradeBySubject.values()).filter((rank) => rank <= minRank).length;
  const requiredSubjectsSatisfied = missingSubjects.length === 0;
  const creditsSatisfied = totalCredits >= olevelRule.minimumCredits;
  const passed = requiredSubjectsSatisfied && creditsSatisfied;

  if (olevelRule.sittingsAllowed && studentSittings && studentSittings > olevelRule.sittingsAllowed) {
    warnings.push(
      `This programme accepts O'Level results from at most ${olevelRule.sittingsAllowed} sitting(s); you indicated ${studentSittings}.`
    );
  }

  const messages = [];
  if (requiredSubjectsSatisfied) {
    messages.push(`Your O'Level results satisfy the required subjects at ${olevelRule.minimumGrade} or better.`);
  } else {
    messages.push(`Your O'Level results do not yet satisfy these required subjects at ${olevelRule.minimumGrade} or better: ${missingSubjects.join(", ")}.`);
  }
  if (!creditsSatisfied) {
    messages.push(`This programme requires at least ${olevelRule.minimumCredits} credits at ${olevelRule.minimumGrade} or better; you currently have ${totalCredits}.`);
  }

  return {
    passed,
    hasData: true,
    missingSubjects,
    totalCredits,
    requiredCredits: olevelRule.minimumCredits,
    requiredSubjectsCount: requiredSubjects.length,
    satisfiedSubjectsCount: requiredSubjects.length - missingSubjects.length,
    message: messages.join(" "),
    warnings,
  };
}

module.exports = { evaluateOlevel };
