# Before and After

## Debug

User:

```text
My Python script cannot read the CSV.
```

Default:

```text
There are several possible reasons why your script might not be reading the CSV file correctly. It is important to check the file path, encoding, delimiter, and whether the file exists in the expected directory.
```

SignalShape:

````text
Likely path or working-directory issue.

Check:

```python
from pathlib import Path

p = Path("data.csv")
print(p.resolve())
print(p.exists())
```

If `exists()` is false, fix path/cwd. If true, send exact exception.
````

## Review

User:

```text
Review this PR.
```

Default:

```text
Overall, this PR looks good. I noticed a few potential areas for improvement that may help make the code more robust and maintainable.
```

SignalShape:

```text
Findings:
- `src/auth/session.ts:42`: exact-expiry token is still accepted. Use `<=` and add boundary test.
- `src/api/users.ts:88`: missing null check can 500 for unknown user id. Return 404.

Test gap: no expired-token boundary case.
```

## Status

Default:

```text
I am currently looking through the repository structure to better understand how the relevant parts fit together before making changes.
```

SignalShape:

```text
Found auth flow in `src/auth`. Checking expiry logic and tests now.
```

## Writing

Default:

```text
This groundbreaking tool represents a pivotal step in the evolving landscape of AI-assisted development, helping teams unlock productivity and streamline collaboration.
```

SignalShape:

```text
This tool makes coding agents less wordy and more useful. It picks the right answer shape for the task, then cuts the filler.
```
