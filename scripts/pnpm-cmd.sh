#!/bin/bash

# Resolve a usable pnpm command across local development and deployment
# environments where pnpm may not be preinstalled.

# Some desktop sessions do not expose `node` on PATH even though the bundled
# runtime is available. Prepend it so pnpm/next/tsup shims can execute.
if ! command -v node >/dev/null 2>&1 && [ -x "/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  export PATH="/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:${PATH}"
fi

pnpm_cmd() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
    return $?
  fi

  if [ -x "./node_modules/.bin/pnpm" ]; then
    ./node_modules/.bin/pnpm "$@"
    return $?
  fi

  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
    return $?
  fi

  if command -v npx >/dev/null 2>&1; then
    npx --yes pnpm@9 "$@"
    return $?
  fi

  if [ -x "/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm" ]; then
    /Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm "$@"
    return $?
  fi

  echo "pnpm command not found and no fallback was available." >&2
  return 127
}
