# Single-container Canvas LMS image for integration testing.
#
# Bundles PostgreSQL 14, Redis, and Canvas into one image with
# pre-compiled assets and a pre-migrated database baked in.
# No docker-compose, no separate service containers needed.
#
# Build (from repo root, takes ~30-60 min):
#   docker build --platform linux/amd64 \
#     -f docker/integration-test/Dockerfile \
#     -t canvas-integration .
#
# Run:
#   docker run -p 8900:8900 canvas-integration
#
# Reset DB to post-migration state:
#   docker exec <container> /usr/local/bin/canvas-reset-db.sh
#
# Rails console:
#   docker exec -it <container> \
#     su -s /bin/bash docker -c \
#     "cd /usr/src/app && bundle exec rails c"

ARG RUBY=3.4

FROM --platform=linux/amd64 instructure/ruby-passenger:$RUBY-jammy
LABEL maintainer="Instructure"

ARG RUBY=3.4
ARG POSTGRES_CLIENT=14
ENV APP_HOME=/usr/src/app/
ENV RAILS_ENV=development
ENV NGINX_MAX_UPLOAD_SIZE=10g
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8
ENV LC_CTYPE=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
ARG CANVAS_RAILS=8.0
ENV CANVAS_RAILS=${CANVAS_RAILS}
ENV NODE_MAJOR=20
ENV GEM_HOME=/home/docker/.gem/$RUBY
ENV PATH=${APP_HOME}bin:$GEM_HOME/bin:$PATH
ENV BUNDLE_APP_CONFIG=/home/docker/.bundle

# Fixed credentials for embedded services — override via env if needed
ENV CANVAS_DATABASE_HOST=localhost
ENV CANVAS_DATABASE_USERNAME=canvas
ENV POSTGRES_PASSWORD=canvas
ENV ENCRYPTION_KEY=e2e-encryption-key-32chars-here!!

WORKDIR $APP_HOME

USER root

RUN mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
  && printf 'path-exclude /usr/share/doc/*\npath-exclude /usr/share/man/*' > /etc/dpkg/dpkg.cfg.d/01_nodoc \
  && echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
  && curl -sS https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
  && add-apt-repository ppa:git-core/ppa -ny \
  && apt-get update -qq \
  && apt-get install -qqy --no-install-recommends \
       nodejs \
       libxmlsec1-dev \
       python3-lxml \
       python-is-python3 \
       libicu-dev \
       libidn11-dev \
       parallel \
       postgresql-14 \
       postgresql-14-pgvector \
       redis-server \
       supervisor \
       tzdata \
       unzip \
       pbzip2 \
       fontforge \
       git \
       build-essential \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /home/docker/.gem/ruby/$RUBY_MAJOR.0

# Tune PostgreSQL for a low-resource single-container setup
RUN echo "max_locks_per_transaction = 640" >> /etc/postgresql/14/main/postgresql.conf \
  && echo "max_stack_depth = 5MB" >> /etc/postgresql/14/main/postgresql.conf \
  && echo "shared_buffers = 256MB" >> /etc/postgresql/14/main/postgresql.conf \
  && echo "effective_cache_size = 256MB" >> /etc/postgresql/14/main/postgresql.conf \
  && echo "random_page_cost = 1.0" >> /etc/postgresql/14/main/postgresql.conf \
  # Trust all localhost connections so no password is required inside the container
  && sed -i 's|^host.*127\.0\.0\.1/32.*$|host all all 127.0.0.1/32 trust|' /etc/postgresql/14/main/pg_hba.conf \
  && sed -i 's|^host.*::1/128.*$|host all all ::1/128 trust|' /etc/postgresql/14/main/pg_hba.conf

RUN gem install bundler --no-document -v 2.5.10 \
  && find $GEM_HOME ! -user docker | xargs chown docker:docker
RUN npm install -g npm@9.8.1 && npm cache clean --force

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare yarn@1.19.1 --activate

USER docker

RUN set -eux; \
  mkdir -p \
    .yardoc \
    app/stylesheets/brandable_css_brands \
    app/views/info \
    config/locales/generated \
    log \
    node_modules \
    packages/js-utils/es \
    packages/js-utils/lib \
    packages/js-utils/node_modules \
    pacts \
    public/dist \
    public/javascripts/translations \
    reports \
    tmp \
    /home/docker/.bundle/ \
    /home/docker/.cache/yarn \
    /home/docker/.gem/

# Copy application code
COPY --chown=docker:docker . ${APP_HOME}

# Overlay integration-test configs (database, redis, security, etc.)
COPY --chown=docker:docker docker/integration-test/config/ config/

# Install Ruby gems
RUN unset RUBY \
  && bundle config --global build.nokogiri --use-system-libraries \
  && bundle config --global build.ffi --enable-system-libffi \
  && bundle install --jobs 4

# Install JS dependencies
RUN yarn install --frozen-lockfile \
  || yarn install --frozen-lockfile --network-concurrency 1

# Pre-compile all assets; node_modules removed afterwards to slim the image
ENV COMPILE_ASSETS_BRAND_CONFIGS=0
ENV COMPILE_ASSETS_NPM_INSTALL=0
RUN bin/rails canvas:compile_assets --trace \
  && rm -rf node_modules

# ── Database initialisation ───────────────────────────────────────────────────
# Start postgres, create DBs, run Canvas migrations, stop postgres.
# The resulting data directory is baked into this image layer so containers
# start instantly with a fully migrated database.
USER root
COPY docker/integration-test/db-init.sh /usr/local/bin/db-init.sh
RUN chmod +x /usr/local/bin/db-init.sh && /usr/local/bin/db-init.sh

# ── Runtime helpers ───────────────────────────────────────────────────────────
COPY docker/integration-test/canvas-reset-db.sh /usr/local/bin/canvas-reset-db.sh
COPY docker/integration-test/supervisord.conf /etc/supervisor/conf.d/canvas.conf
COPY docker/integration-test/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/canvas-reset-db.sh \
  && chmod +x /usr/local/bin/entrypoint.sh \
  && mkdir -p /var/log/supervisor \
  && mkdir -p /usr/src/app/tmp/pids /usr/src/app/tmp/sockets \
  && chown -R docker:docker /usr/src/app/tmp

EXPOSE 8900 5432 6379

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:8900/health_check || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
