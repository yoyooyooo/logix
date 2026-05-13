---
title: Runtime Dispatch Shell Tax Migration Report Template
status: next
version: 1
---

# Runtime Dispatch Shell Tax Migration Report Template

This template records whether `dispatchShell.fixedCost` removed transaction shell tax or moved it into another phase. It is filled from focused before/after diff evidence and optional same-commit A/B evidence. It does not replace `packages/logix-perf-evidence/assets/matrix.json` as the suite or budget source.

## Inputs

| Field | Value |
| --- | --- |
| Spec | `specs/211-focused-perf-evidence-and-tax-migration-gate` |
| Suite | `dispatchShell.fixedCost` |
| Before report | `<path>` |
| After report | `<path>` |
| Diff | `<path>` |
| Optional same-commit A/B | `<path or n/a>` |
| Profile | `<quick/default/soak>` |
| Matrix id/hash | `<id/hash>` |
| Env id | `<os-arch.cpu.browser-version.headless>` |

## Hard Claim Gate

| Gate | Required For Hard Claim | Observed |
| --- | --- | --- |
| Profile | `default` or `soak` | `<value>` |
| Comparability | `meta.comparability.comparable=true` | `<value>` |
| Regressions | `summary.regressions=0` | `<value>` |
| Budget violations | `summary.budgetViolations=0` | `<value>` |
| Dirty evidence | none | `<value>` |
| Stability warnings | none | `<value>` |
| Timeout/failed points | none | `<value>` |
| Required phase evidence | no missing/unavailable `runtime.txnPhase.*Ms` | `<value>` |

`quick`, dirty, non-comparable, missing, unavailable, unstable, timeout, or failed evidence is clue-only. It cannot support `tax_removed`.

## Classification

| Classification | Meaning |
| --- | --- |
| `tax_removed` | Total `runtime.txnCommitMs` improves, no secondary phase grows beyond epsilon, and all hard gates pass. |
| `tax_migrated` | Total `runtime.txnCommitMs` improves, but another `runtime.txnPhase.*Ms` field grows beyond epsilon or same-commit A/B reports migrated cost. |
| `inconclusive` | Evidence is quick, dirty, unstable, non-comparable, incomplete, or shows no clear total improvement. |
| `failed` | Diff regressions, budget violations, timeout/failed points, missing required phase evidence, or sentinel/semantic guard failure. |

## Phase Delta Matrix

| Phase / Evidence | Before | After | Delta | Interpretation |
| --- | --- | --- | --- | --- |
| `runtime.txnPhase.txnPreludeMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.queueContextLookupMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.queueResolvePolicyMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.queueBackpressureMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.queueEnqueueBookkeepingMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.queueWaitMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.queueStartHandoffMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.dispatchActionRecordMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.dispatchActionCommitHubMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.bodyShellMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.asyncEscapeGuardMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.fieldConvergeMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.scopedValidateMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.sourceSyncMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.commitTotalMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.commitRowIdSyncMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.commitPublishCommitMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.commitStateUpdateDebugRecordMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.commitOnCommitBeforeStateUpdateMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |
| `runtime.txnPhase.commitOnCommitAfterStateUpdateMs` | `<ms>` | `<ms>` | `<ms>` | `<removed/increased/stable/missing>` |

## Command

```bash
pnpm perf ci:dispatch-shell-tax-report -- --diff <diff.json> --before <before.json> --after <after.json> --profile default --out <report.md> --json-out <report.json>
```

## Result

| Field | Value |
| --- | --- |
| Classification | `<tax_removed/tax_migrated/inconclusive/failed>` |
| Claim strength | `<hard/clue/none>` |
| Blockers | `<none or list>` |
| Tax movement note | `<short interpretation>` |

## See also

- [Runtime Dispatch Shell Tax Ledger](./runtime-dispatch-shell-tax-ledger.md)
- [Runtime Dispatch Shell Before/After Playbook](./runtime-dispatch-shell-before-after-playbook.md)
- [Runtime Transaction Fixed-Cost Evidence Playbook](./runtime-transaction-fixed-cost-evidence-playbook.md)
