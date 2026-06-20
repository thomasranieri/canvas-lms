#!/bin/bash
# Drops and recreates canvas_development to the post-migration baseline.
# Run this between integration test suites to get a clean slate:
#   docker exec <container> /usr/local/bin/canvas-reset-db.sh
set -euo pipefail

GEM_HOME="/home/docker/.gem/3.4"
APP_HOME="/usr/src/app"

export HOME="/home/docker"
export GEM_HOME="${GEM_HOME}"
export PATH="${APP_HOME}/bin:${GEM_HOME}/bin:${PATH}"
export BUNDLE_APP_CONFIG="/home/docker/.bundle"
export CANVAS_DATABASE_HOST="localhost"
export CANVAS_DATABASE_USERNAME="canvas"
export POSTGRES_PASSWORD="canvas"
export ENCRYPTION_KEY="e2e-encryption-key-32chars-here!!"
export RAILS_ENV="${RAILS_ENV:-development}"

cd "$APP_HOME"

echo "Dropping and recreating ${RAILS_ENV} database..."
su -s /bin/bash docker -c "
  export HOME='${HOME}'
  export GEM_HOME='${GEM_HOME}'
  export PATH='${APP_HOME}/bin:${GEM_HOME}/bin:\$PATH'
  export BUNDLE_APP_CONFIG='${BUNDLE_APP_CONFIG}'
  export CANVAS_DATABASE_HOST='${CANVAS_DATABASE_HOST}'
  export CANVAS_DATABASE_USERNAME='${CANVAS_DATABASE_USERNAME}'
  export POSTGRES_PASSWORD='${POSTGRES_PASSWORD}'
  export ENCRYPTION_KEY='${ENCRYPTION_KEY}'
  export RAILS_ENV='${RAILS_ENV}'
  cd '${APP_HOME}'
  bundle exec rails db:drop db:create db:migrate
"

echo "Reset complete."
