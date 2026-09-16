// Nigeria's 36 states + FCT, grouped into the 6 standard geopolitical zones.
// This is the only classification the matching engine derives automatically —
// JAMB's real per-institution catchment list isn't always a full zone (see
// Institution.metadata.catchmentStates for the manual override), and ELDS
// (Educationally Less Developed States) isn't zone-based at all, so it's
// deliberately not modeled here yet.

const GEOPOLITICAL_ZONES = Object.freeze({
  NORTH_CENTRAL: "NORTH_CENTRAL",
  NORTH_EAST: "NORTH_EAST",
  NORTH_WEST: "NORTH_WEST",
  SOUTH_EAST: "SOUTH_EAST",
  SOUTH_SOUTH: "SOUTH_SOUTH",
  SOUTH_WEST: "SOUTH_WEST",
});

const STATE_TO_ZONE = Object.freeze({
  Benue: GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  Kogi: GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  Kwara: GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  Nasarawa: GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  Niger: GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  Plateau: GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  "FCT": GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  "FCT (Abuja)": GEOPOLITICAL_ZONES.NORTH_CENTRAL,
  "Federal Capital Territory": GEOPOLITICAL_ZONES.NORTH_CENTRAL,

  Adamawa: GEOPOLITICAL_ZONES.NORTH_EAST,
  Bauchi: GEOPOLITICAL_ZONES.NORTH_EAST,
  Borno: GEOPOLITICAL_ZONES.NORTH_EAST,
  Gombe: GEOPOLITICAL_ZONES.NORTH_EAST,
  Taraba: GEOPOLITICAL_ZONES.NORTH_EAST,
  Yobe: GEOPOLITICAL_ZONES.NORTH_EAST,

  Jigawa: GEOPOLITICAL_ZONES.NORTH_WEST,
  Kaduna: GEOPOLITICAL_ZONES.NORTH_WEST,
  Kano: GEOPOLITICAL_ZONES.NORTH_WEST,
  Katsina: GEOPOLITICAL_ZONES.NORTH_WEST,
  Kebbi: GEOPOLITICAL_ZONES.NORTH_WEST,
  Sokoto: GEOPOLITICAL_ZONES.NORTH_WEST,
  Zamfara: GEOPOLITICAL_ZONES.NORTH_WEST,

  Abia: GEOPOLITICAL_ZONES.SOUTH_EAST,
  Anambra: GEOPOLITICAL_ZONES.SOUTH_EAST,
  Ebonyi: GEOPOLITICAL_ZONES.SOUTH_EAST,
  Enugu: GEOPOLITICAL_ZONES.SOUTH_EAST,
  Imo: GEOPOLITICAL_ZONES.SOUTH_EAST,

  "Akwa Ibom": GEOPOLITICAL_ZONES.SOUTH_SOUTH,
  Bayelsa: GEOPOLITICAL_ZONES.SOUTH_SOUTH,
  "Cross River": GEOPOLITICAL_ZONES.SOUTH_SOUTH,
  Delta: GEOPOLITICAL_ZONES.SOUTH_SOUTH,
  Edo: GEOPOLITICAL_ZONES.SOUTH_SOUTH,
  Rivers: GEOPOLITICAL_ZONES.SOUTH_SOUTH,

  Ekiti: GEOPOLITICAL_ZONES.SOUTH_WEST,
  Lagos: GEOPOLITICAL_ZONES.SOUTH_WEST,
  Ogun: GEOPOLITICAL_ZONES.SOUTH_WEST,
  Ondo: GEOPOLITICAL_ZONES.SOUTH_WEST,
  Osun: GEOPOLITICAL_ZONES.SOUTH_WEST,
  Oyo: GEOPOLITICAL_ZONES.SOUTH_WEST,
});

function normalizeStateName(state) {
  return String(state || "").trim();
}

/**
 * Resolves a Nigerian state (or "FCT") to its geopolitical zone.
 * Returns undefined for unrecognized input rather than guessing.
 */
function zoneForState(state) {
  return STATE_TO_ZONE[normalizeStateName(state)];
}

module.exports = { GEOPOLITICAL_ZONES, STATE_TO_ZONE, zoneForState };
