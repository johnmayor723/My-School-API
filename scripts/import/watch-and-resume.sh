#!/bin/bash
# Cron watchdog for the JAMB catalog import: restarts jamb-import.js if it's
# not running and hasn't finished (the script is resumable/idempotent, so
# restarting mid-run is safe), and applies competitiveness tiers exactly once
# after a completed run. Meant to run every few minutes via crontab so the
# import survives interactive sessions ending.
set -euo pipefail
cd "$(dirname "$0")/../.."

CACHE_DIR="scripts/import/cache"
COMPLETE_MARKER="$CACHE_DIR/.import-complete"
TIER_MARKER="scripts/tiers/.reapplied-after-import"
LOG="scripts/import/cron.log"

if pgrep -f "node scripts/import/jamb-import.js" > /dev/null; then
  exit 0
fi

if [ -f "$COMPLETE_MARKER" ]; then
  if [ ! -f "$TIER_MARKER" ]; then
    echo "$(date -Is) import complete, applying tiers" >> "$LOG"
    node scripts/tiers/apply-competitiveness-tiers.js >> "$LOG" 2>&1
    touch "$TIER_MARKER"
  fi
  exit 0
fi

echo "$(date -Is) import not running and not complete, restarting" >> "$LOG"
nohup node scripts/import/jamb-import.js >> "$LOG" 2>&1 &
