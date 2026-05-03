# Status Shape

Use during work to update an orchestrator (or human) on current state.

## When Status vs Handoff

> **Status** = "I continue, I'm telling you where I am." Ownership stays with producer.
> **Handoff** = "I disconnect, someone else continues." Ownership transfers.
>
> If you are about to stop working: Handoff. If you are about to keep working: Status.

## Payload fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `done` | array of string | yes | Tasks completed since the last status. May be empty. |
| `current` | string | yes | What the producer is working on right now. One sentence. |
| `next` | array of string | yes | Planned next tasks. May be empty if `blocked_by` set. |
| `blocked_by` | string \| null | no | If non-null, work is blocked. Description of what is blocking. |

`additionalProperties: false` on payload top-level.

## Examples

### Mid-flight progress

```json
{
  "shape": "status",
  "version": "0.1.0",
  "producer": "implementer",
  "payload": {
    "done": ["read auth/session.ts", "identified expiry boundary bug"],
    "current": "writing fix for off-by-one in token expiry",
    "next": ["add boundary test", "run full auth suite"],
    "blocked_by": null
  }
}
```

### Blocked

```json
{
  "shape": "status",
  "version": "0.1.0",
  "producer": "implementer",
  "consumer_hint": "orchestrator",
  "requires_human": true,
  "payload": {
    "done": ["scaffolded migration"],
    "current": "waiting on production schema dump",
    "next": [],
    "blocked_by": "need read-only credentials for prod_db_read role"
  }
}
```

### Empty done (just started)

```json
{
  "shape": "status",
  "version": "0.1.0",
  "producer": "researcher",
  "payload": {
    "done": [],
    "current": "reading task brief and CONTEXT.md",
    "next": ["scan repo for existing patterns", "draft research questions"],
    "blocked_by": null
  }
}
```
