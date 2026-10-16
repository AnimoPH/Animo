#!/usr/bin/env bash
# Shows Advance Cut, Delayed Harvest and No Action Needed on demand for ONE crop
# cycle, by swapping the rain that refresh-advisory sees. The rule and the
# ripeness are real. Only the rain is chosen here. Meant for the defense demo.
#
# Before the demo (once):
#   1. Log a crop for the demo farmer in the app (Itala ang Taniman). For
#      Advance Cut the planting date must be at least 102 days ago for Inbred
#      or Organic (94 for Hybrid, 104 for Specialty). A planting date closer
#      to today gives Delayed Harvest. The date picker allows past dates.
#   2. Turn the switch on:   npx supabase secrets set ADVISORY_FIXTURES_ENABLED=true
#      and redeploy once:    npx supabase functions deploy refresh-advisory --no-verify-jwt
#   3. Find the crop cycle id (Supabase table editor, table cropcycle).
#
# Use (the service role key is read from the environment, never stored here):
#   export SUPABASE_URL=https://<project-ref>.supabase.co
#   export SERVICE_ROLE_KEY=...
#   ./scripts/advisory-demo.sh advance <cropcycle_id>    # 9 mm/h  -> Advance Cut if 85% ripe, else Delayed Harvest
#   ./scripts/advisory-demo.sh delayed <cropcycle_id>    # 9 mm/h  -> same call, use a crop below 85%
#   ./scripts/advisory-demo.sh none <cropcycle_id>       # 2 mm/h  -> No Action Needed
#   ./scripts/advisory-demo.sh rain <mm_per_hour> <cropcycle_id>
#   ./scripts/advisory-demo.sh reset <cropcycle_id>      # back to the real forecast now
#
# What changes: one weather_forecast_feed row with the chosen rain (the LGU
# dashboard shows it too until the next real run, every 6 hours at 00, 06, 12
# and 18 UTC) and today's advisory for that crop. After the demo turn it off:
#   npx supabase secrets unset ADVISORY_FIXTURES_ENABLED
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SERVICE_ROLE_KEY:?set SERVICE_ROLE_KEY}"

call() {
  curl -sS -X POST "${SUPABASE_URL%/}/functions/v1/refresh-advisory" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$1" | { python3 -m json.tool 2>/dev/null || cat; }
}

fixture() { call "{\"fixture\":{\"cropcycle_id\":\"$2\",\"precipitation_mm_h\":$1}}"; }

case "${1:-}" in
  advance|delayed) fixture 9 "${2:?crop cycle id}" ;;
  none) fixture 2 "${2:?crop cycle id}" ;;
  rain) fixture "${2:?mm per hour}" "${3:?crop cycle id}" ;;
  reset) call "{\"reset\":true,\"cropcycle_id\":\"${2:?crop cycle id}\"}" ;;
  *) sed -n '2,32p' "$0"; exit 1 ;;
esac
