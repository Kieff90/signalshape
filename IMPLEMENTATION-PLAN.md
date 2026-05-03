# SignalShape v0.1 — Implementation Plan

**Status:** Approved, ready to execute
**Target:** v0.1 release — first machine-consumable shapes for orchestration loops
**Scope:** 7 ordered tasks (Task 0 added in revision)

---

## Why this plan exists

Current repo is a well-written doctrine kit (5 markdown files, 1 SKILL.md). It tells agents how to *style* output for humans. It does not let agents *consume* each other's output.

This plan turns SignalShape from "style skill" into "lightweight communication contract for AI agents". The shift:

| From | To |
|---|---|
| 8 prose response shapes | 4 JSON-validatable shapes + 4 prose-only |
| Markdown doctrine | spec + schemas + validator + skill |
| Read by humans | Read by humans AND parsed by other agents |
| "Use signalshape" | `signalshape lint output.json` |

The 4 machine-validatable shapes for v0.1: **Handoff, Status, Decision, Debug**. Selection criterion: each is consumed by another agent in real orchestration loops.

---

## Non-goals for v0.1

- **Not a full multi-agent protocol.** No transport, no discovery, no auth.
- **No SDK.** A schema + a validator.
- **No A2A/MCP integration.** v0.2 conversation.
- **No new shapes invented.** We formalize 4 of the existing 8.
- **No removal of existing prose docs.** `core/` stays as human-readable reference.

---

## Task 0 — Project runtime

**Why first:** Subsequent tasks need npm + ajv + bin layout. Without this, infrastructure decisions leak into Task 3.

**Deliverables:**
- `package.json` (name, version, bin entry, ajv dependency)
- `package-lock.json` (committed, for reproducibility)
- `.gitignore` updated (already has `node_modules/`)
- `bin/signalshape` — empty executable skeleton (`#!/usr/bin/env node` + TODO)
- `.github/workflows/ci.yml` — minimal scaffold (npm install + placeholder)

**Verification:**
- [ ] `npm install` succeeds
- [ ] `node bin/signalshape --version` prints `0.1.0`
- [ ] CI workflow file is valid YAML

---

## Task 1 — Common envelope

**Why:** Every shape schema embeds it. Building schemas before envelope = rework.

**Deliverable:** `spec/envelope.md` + `schemas/envelope.schema.json`

### Envelope fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `shape` | enum | yes | `"handoff" \| "status" \| "decision" \| "debug" \| "review" \| "implement" \| "explain" \| "writing"` |
| `version` | string | yes | semver, **`"0.1.0"`** for v0.1 — *= SignalShape contract version* |
| `producer` | string | yes | regex `^[a-z][a-z0-9-]*$`, minLength 1, maxLength 80 |
| `consumer_hint` | enum | no | `"orchestrator" \| "worker" \| "verifier" \| "human"` |
| `confidence` | enum | no | `"high" \| "medium" \| "low"` |
| `requires_human` | boolean | no | If omitted, consumers MUST interpret as `false` (prose-spec rule, not JSON Schema default) |
| `payload` | object | yes | shape-specific content |

### `version` semantic (mandatory in spec)

> Message `version` identifies the **SignalShape contract version** used by the producer.
> Shape schemas may evolve, but breaking validation semantics require a contract version bump.

### What counts as a breaking change (mandatory in spec)

| Change | Breaking? |
|---|---|
| Add optional field | No |
| Remove optional field | Yes |
| Make optional → required | Yes |
| Make required → optional | No |
| Add enum value | No |
| Remove enum value | Yes |
| Add `additionalProperties: false` to existing schema | Yes |

### `additionalProperties` policy (mandatory in spec)

- **Envelope:** `additionalProperties: false`
- **Payloads (Handoff/Status/Decision/Debug top-level):** `additionalProperties: false`
- **Free-form sub-fields (`state`, `context`):** open — explicit contract for arbitrary extension

### `confidence` enum (not float) — rationale

LLM-produced floats have unstable semantics across calls and models. Buckets are honest about what we can measure.

### `consumer_hint` (not `consumer`) — rationale

Producer often doesn't know the consumer. Renaming = honest semantics.

**Verification:**
- [ ] `spec/envelope.md` documents each field with rationale + breaking-change table
- [ ] `schemas/envelope.schema.json` is valid JSON Schema draft-2020-12
- [ ] At least 2 example envelopes (minimal, full)

---

## Task 2 — 4 shape schemas

**Why:** Schemas need envelope. Order: Handoff → Status → Decision → Debug.

**Deliverables:**
- `spec/handoff.md` + `schemas/handoff.schema.json`
- `spec/status.md` + `schemas/status.schema.json`
- `spec/decision.md` + `schemas/decision.schema.json`
- `spec/debug.md` + `schemas/debug.schema.json`

### Handoff payload

```json
{
  "goal": "string (required)",
  "state": { "/* free-form, additionalProperties open */": "any" },
  "decisions": [{ "what": "string", "why": "string" }],
  "files_touched": [{ "path": "string", "change": "modified|created|deleted" }],
  "next": [{ "action": "string", "owner": "string|null" }],
  "risks": [{ "risk": "string", "mitigation": "string|null" }]
}
```

### Status payload

```json
{
  "done": ["string"],
  "current": "string",
  "next": ["string"],
  "blocked_by": "string|null"
}
```

### Decision payload

```json
{
  "recommendation": "string (required)",
  "reason": "string (required)",
  "options_considered": [{ "option": "string", "tradeoff": "string" }],
  "when_to_choose_other": "string|null"
}
```

### Debug payload

```json
{
  "hypothesis": "string (required)",
  "checks": [{ "command": "string", "expected": "string" }],
  "next_action": "retry|escalate|abort|investigate (enum)",
  "context": { "/* free-form, additionalProperties open */": "any" }
}
```

### Status vs Handoff disambiguation rule (mandatory in both specs)

> **Handoff** = "I disconnect, someone else continues." Ownership transfers.
> **Status** = "I continue, I'm telling you where I am." Ownership stays.
> Unsure? Are you about to stop working? Handoff. About to keep working? Status.

### Schema composition strategy

Each shape schema uses `allOf` referencing `envelope.schema.json`, plus a `const` constraint on `shape` (e.g., `"const": "handoff"`). If `unevaluatedProperties` interactions get fragile, fallback to pragmatic duplication of envelope fields. Decision at code-time, not now.

**Verification per schema:**
- [ ] Spec doc with field-by-field rationale
- [ ] Valid JSON Schema file
- [ ] 2-3 example payloads (minimal, typical, edge)
- [ ] Composition with envelope works (validator accepts/rejects correctly)

---

## Task 3 — CLI validator + CI workflow

**Why:** Without enforcement, schemas are suggestions.

**Deliverable:** `bin/signalshape` (Node, single file, `ajv` dependency)

### Usage

```sh
signalshape lint output.json                 # validates one file
signalshape lint --shape handoff f.json      # require envelope.shape == handoff (does NOT bypass envelope check)
signalshape lint --allow-prose-shapes f.json # exit 0 instead of 4 for recognized-but-not-validatable shapes
cat output.json | signalshape lint -         # stdin
signalshape --version
signalshape --help
```

### Exit codes

```
0 = valid
1 = invalid (machine-validatable shape failed validation)
2 = malformed JSON
3 = unknown shape (not in SignalShape registry)
4 = recognized but not machine-validatable in this version (e.g., review/implement/explain/writing)
```

Default is strict. `--allow-prose-shapes` opts in to exit 0 for code 4.

### `--shape` semantic

`--shape handoff f.json` means: "require envelope.shape === 'handoff' AND validate as handoff." Mismatch = exit 1. Does NOT bypass envelope.shape check.

### Distribution v0.1

- Committed to repo, run via `./bin/signalshape` after `npm install`
- No npm publish (v0.2)

### CI workflow (`.github/workflows/ci.yml`)

- Trigger: push to main, PRs
- Steps: checkout, node 20, `npm ci`, `./bin/signalshape lint examples/workflows/**/*.json`
- README badge on green

**Verification:**
- [ ] Validates Task 2 example payloads (exit 0)
- [ ] Rejects malformed envelope (exit 1: missing `shape`, wrong `version`)
- [ ] Rejects shape with missing required payload field (exit 1)
- [ ] Returns exit 4 on `shape: "review"` without flag, exit 0 with `--allow-prose-shapes`
- [ ] Returns exit 3 on `shape: "nonsense"`
- [ ] Returns exit 2 on broken JSON
- [ ] CI workflow passes on first push

---

## Task 4 — Demo workflow

**Why:** Spec without worked example is unconvincing. This is the proof.

**Deliverable:** `examples/workflows/orchestrator-worker-handoff/`
- `README.md` — narrative of the flow, *why each shape was chosen at each step*
- `01-orchestrator-decision.json` — orchestrator decides "spawn implementation worker"
- `02-worker-status.json` — worker reports mid-flight
- `03-worker-debug.json` — worker hits error, `next_action: escalate`
- `04-worker-handoff.json` — worker hands off to verifier with full context
- `run-demo.sh` — script that lints all four files in order

**Verification:**
- [ ] `./run-demo.sh` runs validator on all 4, all pass (exit 0)
- [ ] README explains *why* each shape, not just *what* the file contains
- [ ] Demo runs in <5 seconds (static files, no LLM calls)

---

## Task 5 — Update SKILL.md

**Why:** Skill currently teaches prose shapes. Should teach JSON for the 4 machine-validatable ones.

**Deliverable:** updated `skills/signalshape/SKILL.md`

**Changes:**
- New section "Machine-validatable shapes (v0.1)" listing Handoff/Status/Decision/Debug with schema links
- For each: "When emitting for another agent, output JSON conforming to schema. When emitting for human, prose form is fine."
- Existing prose-shape doctrine intact for Review/Implement/Explain/Writing
- Add: "If unsure whether output will be consumed by an agent, prefer JSON."
- Frontmatter `description` updated to reflect new positioning

**Verification:**
- [ ] SKILL.md still passes Claude Code skill format
- [ ] Manual test: spawn Claude session with updated skill, multi-agent task → emits valid JSON
- [ ] Frontmatter description mentions "communication contract" not just "style"

---

## Task 6 — Rewrite README

**Why:** README sells the project. Must match what's shipped.

**Deliverable:** new `README.md` at root

**Required sections:**

1. **One-line pitch:**
   > SignalShape is a lightweight communication contract for AI agents. It defines response shapes that humans can read and other agents can validate, consume, and hand off.

2. **The shift** — explicit "from style skill to communication contract"
3. **What's in v0.1** — 4 schemas, validator, demo
4. **Why not just use [humanizer / caveman / structured prompting]?** — answers differentiation head-on
5. **Quick start** — `./bin/signalshape lint examples/workflows/.../*.json` in 30 seconds
6. **Roadmap to v0.2** — what's deliberately out of scope
7. **Non-goals** — augmented with v0.1-specific ones

**Verification:**
- [ ] No "protocol" claim — uses "contract"
- [ ] References demo as primary proof
- [ ] Has "vs alternatives" section
- [ ] Validates against `core/human-signal.md` rules (no AI slop)

---

## Sequence and dependencies

```
Task 0 (runtime)
   ↓
Task 1 (envelope)
   ↓
Task 2 (4 schemas) ──┐
                     ↓
                 Task 3 (validator + CI) ──┐
                                           ↓
                                       Task 4 (demo)
                                           ↓
                                 Task 5 (SKILL.md) ──┐
                                                     ↓
                                               Task 6 (README)
```

---

## Definition of done for v0.1

- [ ] `./bin/signalshape lint examples/workflows/orchestrator-worker-handoff/*.json` exits 0 on all 4
- [ ] CI badge in README shows passing
- [ ] README "vs alternatives" section answers "what breaks if I remove SignalShape?"
- [ ] External developer reads demo README and understands loop in <5 minutes
- [ ] Tagged release `v0.1.0` on GitHub

---

## Deferred to v0.2

- Review and Implement schemas
- npm package distribution
- Hooks for Claude Code
- A2A / MCP compatibility
- Confidence as numeric value
- `correlation_id` for tracing
- Empirical token-saving benchmarks
