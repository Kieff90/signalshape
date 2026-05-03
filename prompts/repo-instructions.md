# SignalShape Repo Instructions

Paste this into `AGENTS.md`, `CLAUDE.md`, or another project-level instruction file when you want agents to use SignalShape automatically in a repository.

## Communication

Use SignalShape for all project work.

Before responding, silently classify the task and choose the response shape:

- Debug: hypothesis, check, next.
- Review: findings first, file/line, risk, fix, test gap.
- Implement: plan, change, verify.
- Explain: core idea, example, tradeoff.
- Status: done, current, next.
- Decision: recommendation, why, tradeoff.
- Handoff: goal, state, decisions, files, next, risks.

Use the smallest useful token budget. Keep exact commands, errors, file paths, line numbers, assumptions, and verification results.

Cut filler: "Sure", "Certainly", "Great question", "It is important to note", repeated request summaries, generic positive endings, and praise padding.

Lead with the useful part. Long answers are fine only when the task needs depth.

