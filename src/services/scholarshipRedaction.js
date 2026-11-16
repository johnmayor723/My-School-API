// Free scholarship matching stays free, but the exact application link and
// deadline date are the paid part -- a student needs an active session pass
// (either track; scholarship assistance isn't domestic/international-
// specific) to see them. `status` (open/upcoming/closed/...) already
// conveys the urgency bucket without the exact date, so nothing is lost for
// an unlocked-but-not-yet-paid caller beyond those two fields.
function redact(scholarship, unlocked) {
  // `locked` is explicit rather than inferred from missing fields client-side
  // -- some scholarships genuinely have no confirmed deadline/application_url
  // yet (see scholarship-service's own review_required/unconfirmed states),
  // and that's a different story to tell a student than "pay to see this".
  if (unlocked) return { ...scholarship, locked: false };
  const { application_url, deadline, ...rest } = scholarship;
  return { ...rest, locked: true };
}

function redactList(scholarships, unlocked) {
  return scholarships.map((s) => redact(s, unlocked));
}

module.exports = { redact, redactList };
