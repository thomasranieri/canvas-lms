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

echo ""
echo "Vendors ready in ${DIR}/"
ls -lh "${DIR}/"
