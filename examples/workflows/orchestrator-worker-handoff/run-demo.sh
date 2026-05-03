#!/usr/bin/env bash
# Validates all four messages in the demo workflow, in narrative order.
# Exit non-zero if any file fails.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
CLI="$ROOT/bin/signalshape"

echo "── 1. orchestrator decides which worker to spawn"
"$CLI" lint "$HERE/01-orchestrator-decision.json"

echo
echo "── 2. worker reports mid-flight progress"
"$CLI" lint "$HERE/02-worker-status.json"

echo
echo "── 3. worker hits unexpected error, escalates"
"$CLI" lint "$HERE/03-worker-debug.json"

echo
echo "── 4. worker hands off to verifier"
"$CLI" lint "$HERE/04-worker-handoff.json"

echo
echo "✓ all four messages validated"
