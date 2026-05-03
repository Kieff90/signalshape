---
name: signalshape
description: >
  Communication contract for AI agents. Use when output may be consumed by another
  agent (orchestrator, worker, verifier) — emits JSON conforming to SignalShape
  schemas. Also gives prose response shapes for human-facing replies. Reduces
  filler, sharpens reviews, structures handoffs and status updates.
---

# SignalShape

SignalShape gives the agent the right response shape before it speaks.

There are two modes:

1. **Machine-validatable shapes (v0.1):** `handoff`, `status`, `decision`, `debug`.
   When emitting these for another agent, output JSON conforming to the schema.
2. **Prose shapes:** `review`, `implement`, `explain`, `writing`. Use prose forms
   (templates below). v0.1 does not constrain these as JSON.

Rule of thumb: **if your output may be consumed by another agent, prefer JSON.**
Humans can read JSON. Agents struggle with prose.

## Manager Pass

Before answering, silently decide:

1. **Task type:** debug, review, implement, explain, status, writing, decision, handoff.
2. **Consumer:** human, orchestrator, worker, verifier?
3. **Mode:** machine-validatable JSON, or prose?
4. **Evidence needed:** files, lines, errors, commands, assumptions, test results.
5. **Token budget:** tiny, work, deep, or handoff.

Expose this pass only when it helps the user.

## Machine-validatable shapes (v0.1)

For these four shapes, when output is consumed by another agent, emit JSON
matching the schema in `schemas/<shape>.schema.json`. Wrap every payload in the
[envelope](../../spec/envelope.md):

```json
{
  "shape": "<shape-name>",
  "version": "0.1.0",
  "producer": "<your-agent-id>",
  "consumer_hint": "<orchestrator|worker|verifier|human>",
  "confidence": "<high|medium|low>",
  "requires_human": false,
  "payload": { /* shape-specific */ }
}
```

### Handoff — transfer ownership

[`spec/handoff.md`](../../spec/handoff.md)

Use when you disconnect and another agent (or session) continues.

```json
{
  "payload": {
    "goal": "what the next agent should accomplish",
    "state": { "/* free-form context */": null },
    "decisions": [{ "what": "...", "why": "..." }],
    "files_touched": [{ "path": "...", "change": "modified" }],
    "next": [{ "action": "...", "owner": "verifier" }],
    "risks": [{ "risk": "...", "mitigation": "..." }]
  }
}
```

### Status — in-flight progress

[`spec/status.md`](../../spec/status.md)

Use while you are still working. Producer keeps ownership.

```json
{
  "payload": {
    "done": ["task 1", "task 2"],
    "current": "what you are doing right now",
    "next": ["upcoming task"],
    "blocked_by": null
  }
}
```

### Decision — routing or strategic choice

[`spec/decision.md`](../../spec/decision.md)

Use when picking between options.

```json
{
  "payload": {
    "recommendation": "the chosen action",
    "reason": "why",
    "options_considered": [{ "option": "...", "tradeoff": "..." }],
    "when_to_choose_other": null
  }
}
```

### Debug — failure with routable next action

[`spec/debug.md`](../../spec/debug.md)

Use on errors. `next_action` is one of: `retry`, `escalate`, `abort`, `investigate`.
The orchestrator branches on it.

```json
{
  "payload": {
    "hypothesis": "best guess at the cause",
    "checks": [{ "command": "...", "expected": "..." }],
    "next_action": "escalate",
    "context": { "error_excerpt": "...", "/* free-form */": null }
  }
}
```

### Status vs Handoff

> **Status** = "I continue, I'm telling you where I am." Ownership stays.
> **Handoff** = "I disconnect, someone else continues." Ownership transfers.
> About to keep working? Status. About to stop? Handoff.

## Prose shapes (still v0.1, not machine-validated)

For human-facing output, the original prose shapes still apply:

### Review

```text
Findings:
- file:line: risk. fix.

Test gap:
```

Findings first. No praise before bugs.

### Implement

```text
Plan:
Change:
Verify:
```

### Explain

```text
Core idea:
Example:
Tradeoff:
```

### Writing

```text
Draft:
Anti-slop audit:
Final:
```

Cut AI tells: fake warmth, inflated significance, generic uplift, vague attribution.

## Budgets

Tiny (1–40 words): direct answer only.
Work (40–160 words, default): decision + next action.
Deep (160+ words): structure must earn the length.
Handoff: dense bullets, no prose padding.

## Cut List

Remove:

- "Sure", "Certainly", "Of course", "Great question"
- "It is important to note", "There are several factors"
- "This highlights", "This underscores", "In today's landscape"
- "let me know if you want"
- repeated restatement of the user request
- generic positive conclusions
- praise padding

## Keep List

Keep:

- exact errors, commands, file paths, line numbers
- constraints, assumptions, verification results
- decisions and reasons
- real blockers

## Core Rule

Lead with the useful part. Keep enough context for the user (or next agent) to
act. Cut everything else.

## Validation

If you emitted JSON for one of the machine-validatable shapes, your output can
be checked locally:

```sh
echo '<your-json>' | ./bin/signalshape lint -
```

Exit codes: `0` valid, `1` invalid, `2` malformed JSON, `3` unknown shape,
`4` recognized but not machine-validatable in this version.
