#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'signalshape');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'signalshape-test-'));

function writeJson(name, value) {
  const file = path.join(TMP, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function writeText(name, value) {
  const file = path.join(TMP, name);
  fs.writeFileSync(file, value);
  return file;
}

function run(args) {
  return spawnSync(CLI, args, {
    cwd: ROOT,
    encoding: 'utf8'
  });
}

function expectExit(name, expected, args) {
  const result = run(args);
  try {
    assert.strictEqual(result.status, expected);
    process.stdout.write(`ok ${name}\n`);
  } catch (err) {
    process.stderr.write(`not ok ${name}\n`);
    process.stderr.write(`expected exit ${expected}, got ${result.status}\n`);
    process.stderr.write(`stdout:\n${result.stdout}\n`);
    process.stderr.write(`stderr:\n${result.stderr}\n`);
    throw err;
  }
}

const validHandoff = {
  shape: 'handoff',
  version: '0.1.0',
  producer: 'worker-1',
  consumer_hint: 'verifier',
  confidence: 'high',
  requires_human: false,
  payload: {
    goal: 'verify auth refactor',
    state: {
      branch: 'feat/auth-refactor',
      extra_context_allowed: true
    },
    decisions: [
      { what: 'kept session boundary unchanged', why: 'reduces release risk' }
    ],
    files_touched: [
      { path: 'src/auth/session.ts', change: 'modified' }
    ],
    next: [
      { action: 'run auth integration tests', owner: 'verifier' }
    ],
    risks: [
      { risk: 'migration not tested', mitigation: 'run staging smoke test' }
    ]
  }
};

const validReview = {
  shape: 'review',
  version: '0.1.0',
  producer: 'reviewer-1',
  payload: {
    findings: []
  }
};

const demoFiles = [
  'examples/workflows/orchestrator-worker-handoff/01-orchestrator-decision.json',
  'examples/workflows/orchestrator-worker-handoff/02-worker-status.json',
  'examples/workflows/orchestrator-worker-handoff/03-worker-debug.json',
  'examples/workflows/orchestrator-worker-handoff/04-worker-handoff.json'
];

expectExit('demo complete', 0, ['lint', ...demoFiles]);
expectExit('malformed json', 2, ['lint', writeText('malformed.json', '{"shape":')]);
expectExit('unknown shape', 3, ['lint', writeJson('unknown-shape.json', {
  shape: 'unknown',
  version: '0.1.0',
  producer: 'worker-1',
  payload: {}
})]);
expectExit('prose shape without flag', 4, ['lint', writeJson('review.json', validReview)]);
expectExit('prose shape with allow flag', 0, ['lint', '--allow-prose-shapes', writeJson('review-allowed.json', validReview)]);
expectExit('prose shape still requires envelope', 1, ['lint', '--allow-prose-shapes', writeJson('review-bad-envelope.json', {
  shape: 'review'
})]);
expectExit('missing shape is validation error', 1, ['lint', writeJson('missing-shape.json', {
  version: '0.1.0',
  producer: 'worker-1',
  payload: {}
})]);
expectExit('handoff missing goal', 1, ['lint', writeJson('handoff-no-goal.json', {
  ...validHandoff,
  payload: {
    ...validHandoff.payload,
    goal: undefined
  }
})]);
expectExit('producer uppercase rejected', 1, ['lint', writeJson('producer-uppercase.json', {
  ...validHandoff,
  producer: 'Worker-1'
})]);
expectExit('version non-semver rejected', 1, ['lint', writeJson('version-bad.json', {
  ...validHandoff,
  version: '0.1'
})]);
expectExit('shape mismatch rejected', 1, ['lint', '--shape', 'status', writeJson('shape-mismatch.json', validHandoff)]);
expectExit('debug next_action invalid', 1, ['lint', writeJson('debug-next-action-bad.json', {
  shape: 'debug',
  version: '0.1.0',
  producer: 'worker-1',
  payload: {
    hypothesis: 'dependency install failed',
    next_action: 'panic'
  }
})]);
expectExit('envelope extra field rejected', 1, ['lint', writeJson('extra-envelope-field.json', {
  ...validHandoff,
  correlation_id: 'abc'
})]);
expectExit('handoff state extension point allowed', 0, ['lint', writeJson('handoff-state-open.json', validHandoff)]);

fs.rmSync(TMP, { recursive: true, force: true });
