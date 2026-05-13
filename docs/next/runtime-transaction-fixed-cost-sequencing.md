# Sequencing

## Dependency Graph

```text
202 group
  └─ 203 preflight + tax ledger
       ├─ 210 same-commit A/B harness
       ├─ 204 scope/acquisition fast path
       ├─ 205 queue/lane empty fast path
       ├─ 206 no-op phase elision
       ├─ 207 commit publish empty fast path
       ├─ 208 diagnostics/instrumentation zero-alloc sentinels
       ├─ 209 buffer clear/key materialization sentinels
       └─ 211 evidence + tax migration gate
```

## Recommended Order

`202 → 203 → 210 → 204 → 205 → 206 → 207 → 208 → 209 → 211`

`208` can run earlier if the implementation team is about to add phase timing or debug proof fields. `209` should run after `208` because it depends on the sentinel vocabulary.

## Why This Order

- `203` prevents blind optimization.
- `210` solves same-commit comparability during heavy refactor.
- `204-207` reduce first-order fixed tax in separate ownership zones.
- `208-209` catch second-order tax migration caused by measurement, reuse, clear, and key materialization.
- `211` prevents vague success claims and makes the final report reproducible.

## Stop Conditions

Stop and repair before continuing if any of these happen:

- a public export or public runtime config is introduced for test-only machinery;
- a fast path bypasses transaction queue semantics;
- diagnostics=off constructs debug/trace payloads;
- focused tests show no-tearing, hierarchical injector, or selector retain/release drift;
- perf evidence is non-comparable but the handoff claims success anyway.
