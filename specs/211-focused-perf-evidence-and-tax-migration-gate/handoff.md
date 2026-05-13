# Handoff: Focused Perf Evidence and Tax Migration Gate

**Spec:** `specs/211-focused-perf-evidence-and-tax-migration-gate`
**Owner:** local agent
**Status:** Accepted

## Current Decision

- `211-focused-perf-evidence-and-tax-migration-gate`: accepted
- classification: `tax_removed`
- claimStrength: focused hard
- global performance claim: not made
- accepted evidence directory: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/`

## Implementation Summary

- Changed files:
  - `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
  - `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
  - `docs/next/README.md`
  - `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`
  - `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.test.ts`
  - `packages/logix-perf-evidence/scripts/diff.ts`
  - `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
  - `packages/logix-perf-evidence/assets/schemas/perf-report.schema.json`
  - `packages/logix-perf-evidence/assets/schemas/perf-diff.schema.json`
  - `packages/logix-perf-evidence/package.json`
  - `packages/logix-perf-evidence/tsconfig.json`
  - `packages/logix-perf-evidence/README.md`
  - `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`

- Summary:
  - Added a focused dispatch-shell tax migration report script that reads existing before/after diff evidence and optional A/B JSON; it does not run perf collection or define budgets.
  - Classified outcomes as `tax_removed`, `tax_migrated`, `inconclusive`, or `failed`.
  - Enforced hard-claim gates: `profile=default|soak`, `comparable=true`, `summary.regressions=0`, `summary.budgetViolations=0`, no dirty/stability warnings, no timeout/failed points, and available `runtime.txnPhase.*Ms` evidence.
  - Marked `quick`, dirty, non-comparable, missing, unavailable, unstable, timeout, and failed evidence as clue-only or failed.
  - Aligned perf evidence schemas and diff unit inference with `ms` evidence so `runtime.txnPhase.*Ms` remains machine-readable.
  - Added docs and preflight guards without changing public runtime API or adding public config.
  - Archived clean before/after/diff/report artifacts under `perf/clean/` and accepted the focused result as `tax_removed`.

## Commands Run

| Command | Outcome | Notes |
| --- | --- | --- |
| `pnpm -C packages/logix-perf-evidence test scripts/ci.dispatch-shell-tax-report.test.ts` | FAIL | RED: `ci.dispatch-shell-tax-report` module did not exist before implementation. |
| `pnpm -C packages/logix-perf-evidence test scripts/ci.dispatch-shell-tax-report.test.ts` | PASS | New report classifier tests passed after implementation. |
| `pnpm -C packages/logix-perf-evidence typecheck` | FAIL | Type inference for phase interpretation was too wide; narrowed to the report union type. |
| `pnpm -C packages/logix-perf-evidence typecheck` | PASS | New script is included in package typecheck. |
| `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts` | PASS/SKIP | Existing command passed with 5 skipped tests because `LOGIX_PREFLIGHT` is disabled by default. |
| `LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts` | FAIL | First attempt used unsupported shell assignment under `rtk`; reran with `env`. |
| `env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts` | PASS | 5 preflight tests executed, including dispatchShell tax report evidence and `ms` schema guards. |
| `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts` | PASS/SKIP | Existing command passed with 2 skipped tests because `LOGIX_PREFLIGHT` is disabled by default. |
| `env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts` | PASS | 2 semantics tests executed. |
| `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts` | PASS | Existing focused perf-evidence decision smoke passed. |
| `pnpm typecheck` | PASS | Root TypeScript check reported no errors. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts` | PASS | Final audit: 4 files, 6 focused first-order tax tests passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts` | PASS | Final audit: 2 files, 4 structural/second-order sentinel tests passed. |
| `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx` | PASS | Final audit: browser same-commit A/B harness test passed. |
| `env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts` | PASS | Final audit: 5 preflight tests executed. |
| `pnpm -C packages/logix-perf-evidence test scripts/ci.dispatch-shell-tax-report.test.ts` | PASS | Final audit: report classifier and perf-evidence script tests passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts` | PASS | Final audit: dispatch shell phase and outer-shell health probes passed; clue-only evidence. |
| `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts` | PASS | Final audit: isolation, lane, backlog, default-on, and override tests passed. |
| `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx` | PASS | Final audit: React imported module hierarchy and RuntimeStore snapshot hooks passed. |
| `pnpm typecheck` | PASS | Final audit: root TypeScript check reported no errors. |
| `git diff --check` | PASS | Final audit: no whitespace errors. |
| `pnpm perf diff -- --before specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/before.browser.dispatchShell.d0c32edd1.local.default.json --after specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/after.browser.dispatchShell.97630ce66.local.default.json --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/diff.browser.dispatchShell.d0c32edd1__97630ce66.local.default.json` | PASS | Clean worktree before/after diff generated. |
| `pnpm perf ci:dispatch-shell-tax-report -- --diff specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/diff.browser.dispatchShell.d0c32edd1__97630ce66.local.default.json --before specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/before.browser.dispatchShell.d0c32edd1.local.default.json --after specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/after.browser.dispatchShell.97630ce66.local.default.json --profile default --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/report.md --json-out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/report.json` | PASS | Generated accepted `tax_removed` report with `claimStrength=hard`. |
| `pnpm perf validate -- --report specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/before.browser.dispatchShell.d0c32edd1.local.default.json --allow-partial` | PASS | Focused artifact valid; partial notes are expected because this is not full matrix. |
| `pnpm perf validate -- --report specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/after.browser.dispatchShell.97630ce66.local.default.json --allow-partial` | PASS | Focused artifact valid; partial notes are expected because this is not full matrix. |

## Tax Movement Notes

| Phase / Counter | Before | After / Observed | Interpretation |
| --- | --- | --- | --- |
| `runtime.txnCommitMs` | read from focused diff | classified by `ci.dispatch-shell-tax-report` | Total improvement is required before `tax_removed` or `tax_migrated`. |
| `runtime.txnPhase.*Ms` | read from focused diff evidence deltas | classified as `removed/increased/stable/missing` | Any secondary phase increase with total improvement becomes `tax_migrated`, not success. |
| `profile=quick` | n/a | clue-only | Cannot support a hard claim. |
| dirty/non-comparable/stability warning | n/a | clue-only | Produces `inconclusive` unless a hard failure is present. |
| timeout/failed/missing evidence/regression | n/a | failed | Produces `failed` or blocks hard claim. |

## Evidence Files

- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/before.browser.dispatchShell.d0c32edd1.local.default.json`
- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/after.browser.dispatchShell.97630ce66.local.default.json`
- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/diff.browser.dispatchShell.d0c32edd1__97630ce66.local.default.json`
- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/report.md`
- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/report.json`
- Earlier dirty artifacts under `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/` are retained as clue-only history and are not the accepted claim basis.

## Verification Layer Status

| Layer | Status | Evidence |
| --- | --- | --- |
| Structural sentinel status | required by gate | Report hard claims require structural/allocation sentinels to pass. |
| A/B status | optional input | Report tooling can read optional same-commit A/B JSON; A/B remains local diagnostic only. |
| Focused perf status | accepted | Clean default-profile before/after artifacts and diff are archived in `perf/clean/`. |
| Tax migration classification | accepted | `perf/clean/report.md` classifies the focused evidence as `tax_removed` with focused hard claim strength. |
| Migrated risk | enforced | Total improvement plus phase increase becomes `tax_migrated`, not success. |

## Claim Boundary

- Allowed claims:
  - Focused validation gates and tax migration report tooling are implemented.
  - The clean focused `dispatchShell.fixedCost` evidence supports `tax_removed` for this path.
- Forbidden claims:
  - Runtime performance is fixed.
  - No regressions exist.
  - Production performance improved globally.
  - Transaction path is optimal.
  - A global performance claim was made.

## Blockers

- None.

## Next Recommended Spec

- No further 211 work is required. Run broader perf separately only if a global runtime performance claim is needed.
