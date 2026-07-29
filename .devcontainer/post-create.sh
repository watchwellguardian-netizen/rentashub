#!/usr/bin/env bash
set -euo pipefail

export ACCEL_PG005_DATABASE_URL="${ACCEL_PG005_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/rentashub_pg005_test}"
export ACCEL_PG005_CONFIRM_DISPOSABLE="${ACCEL_PG005_CONFIRM_DISPOSABLE:-true}"

if [[ "${ACCEL_PG005_DATABASE_URL}" == *"supabase.co"* || "${ACCEL_PG005_DATABASE_URL}" == *"supabase.com"* ]]; then
  echo "Refusing to use a hosted Supabase or production-like database URL for PG-006."
  exit 1
fi

npm ci

sudo service postgresql start
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'rentashub_pg005_test';" | grep -q 1 \
  || sudo -u postgres createdb rentashub_pg005_test

for migration in 001 002 003 004 005 006 007 008 009; do
  if ! find server/migrations supabase/migrations -maxdepth 1 -type f -name "${migration}_*.sql" | grep -q .; then
    echo "Missing migration ${migration}."
    exit 1
  fi
done

psql --version
supabase --version
node scripts/accel-micro-pg-005-postgres-harness.mjs detect

echo "Next PG-006 command:"
echo "node scripts/accel-micro-pg-005-postgres-harness.mjs run"
