#!/usr/bin/env bash
# Starts the ANIMO pricing microservice locally and exposes it via a Cloudflare
# quick tunnel, then updates the PRICING_SERVICE_URL edge-function secret so
# get-market-status / get-price-prediction / refresh-dry-base can reach it.
# Usage: ./start-tunnel.sh [project-ref]
set -euo pipefail

PROJECT_REF="${1:-odkygkehdlfyftiohkmy}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$SCRIPT_DIR/../mobile"
LOG_FILE="/tmp/animo-cloudflared.log"
CONTAINER_NAME="animo-pricing-service"

echo "==> Building pricing service image"
docker build -t "$CONTAINER_NAME" "$SCRIPT_DIR"

echo "==> Starting pricing service container"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER_NAME" -p 8000:8000 "$CONTAINER_NAME" >/dev/null

echo "==> Waiting for pricing service to become healthy (model loading takes ~15-30s)"
for i in $(seq 1 30); do
  if curl -sS --max-time 2 http://localhost:8000/health >/dev/null 2>&1; then
    echo "    healthy after ${i}s"
    break
  fi
  sleep 1
done
curl -sS http://localhost:8000/health || { echo "Pricing service never became healthy"; exit 1; }
echo

echo "==> Starting Cloudflare quick tunnel"
pkill -f "cloudflared tunnel --url http://localhost:8000" 2>/dev/null || true
sleep 1
nohup cloudflared tunnel --url http://localhost:8000 > "$LOG_FILE" 2>&1 &
echo "    cloudflared pid: $!"

echo "==> Waiting for tunnel URL to appear in logs"
TUNNEL_URL=""
for i in $(seq 1 20); do
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1 || true)
  [ -n "$TUNNEL_URL" ] && break
  sleep 1
done
[ -n "$TUNNEL_URL" ] || { echo "Tunnel URL never appeared, check $LOG_FILE"; exit 1; }
echo "    $TUNNEL_URL"

echo "==> Verifying tunnel is externally reachable (via Cloudflare DoH, bypasses local DNS quirks)"
for i in $(seq 1 15); do
  if curl -sS --max-time 5 --doh-url https://1.1.1.1/dns-query "$TUNNEL_URL/health" 2>/dev/null | grep -q '"status":"ok"'; then
    echo "    reachable after ${i}s"
    break
  fi
  sleep 2
done
curl -sS --doh-url https://1.1.1.1/dns-query "$TUNNEL_URL/health" | grep -q '"status":"ok"' \
  || { echo "Tunnel not reachable externally, check $LOG_FILE"; exit 1; }
echo

echo "==> Updating PRICING_SERVICE_URL secret (project: $PROJECT_REF)"
(cd "$MOBILE_DIR" && npx supabase secrets set "PRICING_SERVICE_URL=$TUNNEL_URL" --project-ref "$PROJECT_REF")

echo
echo "==> Done. Pricing service is live at: $TUNNEL_URL"
echo "    Keep this terminal/machine running for the duration of the demo/defense."
echo "    Tunnel log: $LOG_FILE"
echo "    To stop: docker rm -f $CONTAINER_NAME && pkill -f 'cloudflared tunnel --url http://localhost:8000'"
