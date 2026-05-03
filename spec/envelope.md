# SignalShape Envelope (v0.1)

The envelope is the outer wrapper every SignalShape message carries.
It identifies the message **shape**, the contract **version**, and the **producer** —
plus optional routing and trust hints.

Every machine-validatable shape (Handoff, Status, Decision, Debug) inlines this envelope.

---

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `shape` | enum string | yes | One of: `handoff`, `status`, `decision`, `debug`, `review`, `implement`, `explain`, `writing` |
| `version` | string (semver) | yes | SignalShape contract version. v0.1 = `"0.1.0"` |
| `producer` | string | yes | `^[a-z][a-z0-9-]*$`, length 1–80 |
| `consumer_hint` | enum string | no | One of: `orchestrator`, `worker`, `verifier`, `human` |
| `confidence` | enum string | no | One of: `high`, `medium`, `low` |
| `requires_human` | boolean | no | If omitted, consumers MUST interpret as `false` |
| `payload` | object | yes | Shape-specific content (see per-shape spec) |

`additionalProperties: false` is enforced on the envelope. Unknown fields → validation fail.

---

## Field semantics

### `shape`

The kind of message. Validators dispatch on this. The 8 enum values reflect SignalShape's full
shape catalog. Only the first 4 (`handoff`, `status`, `decision`, `debug`) are
machine-validatable in v0.1. The other 4 are valid envelope values but their `payload`
is not constrained in v0.1.

### `version`

`version` identifies the **SignalShape contract version** used by the producer.
This is the contract version, **not** the version of an individual shape schema.

> Shape schemas may evolve internally, but breaking validation semantics
> require a contract version bump.

### `producer`

Free-form agent identifier, but constrained to a kebab-style ASCII pattern so
orchestrators can route, log, and aggregate without parsing fragility.

Examples: `orchestrator`, `worker-1`, `verifier`, `codex-agent`, `gsd-planner`.

### `consumer_hint`

A hint about who the producer *expects* to consume the message. Not a contract —
the actual consumer may differ. Use for routing heuristics, not access control.

### `confidence`

Producer's self-assessed confidence in the payload. Discrete buckets, not a float.

> Floats from LLMs lack stable semantics across calls and models. `0.82` today
> ≠ `0.82` tomorrow. Buckets are honest about what we can measure.

### `requires_human`

If `true`, the message asks for human input or approval before downstream consumption.

JSON Schema's `default` keyword is annotation-only and is **not** applied during
validation. Therefore: if `requires_human` is omitted, consumers MUST interpret
the value as `false`. This rule lives here in prose, not in the schema.

### `payload`

Object whose schema is determined by `shape`. See:

- `spec/handoff.md`
- `spec/status.md`
- `spec/decision.md`
- `spec/debug.md`

For shapes not yet machine-validatable (`review`, `implement`, `explain`, `writing`),
`payload` is an arbitrary object — validators report exit code 4.

---

## `additionalProperties` policy

| Location | Policy |
|---|---|
| Envelope top-level | `additionalProperties: false` |
| Payload top-level (per shape) | `additionalProperties: false` |
| `payload.state` (Handoff), `payload.context` (Debug) | open — explicit extension points |

Extension points exist precisely because we know we cannot enumerate
all useful context up front. Everything else is locked.

---

## Breaking-change policy

What requires a contract version bump (e.g., `0.1.0 → 0.2.0`):

| Change | Breaking? |
|---|---|
| Add optional field to envelope or payload | No |
| Remove optional field | Yes (existing consumers may depend on it) |
| Change optional → required | Yes |
| Change required → optional | No |
| Add value to enum (`shape`, `consumer_hint`, etc.) | No |
| Remove value from enum | Yes |
| Add `additionalProperties: false` to a previously open object | Yes |
| Tighten regex on `producer` | Yes |
| Loosen regex on `producer` | No |

Strict consumers may treat enum-value additions as breaking. That is documented
as a *consumer choice*, not a producer concern.

---

## Examples

### Minimal envelope

```json
{
  "shape": "status",
  "version": "0.1.0",
  "producer": "worker-1",
  "payload": {
    "done": ["read repo"],
    "current": "drafting plan",
    "next": ["share plan with orchestrator"],
    "blocked_by": null
  }
}
```

### Full envelope

```json
{
  "shape": "handoff",
  "version": "0.1.0",
  "producer": "implementation-worker",
  "consumer_hint": "verifier",
  "confidence": "high",
  "requires_human": false,
  "payload": {
    "goal": "validate the auth refactor",
    "state": { "branch": "feat/auth-refactor", "commits": 4 },
    "decisions": [
      { "what": "switched to JWT with rotating refresh tokens", "why": "session table was a bottleneck" }
    ],
    "files_touched": [
      { "path": "src/auth/session.ts", "change": "modified" },
      { "path": "src/auth/jwt.ts", "change": "created" }
    ],
    "next": [
      { "action": "run integration tests on auth module", "owner": "verifier" }
    ],
    "risks": [
      { "risk": "no migration for existing sessions", "mitigation": "ship behind feature flag" }
    ]
  }
}
```
