#!/bin/sh
set -e

echo "[entrypoint] Waiting for the database to accept connections..."
attempt=1
max_attempts=20

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[entrypoint] Database still unreachable after $max_attempts attempts. Giving up."
    exit 1
  fi
  echo "[entrypoint] Migration attempt $attempt failed; retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "[entrypoint] Migrations applied."

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] Seeding demo data..."
  node dist-seed/seed.js
fi

echo "[entrypoint] Starting API..."
exec node dist/main.js
