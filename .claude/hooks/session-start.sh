#!/bin/bash
# Pasang dependencies supaya sesi Claude Code di cloud boleh jalankan lint/test/build.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
