#!/usr/bin/env bash
# Demonstrates the full debug-failing-tests SignalShape workflow.
#
# Steps:
#   1. Validate all four SignalShape contract files
#   2. Show the bug: temporarily revert math.js to fail the test
#   3. Show the fix: restore the correct operator and pass the test
#
# Exit 0 if everything validates and both test states are observed.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
CLI="$ROOT/bin/signalshape"
APP="$HERE/app"
MATH_JS="$APP/math.js"

# Guarantee math.js is restored to the fixed state on any exit (including SIGINT).
restore_math() {
  node -e "
const fs = require('fs');
const src = fs.readFileSync('${MATH_JS}', 'utf8');
if (src.includes('return a - b')) {
  fs.writeFileSync('${MATH_JS}', src.replace('return a - b', 'return a + b'));
}
" 2>/dev/null || true
}
trap restore_math EXIT

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

# ── 2. Reproduce the failing test (revert bug temporarily) ────────────────────

echo
echo "── Reproducing the bug (reverting to a - b)..."
node -e "
const fs = require('fs');
const file = '${APP}/math.js';
const src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, src.replace('return a + b', 'return a - b'));
"

echo "── Running test with buggy math.js (expecting failures)..."
set +e
node --test "$APP/math.test.js" 2>&1
TEST_EXIT=$?
set -e

if [ "$TEST_EXIT" -eq 0 ]; then
  echo "ERROR: expected test failure but got exit 0" >&2
  # Restore before failing
  node -e "
const fs = require('fs');
const file = '${APP}/math.js';
const src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, src.replace('return a - b', 'return a + b'));
"
  exit 1
fi

echo "✓ test fails as expected (exit $TEST_EXIT)"

# ── 3. Apply the fix and confirm tests pass ───────────────────────────────────

echo
echo "── Applying fix (a - b → a + b)..."
node -e "
const fs = require('fs');
const file = '${APP}/math.js';
const src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, src.replace('return a - b', 'return a + b'));
"

echo "── Running test with fixed math.js (expecting all pass)..."
node --test "$APP/math.test.js"

echo
echo "✓ all contracts valid — test fail → fix → test pass cycle complete"
