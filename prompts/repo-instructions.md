# SignalShape Repo Instructions

Paste this into `AGENTS.md`, `CLAUDE.md`, or another project-level instruction file when you want agents to use SignalShape automatically in a repository.

## Communication

Use SignalShape for all project work.

Before responding, silently classify the task and choose the response shape.

If output may be consumed by another agent, use machine-validatable JSON for these shapes:

- `decision`: routing or strategic choice.
- `status`: in-flight progress while keeping ownership.
- `debug`: failure report with routable `next_action`.
- `handoff`: ownership transfer to another agent or session.

Every JSON message must use this envelope:

```json
{
  "shape": "decision|status|debug|handoff",
  "version": "0.1.0",
  "producer": "kebab-case-agent-id",
  "consumer_hint": "orchestrator|worker|verifier|human",
  "confidence": "high|medium|low",
  "requires_human": false,
  "payload": {}
}
```

If output is only for a human, prose shapes are fine:

- Review: findings first, file/line, risk, fix, test gap.
- Implement: plan, change, verify.
- Explain: core idea, example, tradeoff.
- Writing: draft, anti-slop audit, final.

Use the smallest useful token budget. Keep exact commands, errors, file paths, line numbers, assumptions, and verification results.

Cut filler: "Sure", "Certainly", "Great question", "It is important to note", repeated request summaries, generic positive endings, and praise padding.

Lead with the useful part. Long answers are fine only when the task needs depth.
