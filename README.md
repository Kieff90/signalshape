# SignalShape

SignalShape is a communication layer for AI coding agents.

It gives agents the right response shape for the task: fewer wasted tokens, less performative helpfulness, and more useful output.

This is not a "write shorter" persona. It is a small operating discipline:

1. Classify the task.
2. Pick a response shape.
3. Set a token budget.
4. Answer with evidence, next action, and no filler.

## Why

Most agents talk in one default shape: polite setup, broad explanation, soft summary, optional next steps. That wastes tokens and hides the useful part.

SignalShape changes the output shape based on the work:

- Debugging: hypothesis, check, next command.
- Code review: findings first, file/line, risk, fix.
- Implementation: plan, patch, verification.
- Status: done, current, blocked, next.
- Explanation: concept, example, tradeoff.
- Writing: draft, anti-slop audit, final.
- Handoff: state, decisions, files, next owner.

The token saving is a result, not the product. The product is better response structure.

## Install

### Claude Code

```sh
./scripts/install.sh claude
```

Or copy manually:

```sh
mkdir -p ~/.claude/skills
cp -R skills/signalshape ~/.claude/skills/signalshape
```

Then invoke it in Claude Code when supported by your setup:

```text
Use signalshape.
```

### Codex

```sh
./scripts/install.sh codex
```

Or copy manually:

```sh
mkdir -p ~/.agents/skills
cp -R skills/signalshape ~/.agents/skills/signalshape
```

Then invoke it in Codex:

```text
Use signalshape.
```

### Generic Agents

Use one of the prompt files:

- `prompts/generic-agent.md` for system or agent instructions.
- `prompts/repo-instructions.md` for `AGENTS.md`, `CLAUDE.md`, or project-level instructions.
- `commands/signalshape.md` for slash commands or reusable command prompts.

## Quick Example

User:

```text
Review this PR.
```

Default agent:

```text
I've reviewed the pull request. Overall, the implementation looks solid, but there are a few areas that may benefit from improvement...
```

SignalShape:

```text
Findings:
- `src/auth/session.ts:42`: expiry boundary accepts a token at exact expiration. Use `<=` and add a boundary test.
- `src/api/users.ts:88`: missing null check can 500 on unknown user id. Return 404.

Test gap: no expired-token boundary case.
```

## Repository Layout

```text
core/                 Portable doctrine and response shapes.
skills/signalshape/   Claude Code and Codex compatible skill.
prompts/              Generic agent and repo instruction prompts.
commands/             Slash-command style prompt.
examples/             Before/after examples.
scripts/              Local install helper.
```

## Non-goals

- It does not replace model reasoning.
- It does not compress conversation history.
- It does not force every answer to be tiny.
- It does not make agents perform a fake personality.

SignalShape keeps long answers when the task needs them. It just makes the answer earn its length.

