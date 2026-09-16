#!/bin/bash
# Cron watchdog for the JAMB cutoff scrape: restarts jamb-cutoff-scrape.js if
# it's not running and hasn't finished (idempotent, so restarting mid-run is
# safe). Same shape as scripts/import/watch-and-resume.sh — meant to run
# every few minutes via crontab, e.g.:
#   */10 * * * * cd /opt/my-school-placement-api && bash scripts/cutoffs/watch-and-resume.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

CACHE_DIR="scripts/cutoffs/cache"
COMPLETE_MARKER="$CACHE_DIR/.scrape-complete"
LOG="scripts/cutoffs/cron.log"

if pgrep -f "node scripts/cutoffs/jamb-cutoff-scrape.js" > /dev/null; then
  exit 0
fi

if [ -f "$COMPLETE_MARKER" ]; then
  exit 0
fi

mkdir -p "$CACHE_DIR"
echo "$(date -Is) scrape not running and not complete, restarting" >> "$LOG"
nohup node scripts/cutoffs/jamb-cutoff-scrape.js >> "$LOG" 2>&1 &
