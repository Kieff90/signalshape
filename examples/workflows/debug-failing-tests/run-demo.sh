#!/usr/bin/env bash
# Demonstrates the full debug-failing-tests SignalShape workflow.
#
# Steps:
#   1. Validate all four SignalShape contract files
#   2. Copy the demo app to an isolated temporary directory
#   3. Show the bug and fix without changing the repository checkout
#
# Exit 0 if everything validates and both test states are observed.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
CLI="$ROOT/bin/signalshape"
SOURCE_APP="$HERE/app"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/signalshape-debug-demo.XXXXXX")"
APP="$WORK_DIR/app"
MATH_JS="$APP/math.js"

# Cleanup is best-effort. Even SIGKILL can only leave a disposable directory in
# the system temp area because all mutations happen in this copy.
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

cp -R "$SOURCE_APP" "$APP"

# ── 1. Validate all SignalShape contracts ─────────────────────────────────────

echo "── 1. planner decides to spawn builder-agent"
"$CLI" lint "$HERE/01-planner-decision.json"

echo
echo "── 2. builder reports buggy code + failing test"
"$CLI" lint "$HERE/02-builder-status.json"

echo
echo "── 3. debug-agent diagnoses root cause"
"$CLI" lint "$HERE/03-debug-failure.json"

echo
echo "── 4. verifier confirms fix and hands off to human"
"$CLI" lint "$HERE/04-final-handoff.json"

echo
echo "✓ all four contracts validated"

# ── 2. Reproduce the failing test in the isolated copy ────────────────────────

echo
echo "── Reproducing the bug in a temporary copy (reverting to a - b)..."
node -e "
const fs = require('fs');
const file = process.argv[1];
const src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, src.replace('return a + b', 'return a - b'));
" "$MATH_JS"

echo "── Running test with buggy math.js (expecting failures)..."
set +e
node --test "$APP/math.test.js" 2>&1
TEST_EXIT=$?
set -e

if [ "$TEST_EXIT" -eq 0 ]; then
  echo "ERROR: expected test failure but got exit 0" >&2
  exit 1
fi

echo "✓ test fails as expected (exit $TEST_EXIT)"

# ── 3. Apply the fix and confirm tests pass ───────────────────────────────────

echo
echo "── Applying fix (a - b → a + b)..."
node -e "
const fs = require('fs');
const file = process.argv[1];
const src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, src.replace('return a - b', 'return a + b'));
" "$MATH_JS"

echo "── Running test with fixed math.js (expecting all pass)..."
node --test "$APP/math.test.js"

echo
echo "✓ all contracts valid — test fail → fix → test pass cycle complete"
