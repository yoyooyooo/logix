# Quickstart: Kernel Selector Route Contract

## Purpose

Use this file to execute the planning and verification loop for `169-kernel-selector-route`.

## Read First

1. [spec.md](./spec.md)
2. [plan.md](./plan.md)
3. [contracts/selector-route-contract.md](./contracts/selector-route-contract.md)
4. [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
5. [../../docs/ssot/runtime/02-hot-path-direction.md](../../docs/ssot/runtime/02-hot-path-direction.md)
6. [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)

## Implementation Entry Gates

Before code changes:

1. Confirm `discussion.md` has no must-close blockers.
2. Confirm `StateTransaction.ts` decomposition task is planned before dirty precision semantic edits.
3. Capture or define a perf baseline plan under `specs/169-kernel-selector-route/perf/`.
4. Confirm public no-arg host read removal is forward-only.

## Suggested Verification Commands

Focused type surface:

```bash
rtk pnpm -C packages/logix-react exec tsc --noEmit
rtk pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

Core package tests:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts test/Runtime/Runtime.selectorRouteDecision.contract.test.ts test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts test/Contracts/VerificationSelectorQualityLayering.contract.test.ts test/internal/Runtime/StateTransaction.decomposition.guard.test.ts
```

React host tests:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.laneSubscription.test.tsx test/Hooks/useSelector.test.tsx test/Hooks/useSelector.structMemo.test.tsx test/Contracts/ReactSelectorPublicSurface.contract.test.ts test/Contracts/ReactSelectorRouteOwner.guard.test.ts test/Contracts/ReactSelectorQualityEvidence.contract.test.ts test/Hooks/useSelector.businessFormRow.contract.test.tsx test/Hooks/useSelector.businessMasterDetail.contract.test.tsx test/Hooks/useSelector.businessDashboard.contract.test.tsx
```

Workspace quality gates:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Performance evidence:

```bash
rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json
rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json --after specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/169-kernel-selector-route/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json
```

Text sweep:

```bash
rtk rg -n 'useSelector\(handle\)|const snapshot = useSelector|selector 保持纯函数|sealed read-query selector object|static ReadQuery 条件' docs/ssot docs/standards packages/logix-react/README.md skills/logix-best-practices/references packages/logix-react/test-dts packages/logix-core/test-dts
```

## Acceptance Checklist

- Public no-arg host read removed from success path.
- Core precision records cover exact, broad-root, broad-state, dynamic, debug, and unknown.
- React host consumes core route and has no parallel eligibility decision.
- Selector fingerprint identity prevents label collision.
- Dirty/read path authority proves overlap or rejects fallback.
- Verification control-plane reports only stage-authorized selector-quality evidence.
- Business witnesses pass outside Playground.
- Performance evidence is comparable and attached.
- SSoT, README, skills, proposal supersession, and spec all agree.

## StateTransaction Decomposition Result

- Split files:
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Deferred split, if any: none for the planned dirty, patch, and snapshot helpers.
- Verification:
  - `rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/StateTransaction.decomposition.guard.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - `rtk pnpm -C packages/logix-core exec tsc --noEmit`

## Implementation Result Commands

Focused commands run during implementation:

- `rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts test/Contracts/VerificationSelectorQualityLayering.contract.test.ts`
- `rtk pnpm -C packages/logix-react exec vitest run test/Contracts/ReactSelectorQualityEvidence.contract.test.ts`
- `rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.businessFormRow.contract.test.tsx test/Hooks/useSelector.businessMasterDetail.contract.test.tsx test/Hooks/useSelector.businessDashboard.contract.test.tsx`

Remaining before closure:

- comparable before perf baseline and diff artifact are deferred until a clean single-purpose selector-route perf branch exists
