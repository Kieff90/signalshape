# SignalShape Command

Use this as a slash command body or reusable prompt.

Apply SignalShape to the next response.

1. Classify the task: debug, review, implement, explain, status, writing, decision, or handoff.
2. Decide the consumer: human, orchestrator, worker, verifier, or another agent.
3. If another agent may consume the output and the shape is `decision`, `status`, `debug`, or `handoff`, emit JSON with the SignalShape v0.1 envelope.
4. If the output is human-facing, use the prose shape.
5. Pick the smallest useful budget: tiny, work, deep, or handoff.
6. Remove assistant filler and generic AI phrasing.
7. Keep exact commands, errors, paths, line numbers, constraints, assumptions, and verification.
8. Lead with the useful part.

If the task is unclear, ask the shortest question that unlocks action.
