# Agent Start Here

## Objective

Implement the runtime transaction fixed-cost wave as multiple small specs. Do not collapse this into one large PR.

## Required Sequence

1. `202-runtime-transaction-fixed-cost-tax-wave` — group-level route and tax-wave entrypoint.
2. `203-dispatch-shell-preflight-and-tax-ledger` — inspect current shell, write preflight and ledger.
3. `210-dispatch-shell-ab-comparison-harness` — add test-only same-commit A/B harness early if the local agent needs same-commit comparability.
4. `204-dispatch-scope-acquisition-fastpath` — reduce acquisition/resolveEach tax.
5. `205-txn-queue-lane-empty-fastpath` — reduce no-backlog queue/lane tax.
6. `206-transaction-noop-phase-elision` — skip field/source/validate/selector no-op phases.
7. `207-commit-publish-empty-fastpath` — reduce empty publish/hook/subscriber tax.
8. `208-diagnostics-instrumentation-zero-alloc-sentinels` — prevent proof instrumentation from adding new allocation tax.
9. `209-txn-buffer-clear-and-key-materialization-sentinels` — catch clear/key second-order taxes.
10. `211-focused-perf-evidence-and-tax-migration-gate` — finalize evidence, report, and claim boundaries.

## Before Implementation

- Confirm `190-201` are applied or consciously superseded.
- Run `203` first. Do not optimize before the tax ledger and current phase map exist.
- Choose one tax point per PR. Do not mix scope acquisition, queue policy, commit publish, and diagnostics allocation in one PR.
- Decide whether same-commit A/B is needed. If yes, implement `210` before touching production paths.

## During Implementation

- Test first.
- Use the smallest focused command from the spec plan.
- Record every failed command in that spec's `handoff.md`.
- If a fix lowers total time but increases another phase, record it as tax migration rather than success.

## After Implementation

- Run focused structural tests.
- Run same-commit A/B if available.
- Run focused default-profile dispatch shell diff only when the implementation chain is stable enough.
- Fill `docs/next/runtime-dispatch-shell-tax-migration-report-template.md` or the generated report from `211`.

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not bypass transaction queue semantics. Fast paths must be branch-shape optimizations, not semantic shortcuts.
- Do not move correctness ownership to React, Playground, Devtools, CLI, or examples.
- Do not claim performance success from `quick`, dirty, unstable, or non-comparable evidence.
- Do not introduce public runtime config for test-only A/B switches.
- Do not add diagnostics/debug payload construction on `diagnostics=off`.
- Do not put IO, `await`, timers, or write escape hatches inside the transaction window.
- Do not use destructive git operations: `git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`.
- Keep each member spec as a small PR. Commit after each focused task group passes.
- If a focused test reveals a pre-existing unrelated failure, record it in `handoff.md`; do not hide it with broad changes.
