#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'signalshape');
let tmp;

function writeJson(name, value) {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function writeText(name, value) {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, value);
  return file;
}

function run(args, options = {}) {
  return spawnSync(CLI, args, {
    cwd: options.cwd || ROOT,
    encoding: 'utf8',
    input: options.input,
    timeout: 10000
  });
}

function expectResult(name, expected, args, options = {}) {
  const result = run(args, options);
  try {
    assert.strictEqual(result.status, expected.status);
    if (expected.stdoutIncludes) {
      assert.match(result.stdout, new RegExp(expected.stdoutIncludes));
    }
    if (expected.stderrIncludes) {
      assert.match(result.stderr, new RegExp(expected.stderrIncludes));
    }
    process.stdout.write(`ok ${name}\n`);
  } catch (err) {
    process.stderr.write(`not ok ${name}\n`);
    process.stderr.write(`expected: ${JSON.stringify(expected)}\n`);
    process.stderr.write(`actual exit: ${result.status}\n`);
    process.stderr.write(`stdout:\n${result.stdout}\n`);
    process.stderr.write(`stderr:\n${result.stderr}\n`);
    throw err;
  }
}

function expectJson(name, expected, filename, value) {
  expectResult(name, expected, ['lint', writeJson(filename, value)]);
}

const envelope = {
  version: '0.1.2',
  producer: 'worker-1'
};

const validHandoff = {
  shape: 'handoff',
  ...envelope,
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

const validStatus = {
  shape: 'status',
  ...envelope,
  payload: {
    done: ['read repository'],
    current: 'writing validation tests',
    next: ['run the complete suite'],
    blocked_by: null
  }
};

const validBlockedStatus = {
  shape: 'status',
  ...envelope,
  payload: {
    done: ['prepared migration'],
    current: 'waiting for schema access',
    next: [],
    blocked_by: 'read-only credentials are required'
  }
};

const validDecision = {
  shape: 'decision',
  ...envelope,
  payload: {
    recommendation: 'use the isolated workflow',
    reason: 'it cannot mutate the checkout',
    options_considered: [
      { option: 'restore with a trap', tradeoff: 'cannot survive SIGKILL' }
    ],
    when_to_choose_other: null
  }
};

const validDebug = {
  shape: 'debug',
  ...envelope,
  payload: {
    hypothesis: 'the operator is incorrect',
    checks: [
      { command: 'node --test app/math.test.js', expected: 'three passing tests' }
    ],
    next_action: 'investigate',
    context: {
      arbitrary_extension: true
    }
  }
};

const validReview = {
  shape: 'review',
  ...envelope,
  payload: {
    findings: []
  }
};

function runCleanupFailureProbe() {
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'signalshape-cleanup-probe-'));
  process.stdout.write(`${probe}\n`);
  try {
    assert.fail('deliberate cleanup probe failure');
  } finally {
    fs.rmSync(probe, { recursive: true, force: true });
  }
}

function runSuite() {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'signalshape-test-'));

  try {
    const demoFiles = [
      'examples/workflows/orchestrator-worker-handoff/01-orchestrator-decision.json',
      'examples/workflows/orchestrator-worker-handoff/02-worker-status.json',
      'examples/workflows/orchestrator-worker-handoff/03-worker-debug.json',
      'examples/workflows/orchestrator-worker-handoff/04-worker-handoff.json'
    ];

    expectResult('demo complete', { status: 0 }, ['lint', ...demoFiles]);

    // Direct positive coverage: each schema stands on its own, independent of demos.
    for (const [shape, value] of [
      ['handoff', validHandoff],
      ['status', validStatus],
      ['status blocked', validBlockedStatus],
      ['decision', validDecision],
      ['debug', validDebug]
    ]) {
      expectJson(`${shape} direct valid`, { status: 0, stdoutIncludes: 'valid' }, `${shape.replace(' ', '-')}-valid.json`, value);
    }

    for (const nextAction of ['retry', 'escalate', 'abort', 'investigate']) {
      expectJson(`debug next_action ${nextAction}`, { status: 0 }, `debug-${nextAction}.json`, {
        ...validDebug,
        payload: { ...validDebug.payload, next_action: nextAction }
      });
    }

    // Handoff contract boundaries.
    for (const [name, payload] of [
      ['missing goal', {}],
      ['empty goal', { goal: '' }],
      ['wrong goal type', { goal: 42 }],
      ['decision missing why', { goal: 'continue', decisions: [{ what: 'keep API' }] }],
      ['invalid file change', { goal: 'continue', files_touched: [{ path: 'a.js', change: 'renamed' }] }],
      ['extra payload field', { goal: 'continue', unexpected: true }]
    ]) {
      expectJson(`handoff ${name}`, { status: 1, stderrIncludes: 'invalid \\(handoff\\)' }, `handoff-${name.replaceAll(' ', '-')}.json`, {
        shape: 'handoff',
        ...envelope,
        payload
      });
    }

    // Status contract boundaries, including the documented next/blocked invariant.
    for (const [name, payload] of [
      ['missing done', { current: 'working', next: ['finish'] }],
      ['missing current', { done: [], next: ['finish'] }],
      ['missing next', { done: [], current: 'working' }],
      ['wrong done type', { done: 'finished', current: 'working', next: ['finish'] }],
      ['empty current', { done: [], current: '', next: ['finish'] }],
      ['empty next without blocker', { done: [], current: 'working', next: [] }],
      ['empty next with null blocker', { done: [], current: 'working', next: [], blocked_by: null }],
      ['empty blocker', { done: [], current: 'waiting', next: [], blocked_by: '' }],
      ['extra payload field', { done: [], current: 'working', next: ['finish'], unexpected: true }]
    ]) {
      expectJson(`status ${name}`, { status: 1, stderrIncludes: 'invalid \\(status\\)' }, `status-${name.replaceAll(' ', '-')}.json`, {
        shape: 'status',
        ...envelope,
        payload
      });
    }

    // Decision contract boundaries.
    for (const [name, payload] of [
      ['missing recommendation', { reason: 'because' }],
      ['missing reason', { recommendation: 'choose A' }],
      ['empty recommendation', { recommendation: '', reason: 'because' }],
      ['wrong reason type', { recommendation: 'choose A', reason: 42 }],
      ['option missing tradeoff', { recommendation: 'choose A', reason: 'because', options_considered: [{ option: 'B' }] }],
      ['extra payload field', { recommendation: 'choose A', reason: 'because', unexpected: true }]
    ]) {
      expectJson(`decision ${name}`, { status: 1, stderrIncludes: 'invalid \\(decision\\)' }, `decision-${name.replaceAll(' ', '-')}.json`, {
        shape: 'decision',
        ...envelope,
        payload
      });
    }

    // Debug contract boundaries.
    for (const [name, payload] of [
      ['missing hypothesis', { next_action: 'retry' }],
      ['missing next action', { hypothesis: 'network failure' }],
      ['empty hypothesis', { hypothesis: '', next_action: 'retry' }],
      ['invalid next action', { hypothesis: 'network failure', next_action: 'panic' }],
      ['check missing expected', { hypothesis: 'network failure', next_action: 'retry', checks: [{ command: 'curl example.test' }] }],
      ['extra payload field', { hypothesis: 'network failure', next_action: 'retry', unexpected: true }]
    ]) {
      expectJson(`debug ${name}`, { status: 1, stderrIncludes: 'invalid \\(debug\\)' }, `debug-${name.replaceAll(' ', '-')}.json`, {
        shape: 'debug',
        ...envelope,
        payload
      });
    }

    // Envelope, shape registry, input, and CLI behavior.
    expectResult('malformed json', { status: 2, stderrIncludes: 'malformed JSON' }, ['lint', writeText('malformed.json', '{"shape":')]);
    expectJson('unknown shape', { status: 3, stderrIncludes: 'unknown shape' }, 'unknown-shape.json', {
      shape: 'unknown',
      ...envelope,
      payload: {}
    });
    expectJson('prose shape without flag', { status: 4, stderrIncludes: 'not machine-validatable' }, 'review.json', validReview);
    expectResult('prose shape with allow flag', { status: 0, stdoutIncludes: 'allowed' }, [
      'lint', '--allow-prose-shapes', writeJson('review-allowed.json', validReview)
    ]);
    expectResult('stdin valid handoff', { status: 0, stdoutIncludes: 'valid \\(handoff\\)' }, ['lint', '-'], {
      input: JSON.stringify(validHandoff)
    });
    expectJson('prose shape still requires envelope', { status: 1, stderrIncludes: 'invalid envelope' }, 'review-bad-envelope.json', {
      shape: 'review'
    });
    expectJson('missing shape is validation error', { status: 1, stderrIncludes: 'invalid envelope' }, 'missing-shape.json', {
      ...envelope,
      payload: {}
    });
    expectJson('producer uppercase rejected', { status: 1 }, 'producer-uppercase.json', {
      ...validHandoff,
      producer: 'Worker-1'
    });
    expectJson('version non-semver rejected', { status: 1 }, 'version-bad.json', {
      ...validHandoff,
      version: '0.1'
    });
    expectJson('future contract version rejected', { status: 1 }, 'version-future.json', {
      ...validHandoff,
      version: '999.0.0'
    });
    expectJson('envelope extra field rejected', { status: 1 }, 'extra-envelope-field.json', {
      ...validHandoff,
      correlation_id: 'abc'
    });
    expectJson('handoff state extension point allowed', { status: 0 }, 'handoff-state-open.json', validHandoff);
    expectJson('debug context extension point allowed', { status: 0 }, 'debug-context-open.json', validDebug);
    expectResult('shape mismatch rejected', { status: 1, stderrIncludes: 'requires envelope.shape' }, [
      'lint', '--shape', 'status', writeJson('shape-mismatch.json', validHandoff)
    ]);

    expectResult('top-level version long', { status: 0, stdoutIncludes: '^0\\.1\\.2' }, ['--version']);
    expectResult('top-level version short', { status: 0, stdoutIncludes: '^0\\.1\\.2' }, ['-v']);
    expectResult('top-level help long', { status: 0, stdoutIncludes: 'Usage:' }, ['--help']);
    expectResult('top-level help short', { status: 0, stdoutIncludes: 'Usage:' }, ['-h']);
    expectResult('version cannot bypass lint', { status: 64, stderrIncludes: 'unknown flag: --version' }, [
      'lint', writeText('invalid-for-bypass.json', '{'), '--version'
    ]);
    expectResult('help cannot bypass lint', { status: 64, stderrIncludes: 'unknown flag: --help' }, [
      'lint', writeText('invalid-for-help.json', '{'), '--help'
    ]);
    expectResult('short flag rejected in lint', { status: 64, stderrIncludes: 'unknown flag: -v' }, [
      'lint', '-v'
    ]);
    expectResult('unknown long flag rejected', { status: 64, stderrIncludes: 'unknown flag: --wat' }, [
      'lint', '--wat', writeJson('unused-valid.json', validHandoff)
    ]);
    writeJson('-handoff.json', validHandoff);
    expectResult('option terminator allows dash filename', { status: 0 }, ['lint', '--', '-handoff.json'], { cwd: tmp });

    expectResult('oversized file rejected', { status: 64, stderrIncludes: 'input too large' }, [
      'lint', writeText('oversized.json', ' '.repeat(1024 * 1024 + 1))
    ]);

    // Measure bytes actually read, including streams whose stat size is zero.
    const limit = 1024 * 1024;
    const exactLimit = JSON.stringify(validHandoff).padEnd(limit, ' ');
    const oversized = `${exactLimit} `;
    expectResult('file at input limit accepted', { status: 0 }, [
      'lint', writeText('exact-limit.json', exactLimit)
    ]);
    expectResult('stdin at input limit accepted', { status: 0 }, ['lint', '-'], { input: exactLimit });
    expectResult('oversized stdin rejected', { status: 64, stderrIncludes: 'input too large' }, ['lint', '-'], {
      input: oversized
    });
    if (process.platform !== 'win32') {
      const fifo = path.join(tmp, 'input.fifo');
      const source = writeText('fifo-source.json', oversized);
      const mkfifo = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
      assert.strictEqual(mkfifo.status, 0, mkfifo.stderr);
      const writer = spawn(process.execPath, ['-e',
        "const fs = require('fs'); fs.writeFileSync(process.argv[1], fs.readFileSync(process.argv[2]));",
        fifo, source
      ], { stdio: 'ignore' });
      try {
        expectResult('oversized named pipe rejected', { status: 64, stderrIncludes: 'input too large' }, ['lint', fifo]);
      } finally {
        writer.kill();
      }
    }

    const unicodeInput = JSON.stringify({
      ...validHandoff,
      payload: { goal: '\u00e9'.repeat(limit / 2) }
    });
    assert.ok(unicodeInput.length < limit);
    assert.ok(Buffer.byteLength(unicodeInput, 'utf8') > limit);
    expectResult('stdin limit counts UTF-8 bytes', { status: 64, stderrIncludes: 'input too large' }, ['lint', '-'], {
      input: unicodeInput
    });

    const validFile = writeJson('batch-valid.json', validHandoff);
    const invalidFile = writeJson('batch-invalid.json', { ...validHandoff, payload: {} });
    const malformedFile = writeText('batch-malformed.json', '{');
    expectResult('batch retains highest exit code', { status: 2, stdoutIncludes: 'valid \\(handoff\\)' }, [
      'lint', malformedFile, invalidFile, validFile
    ]);
    expectResult('batch continues after oversized input', { status: 64, stdoutIncludes: 'valid \\(handoff\\)' }, [
      'lint', writeText('batch-oversized.json', oversized), validFile
    ]);
    expectResult('missing file is usage error', { status: 64, stderrIncludes: 'cannot read file' }, [
      'lint', path.join(tmp, 'missing.json')
    ]);

    const cleanupProbe = spawnSync(process.execPath, [__filename], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, SIGNALSHAPE_CLEANUP_PROBE: '1' }
    });
    assert.notStrictEqual(cleanupProbe.status, 0);
    const cleanupProbeDir = cleanupProbe.stdout.trim().split('\n')[0];
    assert.ok(cleanupProbeDir.startsWith(os.tmpdir()));
    assert.strictEqual(fs.existsSync(cleanupProbeDir), false);
    process.stdout.write('ok fixture cleanup on forced assertion failure\n');
  } finally {
    if (tmp) {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

if (process.env.SIGNALSHAPE_CLEANUP_PROBE === '1') {
  runCleanupFailureProbe();
} else {
  runSuite();
}
