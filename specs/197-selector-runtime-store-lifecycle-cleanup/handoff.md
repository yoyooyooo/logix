# Handoff: 197 Selector RuntimeStore Lifecycle Cleanup

## Status

Implemented on 2026-05-11. No commit was created by the agent.

## Result

Selector topic retention and RuntimeExternalStore teardown are guarded. React continues to consume core selector route ownership and does not grow local selector policy.

## Key Files

- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- `packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- `packages/logix-react/test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx`
- `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorStoreResidue.guard.test.ts`

## Verification

Focused commands:

```bash
pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts
pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx test/Contracts/ReactSelectorRouteOwner.guard.test.ts test/Contracts/ReactSelectorStoreResidue.guard.test.ts
```

Fresh 190-201 verification on 2026-05-11 passed this group.

## Public Surface Delta

None. No new public React selector hook family.

## Diagnostics And Perf

No render-isolation or perf improvement claim.

## Follow-Up

None.
