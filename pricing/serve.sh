#!/usr/bin/env bash
# Build (if needed) and run the pricing service on :8000, attached to the
# mobile Supabase network when it exists so edge functions can reach it.
set -euo pipefail
cd "$(dirname "$0")"

NAME=animo-pricing-service

docker image inspect "$NAME" >/dev/null 2>&1 || {
  echo "Image missing — building…"
  docker build -t "$NAME" .
}

docker rm -f "$NAME" >/dev/null 2>&1 || true

network_args=()
if docker network inspect supabase_network_mobile >/dev/null 2>&1; then
  network_args=(--network supabase_network_mobile)
  echo "Attached to supabase_network_mobile (edge functions can reach $NAME:8000)"
else
  echo "Note: supabase_network_mobile not found — start mobile Supabase first, then:"
  echo "      docker network connect supabase_network_mobile $NAME"
fi

docker run -d --name "$NAME" "${network_args[@]}" -p 8000:8000 "$NAME"

echo "Waiting for health…"
for _ in $(seq 1 30); do
  if curl -sf http://localhost:8000/health; then
    echo
    echo "Pricing service up on http://localhost:8000"
    exit 0
  fi
  sleep 1
done
echo "Container started but /health not ready — check: docker logs $NAME" >&2
exit 1
