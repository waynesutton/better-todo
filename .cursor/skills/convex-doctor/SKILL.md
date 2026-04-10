# convex-doctor Skill

## When to use

Run `convex-doctor` after making substantive changes to any file in `convex/`. This includes schema changes, new queries/mutations/actions, and refactors.

## How to run

```bash
# Quick score check
npx convex-doctor --score

# Verbose output with all findings
npx convex-doctor -v

# JSON output for programmatic analysis
npx convex-doctor --format json
```

## Reading the output

Findings are organized by category with severity indicators:

- **Error** (red): Must fix. Weighted 1.2x (perf), 1.5x (correctness/security).
- **Warning** (yellow): Should fix or suppress with justification.
- **Info** (blue): Stylistic suggestions.

## Category weights

| Category       | Weight |
|----------------|--------|
| Security       | 1.5x   |
| Correctness    | 1.5x   |
| Performance    | 1.2x   |
| Schema         | 1.0x   |
| Architecture   | 0.8x   |
| Configuration  | 0.5x   |

## Remediation order

1. Fix correctness and security errors first (highest impact on score).
2. Fix performance errors next.
3. Address warnings if they represent real issues.
4. Suppress rules in `convex-doctor.toml` only for documented false positives.
5. Never suppress a rule just to improve the score without justification.

## Configuration

The project uses `convex-doctor.toml` in the project root. Rules are suppressed with a comment explaining the reasoning. See the file for current suppressions.

To disable a specific rule:

```toml
[rules]
"category/rule-name" = "off"
```

## CI threshold

The project targets a minimum score of 90. The `[ci]` section in `convex-doctor.toml` enforces this:

```toml
[ci]
fail_below = 90
```
