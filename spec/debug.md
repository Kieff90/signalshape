# Debug Shape

Use when an agent encounters an error, failing test, or unexpected behavior and
needs to communicate the failure for downstream decision-making (retry, escalate,
abort, or investigate further).

## Why this is machine-consumable

The `next_action` field is an enum. An orchestrator can branch on it without
parsing prose:

- `retry` → re-spawn the same task
- `escalate` → spawn a more capable agent or notify human
- `abort` → cancel the workflow, propagate failure
- `investigate` → spawn a debugger / reader agent

## Payload fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `hypothesis` | string | yes | Producer's best guess about the cause. One or two sentences. |
| `checks` | array of `{command, expected}` | no | Commands or queries the next agent (or human) can run to validate. |
| `next_action` | enum string | yes | One of: `retry`, `escalate`, `abort`, `investigate` |
| `context` | object | no | Free-form. **Open** (additionalProperties allowed). Carries error excerpts, stack traces, environment info. |

`additionalProperties: false` on payload top-level. `context` is the explicit extension point.

## Examples

### Retry-able failure

```json
{
  "shape": "debug",
  "version": "0.1.0",
  "producer": "implementer",
  "consumer_hint": "orchestrator",
  "payload": {
    "hypothesis": "transient network failure pulling docker image",
    "checks": [
      { "command": "docker pull node:20", "expected": "image pulled successfully" }
    ],
    "next_action": "retry",
    "context": { "attempt": 1, "error_excerpt": "TLS handshake timeout" }
  }
}
```

### Escalation

```json
{
  "shape": "debug",
  "version": "0.1.0",
  "producer": "implementer",
  "consumer_hint": "orchestrator",
  "confidence": "low",
  "requires_human": true,
  "payload": {
    "hypothesis": "the failing migration depends on a column that does not exist in any migration file",
    "checks": [
      { "command": "grep -r 'users.legacy_role' migrations/", "expected": "find the migration that adds this column" }
    ],
    "next_action": "escalate",
    "context": {
      "error_excerpt": "ERROR: column \"legacy_role\" does not exist",
      "migration": "20240412_add_legacy_role_index.sql",
      "schema_history_inspected": true
    }
  }
}
```

### Abort

```json
{
  "shape": "debug",
  "version": "0.1.0",
  "producer": "verifier",
  "payload": {
    "hypothesis": "test suite reveals data loss in the migration; rollback unsafe at this point",
    "next_action": "abort",
    "context": {
      "rows_lost": 142,
      "table": "user_preferences"
    }
  }
}
```

### Investigation needed

```json
{
  "shape": "debug",
  "version": "0.1.0",
  "producer": "implementer",
  "payload": {
    "hypothesis": "intermittent test failure suggests race condition in the cache invalidation logic",
    "checks": [
      { "command": "go test -run TestCacheInvalidation -count=100 -race", "expected": "consistent failure pattern or race detector hit" }
    ],
    "next_action": "investigate"
  }
}
```
