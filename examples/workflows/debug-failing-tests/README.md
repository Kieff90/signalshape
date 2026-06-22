# Demo: planner → builder → debug-agent → fixer → verifier

A five-agent workflow where each agent boundary is a machine-validated SignalShape
contract. The demo proves that inter-agent handoffs are schema-enforced JSON, not
ad-hoc prose.

## The story

```
planner          builder       debug-agent      fixer        verifier → human
   │                │               │              │               │
   │ 1. Decision    │               │              │               │
   │ ──────────────▶│               │              │               │
   │                │               │              │               │
   │                │ 2. Status     │              │               │
   │ ◀──────────────│  (blocked:    │              │               │
   │                │  tests fail)  │              │               │
   │                │               │              │               │
   │                │──────────────▶│              │               │
   │                │            3. Debug          │               │
   │                │            (next_action:     │               │
   │                │              "retry")        │               │
   │                │               │──────────────▶              │
   │                │               │           (fixes bug)        │
   │                │               │              │               │
   │                │               │              │ 4. Handoff   │
   │                │               │              │ ─────────────▶│
```

## Why each shape was chosen

### 1. `decision` — planner commits to a plan

[`01-planner-decision.json`](01-planner-decision.json)

The planner must choose between three approaches: ship already-correct code and
fake a debug exchange, use a heavy test runner, or introduce a trivial bug with
the built-in runner. `decision` makes the chosen option **and the rejected
alternatives** machine-readable. Downstream agents can audit why this path was
taken without parsing prose.

`recommendation` is a single routable string. `options_considered` records
what was rejected and why — making the planner's reasoning transparent to any
orchestrator reading the chain.

### 2. `status` — builder is blocked by a failing test

[`02-builder-status.json`](02-builder-status.json)

The builder has created the app and run the test. The test fails (by design).
The builder does **not** give up ownership — it is reporting state while staying
in the chain. That is the Status-vs-Handoff distinction: use `status` when you
continue, use `handoff` when you stop.

`blocked_by` carries the exact assertion error string so the debug-agent does not
need to re-run the test to know what broke. The contract is the evidence.

### 3. `debug` — debug-agent diagnoses root cause

[`03-debug-failure.json`](03-debug-failure.json)

The debug-agent reads the status contract, opens `math.js`, and identifies the
wrong operator. The interesting field is `next_action: "retry"` — a machine-
readable routing token. An orchestrator can branch on this enum:

| `next_action` | orchestrator does |
|---|---|
| `retry` | apply the fix, re-run the worker |
| `escalate` | notify human or upgrade agent |
| `abort` | cancel the workflow |
| `investigate` | spawn a reader / analysis agent |

Without this enum the orchestrator would have to parse the hypothesis string.
With it, branching is a single switch statement.

`context.found` / `context.expected_fix` give the fixer-agent a precise,
unambiguous instruction — no interpretation required.

### 4. `handoff` — verifier transfers ownership to human

[`04-final-handoff.json`](04-final-handoff.json)

The verifier has confirmed that all 3 tests pass after the fix. It is **giving
up ownership** — the producer is done. The human inherits the workflow.

`decisions` records four non-trivial choices made during the workflow (why TDD,
why fix impl not tests, why keep the zero-case, why emit SignalShape at every
boundary). `files_touched` gives a complete audit trail. `risks` surfaces the
in-place mutation of math.js during the demo, floating-point gaps in test
coverage, and the demo's simplicity versus multi-file production bugs.

## Run it

From the repo root:

```sh
npm install            # one-time, installs ajv
./examples/workflows/debug-failing-tests/run-demo.sh
```

Or equivalently:

```sh
npm run lint:demo:debug
```

The script:
1. Validates all four SignalShape contracts (exit 1 on any failure)
2. Temporarily reverts `math.js` to the buggy state and confirms the test fails
3. Restores the fix and confirms all three tests pass

Exit 0 means: contracts are valid, the failure was real, the fix works.

## What this proves

SignalShape is functioning as a **real contract**, not a writing discipline, when:

- The `status` contract's `blocked_by` field carries actual test output
- The `debug` contract's `context` fields match the real file and line number
- The `handoff` contract's `state.test_results` reflect a live test run
- `./bin/signalshape lint` exits 0 on all four files

If an orchestrator were wired to:

1. **Read** the planner's `decision.recommendation` to spawn the right worker
2. **Read** `status.blocked_by` to detect blockers without polling
3. **Switch** on `debug.payload.next_action` to decide retry vs escalate
4. **Read** `handoff.payload.goal` to hand off cleanly to the next agent

…the entire workflow would be orchestratable from JSON alone, with zero prose
parsing.
