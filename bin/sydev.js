#!/usr/bin/env bash
exec npx tsx "$(dirname "$(readlink -f "$0")")/../apps/cli/src/index.ts" "$@"
