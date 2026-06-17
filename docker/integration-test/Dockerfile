# Single-container Canvas LMS image for integration testing.
#
# Bundles PostgreSQL 16, Redis, and Canvas into one image with
# pre-compiled assets and a pre-migrated database baked in.
# No docker-compose, no separate service containers needed.
#
# Prerequisites — run once on the host before building:
#   mkdir -p docker/integration-test/vendor
#   curl -fsSL -o docker/integration-test/vendor/node-v20.9.0-linux-x64.tar.xz \
#     https://nodejs.org/dist/v20.9.0/node-v20.9.0-linux-x64.tar.xz
#   curl -fsSL -o docker/integration-test/vendor/ruby-3.4.9.tar.gz \
#     https://github.com/ruby/ruby/archive/refs/tags/v3_4_9.tar.gz
#
# Build (from repo root, ~45-75 min):
#   docker build -f docker/integration-test/Dockerfile \
#     -t canvas-integration .
#
# Run:
#   docker run -p 3000:3000 canvas-integration
#
# Reset DB to post-migration state:
#   docker exec <container> /usr/local/bin/canvas-reset-db.sh
#
# Rails console:
#   docker exec -it <container> \
#     su -s /bin/bash docker -c "cd /usr/src/app && bundle exec rails c"

FROM mirror.gcr.io/library/ubuntu:24.04
LABEL maintainer="Instructure"

ENV DEBIAN_FRONTEND=noninteractive
ENV APP_HOME=/usr/src/app/
ENV RAILS_ENV=development
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8
ENV LC_CTYPE=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
ARG CANVAS_RAILS=8.0
ENV CANVAS_RAILS=${CANVAS_RAILS}
ENV RUBY_MINOR=3.4
ENV GEM_HOME=/home/docker/.gem/${RUBY_MINOR}
ENV PATH=${APP_HOME}bin:${GEM_HOME}/bin:/opt/node/bin:${PATH}
ENV BUNDLE_APP_CONFIG=/home/docker/.bundle

# Fixed credentials for embedded services — override via env if needed
ENV CANVAS_DATABASE_HOST=localhost
ENV CANVAS_DATABASE_USERNAME=canvas
ENV POSTGRES_PASSWORD=canvas
ENV ENCRYPTION_KEY=integrationtestencryptionkey00000000000000000000000000000000000

WORKDIR $APP_HOME

# ── Trust Anthropic egress gateway CA (required for HTTPS in this env) ───────
COPY docker/integration-test/anthropic-egress-ca.crt /usr/local/share/ca-certificates/anthropic-egress-ca.crt
RUN apt-get update -qq \
  && apt-get install -qqy --no-install-recommends ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Node.js uses its own bundled CA store; point it to the system bundle
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# ── System packages ───────────────────────────────────────────────────────────
RUN apt-get update -qq \
  && apt-get install -qqy --no-install-recommends \
       # Ruby build dependencies
       build-essential autoconf automake libtool bison \
       libssl-dev libyaml-dev libffi-dev libreadline-dev \
       zlib1g-dev libgmp-dev libgdbm-dev libdb-dev \
       # Bootstrap Ruby needed to compile Ruby from source
       ruby \
       # Canvas runtime dependencies
       libxmlsec1-dev \
       python3-lxml \
       python-is-python3 \
       libicu-dev \
       libidn11-dev \
       parallel \
       # Databases and services
       postgresql \
       postgresql-contrib \
       postgresql-16-pgvector \
       redis-server \
       supervisor \
       # Utilities
       tzdata \
       unzip \
       pbzip2 \
       fontforge \
       git \
       curl \
       ca-certificates \
       xz-utils \
  && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 (pre-downloaded tarball) ──────────────────────────────────────
COPY docker/integration-test/vendor/node-v20.9.0-linux-x64.tar.xz /tmp/node.tar.xz
RUN tar -xJf /tmp/node.tar.xz -C /opt \
  && mv /opt/node-v20.9.0-linux-x64 /opt/node \
  && rm /tmp/node.tar.xz \
  && node --version && npm --version

# ── Ruby 3.4 (compiled from source) ──────────────────────────────────────────
# The GitHub source archive doesn't bundle gems; pre-copy them so make
# doesn't attempt HTTPS downloads (which fail in this network environment).
COPY docker/integration-test/vendor/ruby-3.4.9.tar.gz /tmp/ruby.tar.gz
COPY docker/integration-test/vendor/ruby-bundled-gems/ /tmp/ruby-bundled-gems/
RUN tar -xzf /tmp/ruby.tar.gz -C /tmp \
  && cd /tmp/ruby-3_4_9 \
  && ./autogen.sh \
  && ./configure \
       --prefix=/usr/local \
       --enable-shared \
       --disable-install-doc \
  && mkdir -p gems && cp /tmp/ruby-bundled-gems/*.gem gems/ \
  && make -j$(nproc) \
  && make install \
  && cd / && rm -rf /tmp/ruby-3_4_9 /tmp/ruby.tar.gz /tmp/ruby-bundled-gems \
  && ruby --version

# ── Bundler + Yarn ────────────────────────────────────────────────────────────
RUN gem install bundler --no-document -v 2.6.7
RUN npm install -g npm@9.8.1 && npm cache clean --force
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare yarn@1.19.1 --activate

# ── PostgreSQL tuning ─────────────────────────────────────────────────────────
RUN echo "max_locks_per_transaction = 640" >> /etc/postgresql/16/main/postgresql.conf \
  && echo "max_stack_depth = 5MB" >> /etc/postgresql/16/main/postgresql.conf \
  && echo "shared_buffers = 256MB" >> /etc/postgresql/16/main/postgresql.conf \
  && echo "effective_cache_size = 256MB" >> /etc/postgresql/16/main/postgresql.conf \
  && echo "random_page_cost = 1.0" >> /etc/postgresql/16/main/postgresql.conf \
  # Trust all localhost connections (no password required inside the container)
  && sed -i 's|^host.*127\.0\.0\.1/32.*$|host all all 127.0.0.1/32 trust|' /etc/postgresql/16/main/pg_hba.conf \
  && sed -i 's|^host.*::1/128.*$|host all all ::1/128 trust|' /etc/postgresql/16/main/pg_hba.conf

# ── App user + directories ────────────────────────────────────────────────────
RUN useradd -m -s /bin/bash docker 2>/dev/null || true \
  && chown -R docker:docker /home/docker \
  && chown docker:docker ${APP_HOME}
USER docker

RUN mkdir -p \
    ${APP_HOME}.yardoc \
    ${APP_HOME}app/stylesheets/brandable_css_brands \
    ${APP_HOME}app/views/info \
    ${APP_HOME}config/locales/generated \
    ${APP_HOME}log \
    ${APP_HOME}node_modules \
    ${APP_HOME}packages/js-utils/es \
    ${APP_HOME}packages/js-utils/lib \
    ${APP_HOME}packages/js-utils/node_modules \
    ${APP_HOME}pacts \
    ${APP_HOME}public/dist \
    ${APP_HOME}public/javascripts/translations \
    ${APP_HOME}reports \
    ${APP_HOME}tmp \
    /home/docker/.bundle/ \
    /home/docker/.cache/yarn \
    ${GEM_HOME}

# ── Application ───────────────────────────────────────────────────────────────
COPY --chown=docker:docker . ${APP_HOME}
COPY --chown=docker:docker docker/integration-test/config/ config/

# Install Ruby gems
RUN bundle config --global build.nokogiri --use-system-libraries \
  && bundle config --global build.ffi --enable-system-libffi \
  && bundle install --jobs 4

# Install JS dependencies
# sentry-cdn.com is blocked in this network env; SENTRYCLI_SKIP_DOWNLOAD=1
# tells @sentry/cli's install script to skip the binary download entirely.
ENV SENTRYCLI_SKIP_DOWNLOAD=1
RUN yarn install --frozen-lockfile --ignore-engines \
  || yarn install --frozen-lockfile --ignore-engines --network-concurrency 1

# Pre-compile all assets
ENV COMPILE_ASSETS_BRAND_CONFIGS=0
ENV COMPILE_ASSETS_NPM_INSTALL=0
RUN bin/rails canvas:compile_assets --trace \
  && rm -rf node_modules

# ── Database initialisation ───────────────────────────────────────────────────
# Start postgres temporarily, create DBs, run Canvas migrations, stop.
# The data directory is baked into this layer — containers start instantly.
USER root
COPY docker/integration-test/db-init.sh /usr/local/bin/db-init.sh
RUN chmod +x /usr/local/bin/db-init.sh && /usr/local/bin/db-init.sh

# ── Runtime helpers ───────────────────────────────────────────────────────────
COPY docker/integration-test/canvas-reset-db.sh /usr/local/bin/canvas-reset-db.sh
COPY docker/integration-test/supervisord.conf /etc/supervisor/conf.d/canvas.conf
COPY docker/integration-test/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/canvas-reset-db.sh \
  && chmod +x /usr/local/bin/entrypoint.sh \
  && mkdir -p /var/log/supervisor

EXPOSE 3000 5432 6379

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:3000/health_check || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
