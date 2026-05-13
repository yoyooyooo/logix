# Handoff: Dispatch Shell Same-Commit A/B Comparison Harness

**Spec:** `specs/210-dispatch-shell-ab-comparison-harness`
**Owner:** local agent
**Status:** Complete

## Implementation Summary

- Changed files:
  - `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
  - `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
  - `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
  - `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
  - `packages/logix-perf-evidence/scripts/collect.ts`
  - `packages/logix-perf-evidence/assets/matrix.json`
  - `specs/210-dispatch-shell-ab-comparison-harness/tasks.md`
  - `specs/210-dispatch-shell-ab-comparison-harness/checklists/requirements.md`
  - `specs/210-dispatch-shell-ab-comparison-harness/handoff.md`

- Notes:
  - Added test-only `shellMode: baseline | fastPath` helpers under the react browser perf-boundary test harness.
  - `LOGIX_TXN_SHELL_FASTPATH=0/1` is mapped by `packages/logix-perf-evidence/scripts/collect.ts` into browser-visible `VITE_LOGIX_TXN_SHELL_FASTPATH` only for perf collection.
  - `runtime.shellMode` and `runtime.shellMode.source` are emitted as evidence fields for `dispatchShell.fixedCost`.
  - No Runtime public config, root export, public submodule, public API, transaction order, queue/lane law, scheduling law, or diagnostics/public surface changed.

## Commands Run

| Command | Outcome | Notes |
| --- | --- | --- |
| `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx` | FAIL | RED before implementation: `dispatch-shell.runtime.ts` did not provide `compareDispatchShellABSamples`. |
| `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx` | PASS | 2 browser tests passed after implementation. |
| `LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts` | PASS | 4 tests passed, including dispatch shell A/B evidence guard. |
| `LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts` | PASS | 2 tests passed. |
| `rg -n "LOGIX_TXN_SHELL_FASTPATH|VITE_LOGIX_TXN_SHELL_FASTPATH|runtime\\.shellMode|shellMode|sameCommitAB|txnShellFastPath" packages/logix-react/test packages/logix-perf-evidence packages/logix-react/src packages/logix-core/src packages/logix-core/package.json packages/logix-react/package.json` | PASS | Matches are limited to perf-evidence collect, matrix, react test harness/tests, and no public `src/**` export/config paths. |
| `pnpm -C packages/logix-react typecheck:test` | FAIL | First run failed because `ImportMetaEnv` had no `VITE_LOGIX_TXN_SHELL_FASTPATH`; fixed via local test-helper cast instead of global/public env typing. |
| `pnpm -C packages/logix-react typecheck:test` | PASS | Test TypeScript passed after local cast. |
| `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts` | PASS | Script package related tests passed. |

## Tax Movement Notes

| Phase / Counter | Before | After / Observed | Interpretation |
| --- | --- | --- | --- |
| `runtime.shellMode` | absent | `baseline` or `fastPath` in test evidence | `inconclusive`, A/B harness only |
| `runtime.shellMode.source` | absent | `test-only:same-commit-ab` | proves test-only evidence source |
| A/B phase delta | absent | helper emits total and phase deltas and flags queue/commit/diagnostics increases | `inconclusive`, local diagnostic only |
| Public API / runtime config | unchanged | unchanged | leakage guard passed |

## Evidence Files

- n/a. 210 adds local A/B harness and guards; no perf evidence collected.

## Verification Layer Status

| Layer | Status | Evidence |
| --- | --- | --- |
| Structural sentinel status | leakage guard passed | `shellMode` and env switch matches are limited to test/perf harness paths, not public `src/**` exports/config. |
| A/B status | implemented | Same-commit A/B helper emits total and phase deltas and can flag queue/commit/diagnostics migration. |
| Focused perf status | deferred | No default/soak dispatchShell diff collected in 210. |
| Tax migration classification | `inconclusive` | A/B is local diagnostic only until followed by comparable default/soak diff. |
| Migrated risk | explicitly representable | A/B comparison can flag total-down with phase-up migration. |

## Claim Boundary

- Allowed claims:
  - Same-commit A/B harness is available and test-only.
  - Same-commit A/B indicates phase improvement in X when generated evidence says so.
  - Formal performance claim deferred until comparable default/soak evidence.
- Forbidden claims:
  - Runtime performance is fixed.
  - No regressions exist.
  - Production performance improved globally.
  - Transaction path is optimal.

## Blockers

- None for 210.

## Next Recommended Spec

- `204-dispatch-scope-acquisition-fastpath`
