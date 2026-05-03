# Demo: orchestrator → worker → handoff

A four-message conversation between three agents. Each message uses one of the
four machine-validatable SignalShape shapes. The point: an orchestrator can
read every message in this flow and route programmatically — no prose parsing.

## The story

```
orchestrator              implementation-worker            verifier
     │                              │                          │
     │  1. Decision: spawn worker   │                          │
     │ ────────────────────────────▶│                          │
     │                              │                          │
     │  2. Status: mid-flight       │                          │
     │ ◀────────────────────────────│                          │
     │                              │                          │
     │  3. Debug: escalate          │                          │
     │ ◀────────────────────────────│                          │
     │                              │                          │
     │       (orchestrator decides: continue worker)           │
     │                              │                          │
     │                              │  4. Handoff: take over   │
     │                              │ ────────────────────────▶│
```

## Why each shape was chosen

### 1. `Decision` — orchestrator picks who to spawn

[`01-orchestrator-decision.json`](01-orchestrator-decision.json)

The orchestrator has a locked task spec and needs to choose between three options
(implementation-worker, research-worker, ask-human). `Decision` makes the choice
*and* the rejected alternatives readable to anything downstream — useful for
audit logs and for debugging "why did the orchestrator do that?" later.

`recommendation` is a single short string an orchestrator can route on:
`spawn implementation-worker`. Not prose. Not a paragraph. A token.

### 2. `Status` — worker reports mid-flight

[`02-worker-status.json`](02-worker-status.json)

The worker is mid-task. It is **not** giving up ownership. It is telling the
orchestrator where it is so the orchestrator can decide whether to keep waiting
or intervene.

`done` / `current` / `next` give the orchestrator a state machine view of the
worker without parsing prose. `blocked_by: null` confirms forward progress.

This is the explicit Status-vs-Handoff distinction in action: the worker keeps
working after sending this. Use Status when you continue. Use Handoff when you stop.

### 3. `Debug` — worker hits an error and escalates

[`03-worker-debug.json`](03-worker-debug.json)

The worker has hit a failure it cannot resolve in-loop. The interesting field
is `next_action: "escalate"`. The orchestrator branches on this enum:

- `retry` → spawn the same worker again
- `escalate` → notify human or upgrade to a more capable agent
- `abort` → cancel the workflow
- `investigate` → spawn a debugger / reader agent

Without a structured `next_action`, the orchestrator would have to parse the
worker's prose to decide what to do. With it, branching is one switch statement.

`requires_human: true` and `confidence: "low"` together signal: this is a real
escalation, not a transient blip.

### 4. `Handoff` — worker transfers ownership to verifier

[`04-worker-handoff.json`](04-worker-handoff.json)

The worker has finished the implementation slice and is **giving up ownership**.
Note this is *Handoff*, not *Status*. The producer is about to disconnect — the
verifier needs everything required to continue without re-reading the chat.

`goal`, `state`, `decisions`, `files_touched`, `next`, `risks` together let the
verifier start work cold. `decisions` is critical — it tells the verifier which
choices are locked (do not relitigate JWT vs Redis sessions; that decision is made).

## Run it

From the repo root:

```sh
npm install            # one-time, installs ajv
./examples/workflows/orchestrator-worker-handoff/run-demo.sh
```

Or, equivalently:

```sh
npm run lint:demo
```

All four files should print `valid (<shape>)` and the script exits 0.

## What this proves

If a real orchestrator can be wired to:

1. **Emit** Decision when routing
2. **Read** Status to track in-flight workers
3. **Read** Debug and switch on `next_action`
4. **Read** Handoff when ownership transfers

…then SignalShape is doing the job it was designed for: making agent outputs
*consumable by other agents*, not just readable by humans.
