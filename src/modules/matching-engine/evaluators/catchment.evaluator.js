const { zoneForState } = require("../../../config/geopoliticalZones");
const { CATCHMENT_STATUS } = require("../../../config/constants");

/**
 * Classifies a student against an institution as MERIT or CATCHMENT, based on
 * JAMB's real criterion — state of origin, not residential address. Purely
 * informational: this never feeds matchScore (see the design note in
 * matchingEngine.js) because real catchment cutoff deltas aren't published
 * consistently enough to encode a number here. ELDS is deliberately not
 * classified yet — it's a specific JAMB-designated state list, not derivable
 * from geopolitical zone, and isn't verified in this codebase yet.
 */
function evaluateCatchment(stateOfOrigin, institution) {
  if (!stateOfOrigin) {
    return {
      catchmentStatus: CATCHMENT_STATUS.UNKNOWN,
      hasData: false,
      message: "State of origin was not provided, so catchment status could not be determined.",
    };
  }

  const catchmentStates = institution?.metadata?.catchmentStates;
  if (Array.isArray(catchmentStates) && catchmentStates.length > 0) {
    const inCatchment = catchmentStates.some(
      (state) => state.trim().toLowerCase() === stateOfOrigin.trim().toLowerCase()
    );
    return {
      catchmentStatus: inCatchment ? CATCHMENT_STATUS.CATCHMENT : CATCHMENT_STATUS.MERIT,
      hasData: true,
      message: inCatchment
        ? `${stateOfOrigin} is on this institution's own catchment list.`
        : `${stateOfOrigin} is not on this institution's own catchment list, so this falls under merit.`,
    };
  }

  const studentZone = zoneForState(stateOfOrigin);
  const institutionZone = institution?.zone;
  if (!studentZone || !institutionZone) {
    return {
      catchmentStatus: CATCHMENT_STATUS.UNKNOWN,
      hasData: false,
      message: "Catchment status could not be determined — state of origin or institution zone was not recognized.",
    };
  }

  const inCatchment = studentZone === institutionZone;
  return {
    catchmentStatus: inCatchment ? CATCHMENT_STATUS.CATCHMENT : CATCHMENT_STATUS.MERIT,
    hasData: true,
    message: inCatchment
      ? `${stateOfOrigin} shares this institution's geopolitical zone, so this falls under catchment (zone-based default — this institution hasn't set its own catchment list).`
      : `${stateOfOrigin} is outside this institution's geopolitical zone, so this falls under merit (zone-based default — this institution hasn't set its own catchment list).`,
  };
}

module.exports = { evaluateCatchment };
