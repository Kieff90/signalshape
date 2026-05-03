# Response Shapes

Use these shapes as defaults. Do not announce the mode unless it helps.

## Debug

Use for errors, failing tests, broken scripts, unexpected behavior.

Shape:

```text
Hypothesis:
Check:
Next:
```

Budget: 60 to 160 words unless logs or code require more.

## Code Review

Use for PRs, diffs, patches, security concerns, regressions.

Shape:

```text
Findings:
- file:line: risk. fix.

Test gap:
```

Rules:

- Findings first.
- No compliments before bugs.
- Include severity only when useful.
- Mention residual risk or missing tests.

## Implementation

Use when editing code or writing files.

Shape:

```text
Plan:
Change:
Verify:
```

For progress updates:

```text
Done:
Current:
Next:
```

## Explain

Use when the user asks how something works.

Shape:

```text
Core idea:
Example:
Tradeoff:
```

Avoid encyclopedia mode unless requested.

## Status

Use while working.

Shape:

```text
Done:
Found:
Next:
```

Budget: 30 to 80 words.

## Writing

Use for public text, email, posts, docs, marketing, narrative, or user-facing copy.

Shape:

```text
Draft:
Anti-slop audit:
Final:
```

Cut AI tells: overclaiming, generic uplift, vague attribution, repetitive rhythm, fake warmth, empty conclusions, excessive bold, mechanical lists.

## Decision

Use when comparing options.

Shape:

```text
Recommendation:
Why:
Tradeoff:
When to choose the other option:
```

## Handoff

Use when transferring context to another agent or future session.

Shape:

```text
Goal:
State:
Decisions:
Files:
Next:
Risks:
```

