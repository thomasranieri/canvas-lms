#!/bin/bash
# Download vendor dependencies needed before running docker build.
# Run once from the repo root:
#   bash docker/integration-test/download-vendors.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/vendor"
mkdir -p "$DIR"

NODE_VERSION="20.9.0"
RUBY_VERSION="3.4.9"
RUBY_TAG="v3_4_9"

download() {
  local url="$1"
  local dest="$2"
  if [ -f "$dest" ]; then
    echo "Already present: $dest"
    return 0
  fi
  echo "Downloading: $url"
  curl -fSL --progress-bar -o "$dest" "$url"
}

download \
  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
  "${DIR}/node-v${NODE_VERSION}-linux-x64.tar.xz"

download \
  "https://github.com/ruby/ruby/archive/refs/tags/${RUBY_TAG}.tar.gz" \
  "${DIR}/ruby-${RUBY_VERSION}.tar.gz"

# Bundled gems (GitHub source archive doesn't include these; pre-download
# so the Ruby build doesn't need HTTPS access inside Docker)
GEMS_DIR="${DIR}/ruby-bundled-gems"
mkdir -p "${GEMS_DIR}"

download_gem() {
  local name="$1" ver="$2"
  download \
    "https://rubygems.org/downloads/${name}-${ver}.gem" \
    "${GEMS_DIR}/${name}-${ver}.gem"
}

download_gem minitest            5.25.4
download_gem power_assert        2.0.5
download_gem rake                13.2.1
download_gem test-unit           3.6.7
download_gem rexml               3.4.4
download_gem rss                 0.3.1
download_gem net-ftp             0.3.8
download_gem net-imap            0.5.8
download_gem net-pop             0.1.2
download_gem net-smtp            0.5.1
download_gem matrix              0.4.2
download_gem prime               0.1.3
download_gem rbs                 3.8.0
download_gem typeprof            0.30.1
download_gem debug               1.11.0
download_gem racc                1.8.1
download_gem mutex_m             0.3.0
download_gem getoptlong          0.2.1
download_gem base64              0.2.0
download_gem bigdecimal          3.1.8
download_gem observer            0.1.2
download_gem abbrev              0.1.2
download_gem resolv-replace      0.1.1
download_gem rinda               0.2.0
download_gem drb                 2.2.1
download_gem nkf                 0.2.0
download_gem syslog              0.2.0
download_gem csv                 3.3.2
download_gem repl_type_completor 0.1.9

echo ""
echo "Vendors ready in ${DIR}/"
ls -lh "${DIR}/"
ls -lh "${GEMS_DIR}/" | tail -5
