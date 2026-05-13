# Handoff: 199 Form Source/Companion Boundary Second Wave

## Status

Implemented on 2026-05-11. No commit was created by the agent.

## Result

Form companion lowering rejects Promise/Effect returns and forbidden final-truth writes. Source remains remote fact scheduling, not an options/candidates API. Form reads stay on the core `useSelector` route.

## Key Files

- `packages/logix-form/src/internal/form/impl.ts`
- `packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts`
- `packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts`
- `packages/logix-form/test/Form/Form.ReadRoute.CoreSelectorOnly.guard.test.ts`
- `packages/logix-react/src/internal/formProjection.ts`
- `packages/logix-react/test/Contracts/ReactRootBarrel.allowlist.test.ts`
- `packages/logix-react/test/form-companion-host-gate.integration.test.tsx`

## Verification

Focused commands already run during implementation:

```bash
pnpm -C examples/logix-react test test/form-companion-host-gate.integration.test.tsx
pnpm -C packages/logix-react test test/Hooks/useSelector.formCompanionDescriptor.test.tsx test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx test/Contracts/ReactRootBarrel.allowlist.test.ts
pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts
```

Additional final commands:

```bash
pnpm -C packages/logix-form test test/Form/Form.Companion.Authoring.test.ts test/Form/Form.Companion.NoAsyncGuard.test.ts test/Form/Form.Source.Authoring.test.ts test/Form/Form.Source.NotOptionsApi.guard.test.ts test/Form/Form.ReadRoute.CoreSelectorOnly.guard.test.ts test/Form/Form.DomainBoundary.test.ts
pnpm -C packages/logix-react test test/form-companion-host-gate.integration.test.tsx
```

## Public Surface Delta

No new Form API. React root guard explicitly rejects `useFormField`, `useFormSelector`, and related Form-owned read hook families.

## Diagnostics And Perf

No benchmark or perf claim. Companion remains synchronous local soft fact derivation.

## Follow-Up

None.
