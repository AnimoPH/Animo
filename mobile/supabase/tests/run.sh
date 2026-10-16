#!/usr/bin/env bash
# Runs the lab tests in tests/[0-9]*.sql against the local Supabase database.
# Every file runs in its own transaction that is rolled back, so nothing is
# kept. Migrations the local database has not applied yet are applied inside
# that transaction first, so the tests always run against the current schema.
#
#   cd mobile/supabase && ./tests/run.sh [test-file.sql ...]
#
# A test file can start with "-- requires: 0042" and is skipped, not failed,
# while that migration is not in migrations/ yet.
#
# Needs the local stack (npx supabase start). Set SUPABASE_DB_CONTAINER if the
# container is not named supabase_db_mobile. Never run this against hosted.
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_mobile}"
psql_admin() { docker exec -i "$CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 "$@"; }

applied="$(docker exec "$CONTAINER" psql -U postgres -Atc 'select version from supabase_migrations.schema_migrations')"
pending=""
for f in migrations/*.sql; do
  version="$(basename "$f" | cut -d_ -f1)"
  if ! grep -qx "$version" <<<"$applied" && ! grep -qx "$((10#$version))" <<<"$applied"; then
    pending="$pending $f"
  fi
done

files=("$@")
[ ${#files[@]} -eq 0 ] && files=(tests/[0-9]*.sql)

total_pass=0; total_fail=0
for t in "${files[@]}"; do
  [ "$(basename "$t")" = "00_fixtures.sql" ] && continue
  need="$(sed -n 's/^-- requires: *\([0-9]*\).*/\1/p' "$t" | head -1)"
  if [ -n "$need" ] && ! ls migrations/"$need"_*.sql >/dev/null 2>&1; then
    echo "== $(basename "$t"): SKIPPED (needs migration $need)"
    continue
  fi
  out="$({ echo 'begin;'; [ -n "$pending" ] && cat $pending; cat tests/00_fixtures.sql "$t"; echo 'rollback;'; } | psql_admin 2>&1 || true)"
  pass="$(grep -c 'NOTICE:  PASS' <<<"$out" || true)"
  fail="$(grep -cE 'ERROR:|FAIL' <<<"$out" || true)"
  echo "== $(basename "$t"): $pass passed, $fail failed"
  grep -E 'NOTICE:  PASS' <<<"$out" | sed 's/^.*NOTICE:  /   /'
  if [ "$fail" -gt 0 ]; then grep -E 'ERROR:|FAIL|DETAIL|CONTEXT' <<<"$out" | sed 's/^/   /'; fi
  total_pass=$((total_pass + pass)); total_fail=$((total_fail + fail))
done
echo "-- total: $total_pass passed, $total_fail failed"
[ "$total_fail" -eq 0 ]
