#!/bin/bash
# Runs during `docker build` to pre-migrate Canvas databases.
# Starts PostgreSQL temporarily, creates DBs, runs migrations, then stops.
# The resulting data directory is captured in the image layer.
set -euo pipefail

APP_HOME="/usr/src/app"
DB_HOST="localhost"
DB_USER="canvas"
DB_PASS="canvas"
ENCRYPTION_KEY="e2e-encryption-key-32chars-here!!"

log() { echo "[db-init] $*"; }

# Run a command as the docker user, preserving the Dockerfile ENV vars
# (PATH, GEM_HOME, BUNDLE_APP_CONFIG etc.) via su -m.
run_as_docker() {
  HOME=/home/docker \
  CANVAS_DATABASE_HOST="${DB_HOST}" \
  CANVAS_DATABASE_USERNAME="${DB_USER}" \
  POSTGRES_PASSWORD="${DB_PASS}" \
  ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
    su -m docker -s /bin/bash -c "cd '${APP_HOME}' && $*"
}

# ── Start PostgreSQL ──────────────────────────────────────────────────────────
log "Starting PostgreSQL..."
su -s /bin/bash postgres -c "pg_ctlcluster 14 main start"

log "Waiting for PostgreSQL to accept connections..."
until su -s /bin/bash postgres -c "pg_isready -q -h ${DB_HOST}"; do
  sleep 1
done
log "PostgreSQL is ready."

# ── Bootstrap roles and databases ────────────────────────────────────────────
log "Creating canvas role and databases..."

su -s /bin/bash postgres -c "psql -h ${DB_HOST} -c \"
  DO \\\$\\\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN SUPERUSER PASSWORD '${DB_PASS}';
    END IF;
  END
  \\\$\\\$;
\""

# pg_trgm on template1 so all future databases inherit it
su -s /bin/bash postgres -c \
  "psql -h ${DB_HOST} -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;' template1"

for db in canvas_development canvas_test; do
  su -s /bin/bash postgres -c \
    "psql -h ${DB_HOST} -tc \"SELECT 1 FROM pg_database WHERE datname = '${db}'\" | grep -q 1 \
     || createdb -h ${DB_HOST} -O ${DB_USER} ${db}"
done

# ── Run Canvas migrations ─────────────────────────────────────────────────────
log "Running Canvas migrations (this takes a while)..."

log "Migrating canvas_development..."
RAILS_ENV=development run_as_docker "bundle exec rails db:migrate"

log "Migrating canvas_test..."
RAILS_ENV=test run_as_docker "bundle exec rails db:migrate"

# Seed the development database so Canvas has a root account
log "Seeding canvas_development..."
RAILS_ENV=development run_as_docker "bundle exec rails db:seed" \
  || log "db:seed skipped or already seeded (non-fatal)"

# ── Stop PostgreSQL ───────────────────────────────────────────────────────────
log "Stopping PostgreSQL..."
su -s /bin/bash postgres -c "pg_ctlcluster 14 main stop"

log "Database initialisation complete."
