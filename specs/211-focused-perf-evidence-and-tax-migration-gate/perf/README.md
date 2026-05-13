# Focused Perf Evidence Landing Zone

This directory holds focused transaction fixed-cost evidence for `dispatchShell.fixedCost`.
It is a local claim package, not a broad perf claim.

## Current Archived Result

- `211-focused-perf-evidence-and-tax-migration-gate`: accepted
- classification: `tax_removed`
- claimStrength: focused hard
- global performance claim: not made
- clean evidence directory: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/`

Clean artifact set:

- `clean/before.browser.dispatchShell.d0c32edd1.local.default.json`
- `clean/after.browser.dispatchShell.97630ce66.local.default.json`
- `clean/diff.browser.dispatchShell.d0c32edd1__97630ce66.local.default.json`
- `clean/report.md`
- `clean/report.json`

The earlier dirty artifacts in `perf/` are retained as clue-only historical material and are not the accepted claim basis.

## Evidence Surfaces

- Structural sentinels from specs `203-210`, including diagnostics-off allocation guards and second-order dirty/key materialization counters.
- Focused `dispatchShell.fixedCost` before/after report pair collected with the same matrix hash, same environment, and the same profile.
- Optional same-commit A/B evidence for `runtime.shellMode`, used only to explain whether the shell-mode switch moved cost within the same codebase.
- Final tax migration report generated from the focused diff.

## File Naming

```text
before.browser.dispatchShell.<sha>.<envId>.<profile>.json
after.browser.dispatchShell.<sha-or-local>.<envId>.<profile>.json
diff.browser.dispatchShell.before__after.<envId>.<profile>.json
runtime-dispatch-shell-tax-migration-report.<envId>.<profile>.md
runtime-dispatch-shell-tax-migration-report.<envId>.<profile>.json
```

## Commands

```bash
pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>
pnpm perf ci:dispatch-shell-tax-report -- --diff <diff.json> --before <before.json> --after <after.json> --profile default --out <report.md> --json-out <report.json>
```

## Claim Boundary

- `quick`: clue only, even when numbers improve.
- `default`: eligible for a focused hard claim only when `meta.comparability.comparable=true`, `summary.regressions=0`, `summary.budgetViolations=0`, no dirty/stability warnings, no timeout/failed point, and phase evidence is available.
- `soak`: same hard-claim gate as `default`; use when `default` is noisy or tail behavior is suspicious.
- Dirty, non-comparable, missing, unavailable, unstable, timeout, or failed evidence is clue-only or failed. It cannot justify `tax_removed`.

## Report Classification

- `tax_removed`: total `runtime.txnCommitMs` improves, no phase grows beyond the report epsilon, and all hard gates pass.
- `tax_migrated`: total `runtime.txnCommitMs` improves, but another `runtime.txnPhase.*Ms` field grows beyond epsilon or same-commit A/B reports migrated cost.
- `inconclusive`: evidence is quick, dirty, unstable, non-comparable, or not strong enough for a hard claim.
- `failed`: diff regressions, budget violations, timeout/failed points, missing required phase fields, or sentinel/semantic guard failures.

## Hard Claim Rule

A focused dispatch-shell claim may say only that this spec's evidence supports a local `dispatchShell.fixedCost` interpretation. It must not claim the whole runtime fixed-cost wave is broadly faster without a separate broader perf run.
