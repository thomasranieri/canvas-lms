#!/bin/bash
# Runs during `docker build` to pre-migrate Canvas databases.
# Starts PostgreSQL temporarily, creates DBs, runs migrations, then stops.
# The resulting data directory is captured in the image layer.
set -euo pipefail

RUBY="3.4"
PG_VERSION="16"
APP_HOME="/usr/src/app"
GEM_HOME="/home/docker/.gem/${RUBY}"
BUNDLE_APP_CONFIG="/home/docker/.bundle"
DB_HOST="localhost"
DB_USER="canvas"
DB_PASS="canvas"
ENCRYPTION_KEY="integrationtestencryptionkey00000000000000000000000000000000000"

log() { echo "[db-init] $*"; }

# ── Start PostgreSQL ──────────────────────────────────────────────────────────
log "Starting PostgreSQL..."
su -s /bin/bash postgres -c "pg_ctlcluster ${PG_VERSION} main start"

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

run_as_docker() {
  su -s /bin/bash docker -c "
    export HOME='/home/docker'
    export GEM_HOME='${GEM_HOME}'
    export PATH='${APP_HOME}/bin:${GEM_HOME}/bin:/usr/local/bin:\$PATH'
    export BUNDLE_APP_CONFIG='${BUNDLE_APP_CONFIG}'
    export CANVAS_DATABASE_HOST='${DB_HOST}'
    export CANVAS_DATABASE_USERNAME='${DB_USER}'
    export POSTGRES_PASSWORD='${DB_PASS}'
    export ENCRYPTION_KEY='${ENCRYPTION_KEY}'
    export RAILS_ENV='\$1'
    cd '${APP_HOME}'
    bundle exec rails db:migrate 2>&1
  " -- "$@"
}

log "Migrating canvas_development..."
RAILS_ENV=development su -s /bin/bash docker -c "
  export HOME='/home/docker'
  export GEM_HOME='${GEM_HOME}'
  export PATH='${APP_HOME}/bin:${GEM_HOME}/bin:/usr/local/bin:\$PATH'
  export BUNDLE_APP_CONFIG='${BUNDLE_APP_CONFIG}'
  export CANVAS_DATABASE_HOST='${DB_HOST}'
  export CANVAS_DATABASE_USERNAME='${DB_USER}'
  export POSTGRES_PASSWORD='${DB_PASS}'
  export ENCRYPTION_KEY='${ENCRYPTION_KEY}'
  export RAILS_ENV='development'
  cd '${APP_HOME}'
  bundle exec rails db:migrate
"

log "Migrating canvas_test..."
su -s /bin/bash docker -c "
  export HOME='/home/docker'
  export GEM_HOME='${GEM_HOME}'
  export PATH='${APP_HOME}/bin:${GEM_HOME}/bin:/usr/local/bin:\$PATH'
  export BUNDLE_APP_CONFIG='${BUNDLE_APP_CONFIG}'
  export CANVAS_DATABASE_HOST='${DB_HOST}'
  export CANVAS_DATABASE_USERNAME='${DB_USER}'
  export POSTGRES_PASSWORD='${DB_PASS}'
  export ENCRYPTION_KEY='${ENCRYPTION_KEY}'
  export RAILS_ENV='test'
  cd '${APP_HOME}'
  bundle exec rails db:migrate
"

# Seed the development database so Canvas has a root account
log "Seeding canvas_development..."
su -s /bin/bash docker -c "
  export HOME='/home/docker'
  export GEM_HOME='${GEM_HOME}'
  export PATH='${APP_HOME}/bin:${GEM_HOME}/bin:/usr/local/bin:\$PATH'
  export BUNDLE_APP_CONFIG='${BUNDLE_APP_CONFIG}'
  export CANVAS_DATABASE_HOST='${DB_HOST}'
  export CANVAS_DATABASE_USERNAME='${DB_USER}'
  export POSTGRES_PASSWORD='${DB_PASS}'
  export ENCRYPTION_KEY='${ENCRYPTION_KEY}'
  export RAILS_ENV='development'
  cd '${APP_HOME}'
  bundle exec rails db:seed
" || log "db:seed skipped or already seeded (non-fatal)"

# ── Stop PostgreSQL ───────────────────────────────────────────────────────────
log "Stopping PostgreSQL..."
su -s /bin/bash postgres -c "pg_ctlcluster ${PG_VERSION} main stop"

log "Database initialisation complete."
