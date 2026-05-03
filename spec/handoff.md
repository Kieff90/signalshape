# Handoff Shape

Use when one agent transfers ownership of a task to another agent (or future session).

## When Handoff vs Status

> **Handoff** = "I disconnect, someone else continues." Ownership transfers.
> **Status** = "I continue, I'm telling you where I am." Ownership stays.
>
> Unsure? Are you about to stop working? Handoff. About to keep working? Status.

## Payload fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `goal` | string | yes | What the next agent should accomplish. Imperative phrasing. |
| `state` | object | no | Free-form context. **Open** (additionalProperties allowed). |
| `decisions` | array of `{what, why}` | no | Locked decisions the next agent should not relitigate. |
| `files_touched` | array of `{path, change}` | no | Files the producer modified/created/deleted. `change` ∈ `modified \| created \| deleted`. |
| `next` | array of `{action, owner?}` | no | Concrete next actions. `owner` optional, free-form. |
| `risks` | array of `{risk, mitigation?}` | no | Risks to flag. `mitigation` optional. |

`additionalProperties: false` on payload top-level. `state` is the explicit extension point.

## Examples

### Minimal

```json
{
  "shape": "handoff",
  "version": "0.1.0",
  "producer": "implementer",
  "payload": {
    "goal": "verify the auth refactor passes integration tests"
  }
}
```

### Typical

```json
{
  "shape": "handoff",
  "version": "0.1.0",
  "producer": "implementer",
  "consumer_hint": "verifier",
  "payload": {
    "goal": "verify the auth refactor passes integration tests",
    "state": { "branch": "feat/auth-refactor", "commits_ahead": 4 },
    "decisions": [
      { "what": "rotating refresh tokens, 7-day TTL", "why": "session table was a write bottleneck" }
    ],
    "files_touched": [
      { "path": "src/auth/session.ts", "change": "modified" },
      { "path": "src/auth/jwt.ts", "change": "created" }
    ],
    "next": [
      { "action": "run integration tests in apps/api", "owner": "verifier" }
    ],
    "risks": [
      { "risk": "existing sessions will be invalidated on deploy", "mitigation": "feature flag + 24h dual-stack window" }
    ]
  }
}
```

### Edge: minimal `next` without `owner`

```json
{
  "shape": "handoff",
  "version": "0.1.0",
  "producer": "researcher",
  "payload": {
    "goal": "draft architecture decision record",
    "next": [{ "action": "write ADR-0042 from research findings" }]
  }
}
```
