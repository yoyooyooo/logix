# Runtime Transaction Fixed-Cost Tax Wave

## Role

This page is the group-level route for specs `202-211`. It coordinates the
runtime transaction fixed-cost wave and does not authorize member
implementation shortcuts.

## Member Order

Run the wave in this order:

1. `202-runtime-transaction-fixed-cost-tax-wave`
2. `203-dispatch-shell-preflight-and-tax-ledger`
3. `210-dispatch-shell-ab-comparison-harness`
4. `204-dispatch-scope-acquisition-fastpath`
5. `205-txn-queue-lane-empty-fastpath`
6. `206-transaction-noop-phase-elision`
7. `207-commit-publish-empty-fastpath`
8. `208-diagnostics-instrumentation-zero-alloc-sentinels`
9. `209-txn-buffer-clear-and-key-materialization-sentinels`
10. `211-focused-perf-evidence-and-tax-migration-gate`

`203` must run before production optimization. `210` should run before
production hot-path edits when same-commit A/B comparability is needed.

## Tax Owners

| Tax point | Owner spec | Primary evidence surface |
| --- | --- | --- |
| Dispatch shell preflight and local tax map | `203` | phase map, preflight snapshot, local ledger |
| Scope acquisition / runtime acquisition | `204` | `runtime.resolveScopeMsPerDispatch`, `reuseScope` vs `resolveEach` |
| Queue context, lane policy, empty backlog path | `205` | `queueContextLookupMs`, `queueResolvePolicyMs`, `queueBackpressureMs`, `queueEnqueueBookkeepingMs`, `queueStartHandoffMs` |
| No-op field/source/validate/selector phases | `206` | `fieldConvergeMs`, `scopedValidateMs`, `sourceSyncMs`, selector phase counters |
| Empty commit publish, topic notify, hooks | `207` | `commitPublishCommitMs`, `commitTotalMs`, subscriber/topic/hook sentinel counters |
| Diagnostics off and instrumentation light allocation | `208` | `debugEventAllocCount.off`, `patchObjectMaterializeCount.light`, `snapshotObjectMaterializeCount.light` |
| Buffer clear and key materialization | `209` | clear counters, key materialization counters, transaction-window sentinel counts |
| Focused evidence and tax migration gate | `211` | comparable default/soak diff, `summary.regressions`, migration report |

## Stop Conditions

Stop and report instead of continuing if a member spec requires any of these:

- public API, root export, public runtime config, or public authoring noun expansion;
- bypassing the transaction queue or changing transaction order;
- moving correctness ownership to React, Playground, Devtools, CLI, or examples;
- constructing debug, timing, trace, patch, or snapshot payloads on a disabled tier;
- adding IO, `await`, timers, or write escape hatches inside the transaction window;
- weakening tests to make a hot-path optimization pass;
- claiming success from `quick`, non-comparable, unstable, or warning-bearing evidence.

## Claim Boundary

This group spec may claim only that the wave route, owner map, stop conditions,
and evidence boundaries are recorded. It must not claim that runtime
performance is fixed, globally improved, regression-free, or optimal.

Hard performance claims are deferred to `211` and require comparable
default/soak evidence, clean structural sentinels, and a clean tax migration
classification.

## Related Pages

- [Runtime transaction fixed-cost sequencing](./runtime-transaction-fixed-cost-sequencing.md)
- [Runtime transaction fixed-cost tax ledger](./runtime-transaction-fixed-cost-tax-ledger.md)
- [Runtime transaction fixed-cost evidence playbook](./runtime-transaction-fixed-cost-evidence-playbook.md)
- [Runtime transaction fixed-cost evidence protocol](./runtime-transaction-fixed-cost-evidence-protocol.md)
- [Runtime transaction fixed-cost before/after playbook](./runtime-transaction-fixed-cost-before-after-playbook.md)
