# Artifact Analysis

Use this file when the user provides CI artifacts, copied logs, a run summary, or asks why a performance gate is blocked.

## Read Order

Start from the most summarized artifact, then drill down:

1. `summary.md`
2. `convergence.<profile>.json`
3. `diff.*.<profile>.json`
4. `adversarial.<profile>.json`
5. `examples-playground.<profile>.json`
6. `snapshot.<profile>.json`
7. `trend.<branch>.<profile>.json`
8. `counter-census.json`
9. `knob-manifest.json`
10. `markers/*.json`
11. `logs/*.log`

If a higher-level report references a lower-level file that is missing, classify the evidence as `blocked` or `inconclusive`; do not infer the missing content.

Ignore advisory summaries as proof. If an LLM summary or reviewer note says pass but machine-readable counters, suites, markers, or migration fields fail, classify from the machine fields.

## Comparability Checklist

Check:

- `baseSha` and `headSha`
- `profile`
- `envId`
- `matrixId`
- `matrixHash`
- `browser name/version`
- `perf files`
- sample/repeat counts
- timeout settings

If `matrixHash`, `profile`, or `envId` is missing, the evidence is at most triage.

## Result Classification

Use exactly one primary classification:

```text
tax_removed
stable_guarded
migrated_cost
migrated_risk
blocked
inconclusive
```

Apply these rules:

- `missing counter` -> `blocked` for hard claim, usually evidence fix first.
- `counter > 0` -> `blocked` or `migrated_cost/migrated_risk`, depending on owner.
- `timeout marker` -> `blocked`, then isolate suite/profile.
- `stabilityWarning` -> `inconclusive` unless repeat evidence resolves it.
- `browser P2 fail` -> kernel claim blocker only if runtime witness isolation is involved.
- `default clean, soak missing` -> candidate evidence only, not hard.

## Output Shape

```text
artifact comparability:
profile/env/matrix:
blocked points:
counter state:
pressure knob attribution:
runtime owner attribution:
cost migration:
next action:
claim boundary:
```
