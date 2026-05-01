# 2026-03-29 · effect-v4 TX-C1 sync reading

## Scope

- base:
  - `origin/effect-v4`
- patch:
  - isolated `StateTransaction.ts` closeout from `TX-C1`
- goal:
  - move the proven `StateTransaction` cut onto the `effect-v4` PR path without mixing wider txn family work

## Files

- runtime:
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

## Local validation

passed:

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.RefList.ChangedIndicesFromTxnEvidence.test.ts`
- `pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Runtime.test.ts -t "committed transaction patches stay stable across later transactions"`
- `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t 'snapshot dirtyPathIds|infer dirty evidence for whole-state replace|skip replace inference'`

note:

- `StateTransaction.recordPatchArrayFast.test.ts` is not present on `origin/effect-v4`, so it is not part of this sync branch gate

## Decision

- this sync branch is suitable for a small PR into `effect-v4`
- purpose stays singular:
  - carry the isolated `StateTransaction` closeout into the `effect-v4` integration path
