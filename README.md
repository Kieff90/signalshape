# SignalShape

A lightweight communication contract for AI agents.

SignalShape defines response shapes that **humans can read** and **other agents
can validate, consume, and hand off**. v0.1 ships four machine-validatable
shapes — Handoff, Status, Decision, Debug — plus a CLI validator and a worked
multi-agent demo.

SignalShape makes agent outputs testable: key messages can be validated with
deterministic checks instead of judged only by humans or LLMs.

[![ci](https://github.com/Kieff90/signalshape/actions/workflows/ci.yml/badge.svg)](https://github.com/Kieff90/signalshape/actions/workflows/ci.yml)

---

## The shift (vs the original SignalShape)

The earlier version of SignalShape was a *style skill*: it taught agents to
write tighter prose for humans. Useful, but it competed with every other
"write better" prompt out there.

v0.1 changes category. SignalShape is now a *communication contract*: the four
machine-validatable shapes carry an explicit envelope (`shape`, `version`,
`producer`, `payload`, …) so an orchestrator can route on them without parsing
prose.

| Before | Now |
|---|---|
| 8 prose response shapes | 4 JSON-validatable shapes + 4 prose-only shapes |
| Markdown doctrine | Spec + JSON schemas + CLI validator |
| "Make the agent talk better" | "Make agent outputs consumable by other agents" |
| "Looks structured" | Deterministic checks with `signalshape lint` |

The token-saving and anti-slop benefits are still there. They are no longer the
headline — they are a side effect of the contract being well-shaped.

---

## What's in v0.1

- **4 JSON schemas** in [`schemas/`](schemas) — Handoff, Status, Decision, Debug
- **Field-by-field specs** in [`spec/`](spec) including the envelope and the breaking-change policy
- **CLI validator** at [`bin/signalshape`](bin/signalshape) — Node + ajv, draft-2020-12
- **Worked multi-agent demo** at [`examples/workflows/orchestrator-worker-handoff/`](examples/workflows/orchestrator-worker-handoff)
- **Updated skill** at [`skills/signalshape/SKILL.md`](skills/signalshape/SKILL.md) — teaches JSON for the 4 contract shapes, prose for the rest
- **CI** that lints the demo on every push

---

## How you can use it

SignalShape can be used at three levels. They are related, but not the same thing.

### 1. As a manual skill

Install [`skills/signalshape/SKILL.md`](skills/signalshape/SKILL.md) into Claude Code or Codex, then ask the agent to use SignalShape.

Use this when you want one agent to answer with the right shape: JSON when another agent may consume the output, prose when the answer is for a human.

### 2. As project instructions

Paste [`prompts/repo-instructions.md`](prompts/repo-instructions.md) into `AGENTS.md`, `CLAUDE.md`, or another repo-level instruction file.

Use this when you want agents working inside a repository to follow SignalShape automatically without manually invoking a skill every time.

### 3. As an agent contract

Use the schemas in [`schemas/`](schemas) and validate messages with:

```sh
./bin/signalshape lint output.json
```

Use this when one agent's output becomes another agent's input. This is the core v0.1 use case.

It also gives you a deterministic evaluation target: CI, workflow engines, or
orchestrators can fail malformed messages before another agent consumes them.

The shortest version:

| Use case | File or tool | What it gives you |
|---|---|---|
| Human manually invokes it | `skills/signalshape/SKILL.md` | Better-shaped replies and JSON handoffs on request |
| Repo-level default behavior | `prompts/repo-instructions.md` | Persistent instructions for Codex, Claude Code, or similar agents |
| Agent-to-agent workflow | `schemas/` + `bin/signalshape` | Machine-validatable messages |
| Slash command / custom command | `commands/signalshape.md` | A reusable one-shot prompt |

---

## Quick start

```sh
git clone https://github.com/Kieff90/signalshape
cd signalshape
npm install
npm run lint:demo
```

Expected output (abridged):

```
-- 1. orchestrator decides which worker to spawn
.../01-orchestrator-decision.json: valid (decision)

-- 2. worker reports mid-flight progress
.../02-worker-status.json: valid (status)

-- 3. worker hits unexpected error, escalates
.../03-worker-debug.json: valid (debug)

-- 4. worker hands off to verifier
.../04-worker-handoff.json: valid (handoff)

✓ all four messages validated
```

That's the whole loop: an orchestrator emits a Decision, a worker reports
Status, hits a Debug, and finally Handoffs to a verifier — all four messages
machine-validated.

Read the [demo README](examples/workflows/orchestrator-worker-handoff/README.md) for the narrative.

---

## Why not just use [humanizer / caveman / structured prompting]?

These are real alternatives — many of them already installed in agent setups.
The honest answer:

| Tool | What it does | What it doesn't do |
|---|---|---|
| `humanizer` | Strips AI tells from prose | No machine contract |
| `caveman` | Compresses tokens | No structure for downstream agents |
| Generic structured prompting | One-off prompt schemas per task | No shared contract across agents |
| **SignalShape v0.1** | Versioned contract with validator + deterministic checks across 4 shapes | Not a transport, not an SDK, not a full multi-agent protocol |

If your agent only talks to humans, those tools probably cover you.
If your agent's output is **consumed by another agent**, SignalShape gives you
a checkable contract that survives across producer / consumer pairs.

Concrete answer to "what breaks if I remove SignalShape?":

> You lose the shared contract that lets an orchestrator validate, route on,
> and hand off output between agents without parsing prose.

---

## Shape summary

| Shape | Use when | Consumed by | Machine-validated in v0.1 |
|---|---|---|---|
| `handoff` | One agent disconnects, another continues | Receiving agent | ✓ |
| `status` | Producer continues, reports progress | Orchestrator | ✓ |
| `decision` | Routing or strategic choice between options | Orchestrator (routing) | ✓ |
| `debug` | Failure with `next_action` for branching | Orchestrator (error path) | ✓ |
| `review` | PR / code review findings | Human or downstream | (prose only in v0.1) |
| `implement` | Plan / patch / verify | Human or verifier | (prose only in v0.1) |
| `explain` | Concept / example / tradeoff | Human | (prose only in v0.1) |
| `writing` | Public-facing copy with anti-slop pass | Human | (prose only in v0.1) |

The selection criterion for v0.1: each machine-validatable shape is consumed by
**another agent** in real orchestration loops. Review and Implement are
typically read by humans or end the chain — they can wait for v0.2 when we
have data on how teams use them.

---

## Install as a skill

### Claude Code

```sh
./scripts/install.sh claude
```

Or manually:

```sh
mkdir -p ~/.claude/skills
cp -R skills/signalshape ~/.claude/skills/signalshape
```

### Codex

```sh
./scripts/install.sh codex
```

Or manually:

```sh
mkdir -p ~/.agents/skills
cp -R skills/signalshape ~/.agents/skills/signalshape
```

### Generic agents

Use the prompt files in [`prompts/`](prompts) or the slash command in [`commands/`](commands). For repo-level automation, paste [`prompts/repo-instructions.md`](prompts/repo-instructions.md) into `AGENTS.md`, `CLAUDE.md`, or your agent framework's equivalent instruction file.

---

## Validator usage

```sh
# Validate a single file
./bin/signalshape lint output.json

# Require a specific shape (does NOT bypass envelope check — mismatch fails)
./bin/signalshape lint --shape handoff output.json

# Allow recognized-but-not-machine-validated shapes (review, implement, etc.) to pass
./bin/signalshape lint --allow-prose-shapes output.json

# stdin
cat output.json | ./bin/signalshape lint -

# Multiple files (highest exit code wins)
./bin/signalshape lint examples/workflows/**/*.json
```

Exit codes:

| Code | Meaning |
|---|---|
| `0` | Valid |
| `1` | Invalid (validation failed) |
| `2` | Malformed JSON |
| `3` | Unknown shape |
| `4` | Recognized but not machine-validatable in v0.1 |
| `64` | Usage error |

Default is **strict**. CI workflows will fail on code 4 unless you opt in to
`--allow-prose-shapes`.

---

## Roadmap to v0.2 (deliberately not in v0.1)

- Schemas for `review` and `implement` (require domain modeling)
- npm package distribution
- Hooks for Claude Code so the harness enforces shape, not the agent's memory
- A2A / MCP compatibility analysis
- Numeric `confidence` (only after we have data on how it's actually used)
- `correlation_id` for multi-agent tracing
- Empirical token-saving benchmarks

---

## Non-goals

SignalShape v0.1 is **not**:

- A full multi-agent protocol (no transport, no discovery, no auth)
- An SDK or runtime — just schemas and a validator
- A replacement for model reasoning
- A conversation-history compressor
- A persona — it doesn't make agents pretend to be anything

Long answers are still allowed when they earn their length.

---

## Contributing

The interesting failure mode of SignalShape v0.1 is "the demo workflow doesn't
read clearly with these four shapes." If that happens, the schemas need
refining, not the demo bending around them.

If you find a real multi-agent workflow that the four shapes can't express
cleanly, open an issue with the message sequence — that's the highest-signal
feedback for v0.2 design.

---

## License

MIT. See [LICENSE](LICENSE).
