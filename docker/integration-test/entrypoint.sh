#!/bin/bash
# Container entrypoint.
# Ensures required runtime directories exist, then execs the CMD
# (which is supervisord, starting postgres/redis/canvas).
set -euo pipefail

mkdir -p \
  /var/log/supervisor \
  /var/run \
  /usr/src/app/log \
  /usr/src/app/tmp/pids \
  /usr/src/app/tmp/cache \
  /usr/src/app/tmp/sockets

# Remove any stale Rails/Puma pid files from a previous run
rm -f /usr/src/app/tmp/pids/*.pid

# Ensure the app user can write to runtime directories
chown -R docker:docker /usr/src/app/tmp /usr/src/app/log 2>/dev/null || true

exec "$@"
