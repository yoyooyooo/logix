# runtimeOwnership Dev Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED: use `executing-plans` or an equivalent implementation workflow before editing code. This plan was revised through `plan-optimality-loop`; do not re-expand it into process-coded names or duplicate lifecycle authorities.

**Goal:** Make React DEV lifecycle cleanup explicitly respect `runtimeOwnership`, keep borrowed runtimes reusable across SPA remounts, and move the Playground workbench runtime back to module scope with a browser route contract proving `/ -> /playground -> / -> /playground`.

**Adopted Design:** `runtimeOwnership` is a carrier-internal dispose authority, not target discovery metadata. The only default is `borrowed`; only an explicitly `owned` binding may call `runtime.dispose()`. `RuntimeProvider`, `useModule(Program)`, and `useModuleRuntime(ModuleTag)` borrow runtime objects through the bridge. Program module instance lifetime remains owned by `ModuleCache`.

**Tech Stack:** TypeScript, React 19, Effect v4, Vitest, Testing Library, Playwright, Vite dev server, Logix React DEV lifecycle carrier.

---

## Non-Negotiable Constraints

- All shell commands must start with `rtk`.
- Do not use `git restore`, `git checkout -- <path>`, `git reset`, `git clean`, or `git stash`.
- Do not commit or push unless the user explicitly asks.
- Use the field spelling `runtimeOwnership` in code, docs, tests, and plan text.
- Do not introduce process-coded planning names into production source names.
- Preserve the current public React root surface. DEV lifecycle remains under `@logixjs/react/dev/lifecycle`.
- Do not add `runtimeOwnership` to route, live inspect, CLI machine output, or `listRuntimeBindings()` target snapshots unless a separate inspect contract proves it is required.

## Current Failure Model

The carrier cleanup path disposes the currently bound runtime during owner reset/dispose. That is only correct when the carrier owns the runtime object. In React host usage, the carrier usually borrows a runtime supplied by `RuntimeProvider`, `useModule(Program)`, or `useModuleRuntime(ModuleTag)`.

The visible regression is:

```text
/ -> /playground -> / -> /playground
```

When the Playground workbench runtime is module-scoped, the second `/playground` entry reuses the same runtime object. If DEV carrier cleanup disposed it during the first route leave, the second mount sees `ManagedRuntime disposed`.

## Adopted Contract

- `runtimeOwnership` has exactly two values: `borrowed` and `owned`.
- Ownership is decided when a runtime object is bound by `bindRuntime`, not when `layerForRuntime` creates a lifecycle layer.
- `layerForRuntime` creates/provides the lifecycle owner only. It must not accept or store dispose authority.
- `bindInstalledDevLifecycleCarrier` is the single React bridge defaulting point. It passes `runtimeOwnership: 'borrowed'` unless an internal caller explicitly overrides it.
- React host callsites do not duplicate the borrowed default. They are covered by a `bindInstalledDevLifecycleCarrier(` inventory sweep.
- `listRuntimeBindings()` remains target discovery. It exposes owner id, runtime instance id, carrier id, host kind, labels/manifests, and target coordinate only.
- `resolveRuntimeBinding()` may continue to expose runtime execution handles and module runtime handles, but it should not expose `runtimeOwnership` unless an internal execution contract needs it.
- Carrier reset/dispose always cleans host/dev bindings and optional binding cleanup.
- Carrier reset/dispose calls `runtime.dispose()` only when the current bound runtime is explicitly `owned`.
- `owned` is an internal positive guard for the only legal carrier-dispose path. Do not add a production owned runtime factory in this plan unless implementation reveals an existing owned producer.
- Program module instances remain owned by `ModuleCache`; retain/release/gc cleanup closes module instance scopes without transferring base runtime ownership to the carrier.

## Files

- Modify: `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
  - Add the `runtimeOwnership` binding contract.
  - Keep ownership out of `layerForRuntime` and `listRuntimeBindings()`.
  - Remove or collapse duplicate owner binding so one carrier binding has one lifecycle owner.
  - Gate `runtime.dispose()` by `runtimeOwnership === 'owned'`.
- Modify: `packages/logix-react/src/internal/provider/runtimeDevLifecycleBridge.ts`
  - Add bridge option `runtimeOwnership`.
  - Default all installed carrier bindings to `borrowed`.
- Modify only if tests prove necessary: `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
  - Keep current behavior. Do not add a public prop.
- Modify only if tests prove necessary: `packages/logix-react/src/internal/hooks/useModule.ts`
  - Keep Program base runtime borrowed through bridge default.
  - Do not move module instance disposal out of `ModuleCache`.
- Modify only if tests prove necessary: `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
  - Ensure ModuleTag runtime bindings are covered by bridge default.
- Modify: `packages/logix-react/test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`
  - Add carrier ownership and one-owner contract tests.
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx`
  - Add borrowed reset/dispose host cleanup evidence.
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx`
  - Add provider, Program module, and ModuleTag remount regressions.
- Modify only if missing: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
  - Prove SPA navigation `/ -> /playground -> / -> /playground` without page errors.
- Modify: `packages/logix-playground/src/Playground.tsx`
  - Move the Playground workbench runtime back to module scope after carrier fix.
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - Document React host runtime dispose authority.
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - Document app/page/session runtime lifecycle mapping for examples.

## Implementation Waves

### Wave 1: Lock The Carrier Contract With Failing Tests

- [ ] Add borrowed reset test:
  - bind a runtime without `runtimeOwnership`;
  - register host cleanup evidence such as an external-store disposer or provider-layer disposer;
  - call `binding.reset(...)` or `carrier.reset(...)`;
  - assert host cleanup summary closed the disposer;
  - assert the runtime still runs a trivial effect afterward.
- [ ] Add borrowed dispose test:
  - bind a runtime without `runtimeOwnership`;
  - register host cleanup evidence;
  - call `binding.dispose(...)` or `carrier.dispose(...)`;
  - assert host cleanup summary closed the disposer;
  - assert the runtime still runs afterward;
  - assert the carrier no longer lists that owner when carrier-level dispose removes the record.
- [ ] Add owned reset test:
  - bind with `runtimeOwnership: 'owned'`;
  - call reset;
  - assert subsequent `runtime.runPromise(...)` rejects with a disposed-runtime error.
- [ ] Add owned dispose test:
  - bind with `runtimeOwnership: 'owned'`;
  - call dispose;
  - assert subsequent `runtime.runPromise(...)` rejects with a disposed-runtime error.
- [ ] Add one-owner test:
  - assert `binding.owner === carrier.getOwner(ownerId)`;
  - assert the runtime's current hot lifecycle owner is the same owner id after bind.
- [ ] Add discovery boundary test:
  - assert `carrier.listRuntimeBindings()` does not include `runtimeOwnership`.

Run focused RED command:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx
```

Expected before implementation: ownership tests fail or fail to compile because `runtimeOwnership` does not exist.

### Wave 2: Implement Carrier Dispose Authority

- [ ] Add:

```ts
export type LogixDevLifecycleRuntimeOwnership = 'borrowed' | 'owned'
```

- [ ] Keep `LogixDevLifecycleRuntimeArgs` free of `runtimeOwnership`.
- [ ] Add `runtimeOwnership?: LogixDevLifecycleRuntimeOwnership` only to `LogixDevLifecycleBindRuntimeArgs`.
- [ ] Store the current bound runtime's ownership in `OwnerRecord`, defaulting to `borrowed`.
- [ ] Ensure omitted ownership on a later bind cannot accidentally downgrade an existing explicitly owned binding during the same runtime binding operation. Prefer deriving ownership from the current `bindRuntime` call only and replacing the record when the runtime identity changes.
- [ ] Change owner cleanup so it runs optional binding cleanup, then calls `runtime.dispose()` only for `owned`.
- [ ] Collapse duplicate lifecycle owner usage in carrier binding:
  - the returned `binding.owner` should be `record.owner`;
  - runtime owner binding should target `record.owner`;
  - reset/dispose should use `record.owner` and `disposeHostBindingsForRuntime(...)`;
  - avoid creating a second owner for the same carrier binding.
- [ ] Keep `listRuntimeBindings()` shape unchanged. Do not update exact live browser snapshots for ownership.
- [ ] Keep `resolveRuntimeBinding()` unchanged unless TypeScript requires an internal-only field. If a field is added there, do not forward it to live target discovery or CLI machine output.

Run GREEN command:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx
```

Expected: borrowed reset/dispose clean host bindings without disposing runtime; owned reset/dispose disposes runtime; discovery snapshot does not include `runtimeOwnership`.

### Wave 3: Centralize React Bridge Default

- [ ] Add `runtimeOwnership?: LogixDevLifecycleRuntimeOwnership` to `bindInstalledDevLifecycleCarrier` options.
- [ ] Pass `runtimeOwnership: options.runtimeOwnership ?? 'borrowed'` to `carrier.bindRuntime(...)`.
- [ ] Run a callsite sweep:

```bash
rtk rg -n "bindInstalledDevLifecycleCarrier\\(" packages/logix-react/src -g '*.ts' -g '*.tsx'
```

- [ ] Confirm all current React host bindings route through the bridge:
  - `RuntimeProvider.tsx`;
  - `useModule.ts`;
  - `useModuleRuntime.ts`;
  - `runtimeDevLifecycleBridge.ts` helper calls.
- [ ] Do not add `runtimeOwnership: 'borrowed'` at each callsite unless a test proves a call bypasses the bridge default.
- [ ] Do not add a `RuntimeProvider` prop.

Run typecheck:

```bash
rtk pnpm -C packages/logix-react typecheck:test
```

Expected: typecheck passes or reports only unrelated pre-existing errors that are captured in implementation notes.

### Wave 4: Prove React Host Remount Semantics

- [ ] Add provider remount regression:
  - create one runtime;
  - install carrier;
  - mount `<RuntimeProvider runtime={runtime}>`;
  - unmount;
  - assert runtime still runs;
  - mount again with the same runtime;
  - assert no disposed-runtime error.
- [ ] Add Program module remount regression:
  - use `useModule(Program, { gcTime: 0 })`;
  - unmount and allow GC path to run;
  - assert base runtime still runs;
  - assert module instance cleanup is observable through `ModuleCache`, for example changed instance id after remount or a test-only scope cleanup spy.
- [ ] Add ModuleTag remount regression if the existing hook binding path is not already covered:
  - exercise `useModuleRuntime(ModuleTag)` or an equivalent `useModule(ModuleTag)` consumer;
  - unmount/remount under installed carrier;
  - assert the runtime remains alive and module runtime handles still work.
- [ ] Keep `ModuleCache` as the owner of module instance scopes. Do not add carrier cleanup for module runtime scopes.

Run focused React contract:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx
```

Expected: provider, Program module, and ModuleTag remount paths pass.

### Wave 5: Restore Playground Module-Scope Runtime

- [ ] Ensure `examples/logix-react/test/browser/playground-route-contract.playwright.ts` includes an SPA route contract for:

```text
/ -> /playground -> / -> /playground
```

- [ ] The contract must use client-side navigation or browser history for the middle transition, not only fresh `page.goto(...)` calls.
- [ ] It must collect `pageerror` events and fail on `ManagedRuntime disposed`.
- [ ] Move `playgroundWorkbenchRuntime` in `packages/logix-playground/src/Playground.tsx` back to module scope.
- [ ] Remove component-local `React.useMemo(...)` runtime creation for the Playground workbench.

Run browser contract:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected:

- the remount route contract passes;
- no `ManagedRuntime disposed` page errors;
- Playground starts from the default project state on second entry.

Run package tests:

```bash
rtk pnpm -C packages/logix-playground test
```

Expected: package tests pass or only unrelated pre-existing failures are documented.

### Wave 6: Update SSoT

- [ ] In `docs/ssot/runtime/10-react-host-projection-boundary.md`, add the React host rule:
  - `RuntimeProvider runtime={runtime}` borrows the provided runtime;
  - provider-owned resources include external stores, provider layer overlay scopes, debug sinks, subscriptions, and DEV lifecycle bindings;
  - provider unmount, reset, and DEV cleanup must not dispose the provided runtime;
  - only an explicitly `owned` carrier binding may call `runtime.dispose()`;
  - `useModule(Program)` module instance scope remains under `ModuleCache`.
- [ ] In `docs/ssot/runtime/07-standardized-scenario-patterns.md`, add lifecycle mapping:
  - app-level runtime objects are app-owned;
  - route/page runtime objects are page-owned only when created by that route/page;
  - a React host component that receives a runtime through props borrows it;
  - Program and ModuleTag module instances are `ModuleCache`-owned unless a future contract says otherwise.
- [ ] Avoid making `owned` look like a normal public authoring choice. It is the internal guard for carrier-created or carrier-owned runtimes.

Run naming and boundary sweep:

```bash
rtk rg -n "runtimeOwner[Ss]hip|disposeRuntimeOnReset|runtimeOwnership|runtime lifecycle authority|runtime dispose authority" docs packages/logix-react packages/logix-playground
```

Expected:

- no misspelled ownership field;
- no old `disposeRuntimeOnReset` style flag;
- natural-language docs use `runtimeOwnership` or dispose-authority wording consistently;
- `runtimeOwnership` does not appear in live target discovery snapshots or CLI machine-output contracts.

## Final Verification

Run:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx
rtk pnpm -C packages/logix-react typecheck:test
rtk pnpm -C examples/logix-react test -- --run route --reporter=dot
rtk pnpm -C examples/logix-react test:browser:playground
rtk pnpm -C packages/logix-playground test
```

Inspect diff without committing:

```bash
rtk git diff -- packages/logix-react packages/logix-playground examples/logix-react/test/browser/playground-route-contract.playwright.ts docs/ssot/runtime/10-react-host-projection-boundary.md docs/ssot/runtime/07-standardized-scenario-patterns.md
```

## Acceptance Criteria

- `runtimeOwnership` exists on carrier bind args and carrier-owned internal record state.
- `runtimeOwnership` does not exist on `layerForRuntime` args.
- `runtimeOwnership` does not exist in `listRuntimeBindings()` snapshots, route contracts, or CLI machine output.
- Default ownership is `borrowed` and is centralized in `bindInstalledDevLifecycleCarrier`.
- Borrowed reset and borrowed dispose clean host/dev bindings but do not call `runtime.dispose()`.
- Owned reset and owned dispose may call `runtime.dispose()`.
- Carrier binding uses one lifecycle owner per owner record.
- `RuntimeProvider` does not own or dispose externally provided runtime.
- `useModule(Program)` and `useModuleRuntime(ModuleTag)` do not transfer base runtime ownership to the carrier.
- Program module instance disposal remains under `ModuleCache`.
- Playground workbench runtime is module-scoped again.
- SPA route sequence `/ -> /playground -> / -> /playground` works without `ManagedRuntime disposed`.

## Risks And Follow-Ups

- If a real owned producer appears during implementation, document it as an internal producer and add a focused test. Do not add a public React authoring option in this plan.
- If live inspect later needs ownership visibility, add a separate internal debug facet. Do not overload target discovery snapshots.
- If adapter identity still causes duplicate owner churn after borrowed disposal is fixed, add a follow-up to canonicalize `adapter -> baseRuntime` identity for DEV lifecycle owner lookup. Do not block this plan unless the Playground remount contract still fails.
- If ModuleCache cleanup is not directly observable through existing tests, add a minimal test-only fixture or assert instance turnover after `gcTime: 0`; do not expose new public diagnostics only for this proof.
