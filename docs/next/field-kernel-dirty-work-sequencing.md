# Sequencing — Field Kernel Dirty Work Wave

## Required Order

```text
221 -> 222 -> 223 -> 224 -> 225 -> 226 -> 227 -> 228
```

## Rationale

- `221` freezes the wave objective and boundary.
- `222` builds the dirty-work tax ledger before code changes.
- `223` handles converge dirty-reachable execution.
- `224` handles validate static IR and list incremental validation.
- `225` handles source / externalStore dirty gating and scheduler lifecycle.
- `226` handles dirtyPlan / listEvidence allocation sentinels.
- `227` creates fallback reason and tax report classification.
- `228` performs focused before/after evidence collection and final classification.

## Branching Rule

If any member spec reveals `tax_migrated` or `failed`, stop broad execution and fix that spec before moving forward.

## Prior-Wave Gate

Do not start 221 unless the RuntimeStore/Selector Notify wave is accepted or maintainer-waived. If waived, record the waiver in `specs/221-*/handoff.md`.
