# Field Kernel Dirty Work Preflight Ledger

This page records the FieldKernel dirty-work state before production changes in specs `223` through `227`. The wave stays internal-only: `Program.make` owns declaration compilation, `Runtime.make` owns installation/execution, and transaction dirty evidence stays canonical through `StateTransaction.readDirtyPlanSnapshot`.

## Anchor

```text
repo_head_before: ae91fe6b77935446fccbbf0de866812166ebf070
prior_wave_status: RuntimeStore / Selector Notify 212-220 tax_removed, claimStrength=hard
worktree_note: supplied dirty-work bundle zip and copied docs/specs are the only known preflight changes
```

## Owner Map

| Tax point | Owner file | Current evidence | Next spec |
| --- | --- | --- | --- |
| exact dirty degrade to full converge | `packages/logix-core/src/internal/field-kernel/converge-planner.ts` | `FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`, `FieldKernel.ConvergePlanner.DeferredReachable.test.ts`, `FieldKernel.ConvergePlanner.LegacyDirtyInputGuard.test.ts` | `223` |
| deferred dirty-reachable not executed | `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`, `packages/logix-core/src/internal/field-kernel/converge-planner.ts` | deferred reachable is exposed by planner; runtime execution must be guarded by `223` | `223` |
| validate static IR missing or full list scan | `packages/logix-core/src/internal/field-kernel/validate.impl.ts` | `FieldKernel.Validate.StaticIr.test.ts`, `FieldKernel.Validate.ListIncrementalRule.test.ts`, `FieldKernel.ListScopeCheck.Perf.off.test.ts`, form revalidate gate | `224` |
| source unrelated key eval and row-scope eval | `packages/logix-core/src/internal/field-kernel/source.impl.ts` | `FieldKernel.Source.SyncIdle.DirtyGate.test.ts` | `225` |
| externalStore burst, scheduler, dispose, urgent interleave | `packages/logix-core/src/internal/field-kernel/external-store.ts` | coalesce, dispose cancel, urgent interleave tests exist | `225` |
| dirtyPlan/listEvidence materialization | `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`, `StateTransaction.types.ts`, `StateTransaction.lifecycle.ts` | `StateTransaction.DirtyPlanSnapshot.test.ts` proves snapshot memoization; allocation sentinels need tighter coverage | `226` |
| silent full fallback and diagnostics-off allocation | `packages/logix-core/src/internal/runtime/core/KernelHotPathAudit.ts`, `kernelFallbackReason.ts`, field-kernel converge/source/validate files | fallback paths already record kernel fallback in source/converge; unified report gate belongs to `227` | `227` |

## Existing Guard Status

```text
converge decision/execution single path: PASS before production changes
source dirty gate: PASS before production changes
dirtyPlan same-phase memoization: existing unit coverage
public API/root export: unchanged by 222
```

The following commands were run during 222:

```bash
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts
pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts
```

Both passed on the current worktree.

## Missing Sentinels by Priority

P0 for implementation specs:

- `223`: prove dirty-reachable deferred closure is actually consumed by runtime execution, not only exposed by planner.
- `224`: prove one-row list dirty uses `changedIndices` and does not scan the full list unless list root/reorder/remove requires fallback.
- `225`: prove unrelated transaction source key eval stays zero and list source row-scope eval stays bounded to changed rows.
- `226`: prove same-phase dirtyPlan/listEvidence repeat reads hit cache and materialization counters stay bounded.
- `227`: prove `dirtyAll`, missing registry, unknown write, and list-root-touched full work all emit reason-coded fallback and diagnostics-off does not allocate payloads.

P1 for evidence/spec `228`:

- default-profile focused before/after must cover converge, validate/list, source, and externalStore suites.
- report gate must classify migrated costs separately from total p95 improvement.

## Migration Watch

Do not classify a tax as removed when cost moves into:

- dirty root hashing or `Int32Array.from`;
- `Array.from` on dirty raw paths;
- list evidence clone and sorted-index materialization;
- source row-scope changed-index materialization;
- externalStore pending flush retention or low-priority starvation;
- fallback reason payload construction when diagnostics are off.

## Allowed Claims

- FieldKernel dirty-work owner map and missing sentinel list are recorded.
- Existing converge planner and source dirty-gate sentinels pass before production changes.

## Forbidden Claims

- Focused FieldKernel dirty-work performance improved.
- Global Runtime performance improved.
- No regressions exist globally.
- FieldKernel is optimal.
