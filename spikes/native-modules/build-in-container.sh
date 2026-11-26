#!/bin/bash
# Builds the AppImage inside node:24-bookworm (glibc 2.36), so node-pty is compiled
# against an older glibc than the Arch host's. Usage: ./build-in-container.sh
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp/home -v "$here":/src:ro -v "$here/apps/desktop/dist-bookworm":/out node:24-bookworm bash -euc '
  mkdir -p /tmp/home /tmp/w && cd /tmp/w
  tar -C /src --exclude=node_modules --exclude=dist --exclude=dist-bookworm --exclude=results -cf - . | tar -xf -
  npm i -g --prefix /tmp/home/.npm pnpm@12.11.2 >/dev/null && export PATH=/tmp/home/.npm/bin:$PATH
  pnpm install --frozen-lockfile >/dev/null
  cd apps/desktop && pnpm exec electron-builder --linux AppImage -c.directories.output=/out 2>&1 | grep -E "building|⨯"
'
