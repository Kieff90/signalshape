# Decision Shape

Use when an agent (typically an orchestrator) needs to communicate a routing or
strategic choice between options.

## Why this is machine-consumable

A downstream agent can read `recommendation` and route programmatically without
parsing prose. Useful for orchestrators choosing which worker to spawn, which
branch to take, or which tool to invoke.

## Payload fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `recommendation` | string | yes | The chosen option/action. Machine-routable when concise. |
| `reason` | string | yes | Why this option was chosen. One or two sentences. |
| `options_considered` | array of `{option, tradeoff}` | no | Alternatives the producer rejected. |
| `when_to_choose_other` | string \| null | no | Conditions under which an alternative would win. |

`additionalProperties: false` on payload top-level.

## Examples

### Routing decision (orchestrator)

```json
{
  "shape": "decision",
  "version": "0.1.0",
  "producer": "orchestrator",
  "consumer_hint": "worker",
  "confidence": "high",
  "payload": {
    "recommendation": "spawn implementation-worker",
    "reason": "task spec is locked, no open questions, ready to write code",
    "options_considered": [
      { "option": "spawn research-worker", "tradeoff": "would re-research already-decided context" },
      { "option": "ask human for clarification", "tradeoff": "no actual ambiguity in spec" }
    ],
    "when_to_choose_other": null
  }
}
```

### Architectural decision

```json
{
  "shape": "decision",
  "version": "0.1.0",
  "producer": "architect-agent",
  "confidence": "medium",
  "requires_human": true,
  "payload": {
    "recommendation": "use JWT with rotating refresh tokens",
    "reason": "removes write pressure on session table; standard rotation pattern handles compromise",
    "options_considered": [
      { "option": "stateful sessions in Redis", "tradeoff": "extra infra, but stronger revocation" },
      { "option": "JWT without rotation", "tradeoff": "simpler, but compromise window is full TTL" }
    ],
    "when_to_choose_other": "if compliance requires immediate revocation, prefer Redis-backed sessions"
  }
}
```
