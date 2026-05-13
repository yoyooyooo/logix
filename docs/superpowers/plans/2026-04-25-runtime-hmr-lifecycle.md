# Runtime HMR Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan unless the current user request explicitly authorizes subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a terminal, reset-first development HMR lifecycle for Logix Runtime so active React examples recover after code edits without manual refresh while example source keeps the target user authoring shape.

**Architecture:** Core owns host-neutral lifecycle owner, resource registry, cleanup, and evidence primitives. React/Vite/Vitest supply a dev-only host lifecycle carrier that injects owner, registry, and evidence services through Effect DI or an equivalent internal layer boundary. Examples enable the carrier once at the host boundary and continue using normal `Runtime.make`, `ManagedRuntime.make`, and `RuntimeProvider`.

**Tech Stack:** TypeScript, Effect V4, React 19, Vite HMR, Vitest, Vitest browser, pnpm, Markdown SSoT docs

---

## Bound Inputs

- `specs/158-runtime-hmr-lifecycle/spec.md`
- `specs/158-runtime-hmr-lifecycle/plan.md`
- `specs/158-runtime-hmr-lifecycle/data-model.md`
- `specs/158-runtime-hmr-lifecycle/contracts/README.md`
- `specs/158-runtime-hmr-lifecycle/quickstart.md`
- `specs/158-runtime-hmr-lifecycle/tasks.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`

## Non-Goals

- Do not add public `Runtime.hmr`, `Runtime.hotLifecycle`, `runtime.*` root command, or `Runtime.make({ hmr: true })`.
- Do not require app or example authors to assemble internal HMR layers at each runtime call site.
- Do not keep `createExampleRuntimeOwner(...)` as example authoring code.
- Do not implement state survival, retention, production live patching, or compatibility shims.
- Do not create an HMR-specific report protocol outside the canonical evidence envelope.

## File Structure

- `packages/logix-core/src/internal/runtime/core/hotLifecycle/context.ts`
  - Internal Effect service for the current hot lifecycle owner and runtime lifecycle context.
- `packages/logix-core/src/internal/runtime/core/hotLifecycle/{types,identity,resourceRegistry,cleanup,evidence,owner}.ts`
  - Existing host-neutral lifecycle primitive. Keep internal.
- `packages/logix-core/src/internal/runtime-contracts.ts`
  - Repo-internal carrier-facing exports. No public runtime facade.
- `packages/logix-core/src/Runtime.ts`
  - Continues to compose caller-provided layers. It may consume injected lifecycle context through normal layer composition, but does not grow HMR options.
- `packages/logix-core/src/internal/runtime/core/{TaskRunner,ModuleRuntime,RuntimeStore,DebugSink}.ts`
  - Register runtime-owned resources against the injected lifecycle context.
- `packages/logix-react/src/dev/lifecycle.ts`
  - React development lifecycle entrypoint for single host activation.
- `packages/logix-react/src/dev/vite.ts`
  - Vite integration entrypoint. Dev-only static boundary.
- `packages/logix-react/src/dev/vitest.ts`
  - Vitest setup entrypoint for simulated carrier tests.
- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
  - Carrier implementation that derives owner keys, creates lifecycle layers, and records host cleanup summary.
- `packages/logix-react/src/internal/provider/runtimeHotLifecycle.ts`
  - React projection cleanup bridge. Keeps `RuntimeProvider` projection-only.
- `packages/logix-react/src/internal/store/RuntimeExternalStore.hotLifecycle.ts`
  - External-store cleanup helper.
- `examples/logix-react/vite.config.ts`
  - Enables the Vite dev carrier once.
- `examples/logix-react/vitest.config.ts`
  - Enables the Vitest carrier once for tests.
- `examples/logix-react/src/demos/**`
  - Must not call `createExampleRuntimeOwner(...)` or carry per-demo `import.meta.hot.dispose` lifecycle policy.
- `examples/logix-react/test/**`
  - Carrier, browser, dogfood, and artifact evidence tests.
- `docs/ssot/runtime/{09,10}.md`
  - Authority writeback for carrier and evidence law.
- `apps/docs/content/docs/guide/**`
  - User docs once behavior is implemented.

## Chunk 1: Freeze Guards and Carrier Substrate

### Task 1: Guard core public surface and internal DI context

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/RuntimeHmrNoPublicRoute.guard.test.ts`
- Create: `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-di-context.contract.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/hotLifecycle/context.ts`
- Modify: `packages/logix-core/src/internal/runtime-contracts.ts`

- [ ] **Step 1: Extend public guard**

Assert these are absent from `Logix.Runtime` and from accepted `Runtime.make` option keys:

```ts
expect('hmr' in Logix.Runtime).toBe(false)
expect('hotLifecycle' in Logix.Runtime).toBe(false)
expect('disposeForHotReload' in Logix.Runtime).toBe(false)
```

Also assert `Runtime.make(Program, { hmr: true } as never)` is rejected by type tests or a public-surface snapshot, depending on the existing guard style.

- [ ] **Step 2: Add DI context contract**

Create a test that provides a lifecycle owner layer, resolves the current owner from an Effect, and proves the default path is absent when no carrier layer is installed.

- [ ] **Step 3: Harden context service**

Keep `currentRuntimeHotLifecycleOwner` internal. Ensure `runtimeHotLifecycleOwnerLayer(owner)` and the repo-internal export are the only carrier-facing creation path.

- [ ] **Step 4: Run core guard tests**

```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/RuntimeHmrNoPublicRoute.guard.test.ts test/Runtime/Lifecycle/hot-lifecycle-di-context.contract.test.ts
```

Expected: PASS.

### Task 2: Add React dev-only carrier entrypoints

**Files:**
- Create: `packages/logix-react/src/dev/lifecycle.ts`
- Create: `packages/logix-react/src/dev/vite.ts`
- Create: `packages/logix-react/src/dev/vitest.ts`
- Create: `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- Modify: `packages/logix-react/package.json`
- Create: `packages/logix-react/test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`

- [ ] **Step 1: Write entrypoint guard**

Assert normal imports from `@logixjs/react` do not export dev lifecycle carrier names. Assert dev entrypoints are separate package paths.

- [ ] **Step 2: Implement carrier API**

Expose a small dev-only API from `src/dev/lifecycle.ts`:

```ts
export type LogixDevLifecycleCarrier = {
  readonly carrierId: string
  readonly layerForRuntime: (args: { ownerId: string; runtimeInstanceId: string }) => Layer.Layer<any, never, never>
  readonly reset: (args: { ownerId: string; nextRuntimeInstanceId: string }) => Effect.Effect<unknown, never, never>
  readonly dispose: (args: { ownerId: string }) => Effect.Effect<unknown, never, never>
}
```

Names can be adjusted to fit local style, but the shape must preserve one host activation and internal layer injection.

- [ ] **Step 3: Implement Vite and Vitest adapters**

`src/dev/vite.ts` should expose a Vite plugin or setup function that installs carrier state once. `src/dev/vitest.ts` should expose a setup helper that test suites can call without touching demo runtime call sites.

- [ ] **Step 4: Add package exports**

Add dev-only subpaths such as:

```json
"./dev/lifecycle": "./src/dev/lifecycle.ts",
"./dev/vite": "./src/dev/vite.ts",
"./dev/vitest": "./src/dev/vitest.ts"
```

Keep `./internal/*` blocked.

- [ ] **Step 5: Run React entrypoint guard**

```bash
pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts
```

Expected: PASS.

## Chunk 2: Runtime Resource Attribution

### Task 3: Register runtime-owned resources

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- Modify: `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-resource-cleanup.contract.test.ts`
- Modify: `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-interrupted-work.guard.test.ts`

- [ ] **Step 1: Extend resource cleanup tests**

Cover `task`, `timer`, `watcher`, `subscription`, `module-cache-entry`, `imports-scope`, `runtime-store-topic`, and `debug-sink`.

- [ ] **Step 2: Register resources from creation time**

Where runtime internals create long-lived work, resolve the current lifecycle context and register cleanup callbacks. No transaction window may perform IO.

- [ ] **Step 3: Block stale writeback**

Use lifecycle context `isCurrent()` checks or equivalent owner status checks before interrupted async work writes state after reset/dispose.

- [ ] **Step 4: Run core lifecycle tests**

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-owner-handoff.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-resource-cleanup.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-interrupted-work.guard.test.ts test/Runtime/Lifecycle/hot-lifecycle-no-duplicate-resources.guard.test.ts
```

Expected: PASS.

## Chunk 3: React Projection and Host Cleanup

### Task 4: Keep RuntimeProvider projection-only and feed host cleanup summary

**Files:**
- Modify: `packages/logix-react/src/internal/provider/runtimeHotLifecycle.ts`
- Modify: `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- Modify: `packages/logix-react/src/internal/provider/runtimeBindings.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.hotLifecycle.ts`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx`
- Modify: `packages/logix-react/test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts`

- [ ] **Step 1: Update React tests to use the carrier**

Tests should install the carrier once and keep component code using normal runtime/provider shape.

- [ ] **Step 2: Feed cleanup summaries**

Summarize external-store listener, provider layer overlay, host subscription binding, and HMR boundary adapter cleanup into the lifecycle event.

- [ ] **Step 3: Preserve snapshot safety**

Ensure runtime context replacement is atomic and selector subscriptions do not observe mixed-runtime state.

- [ ] **Step 4: Run React lifecycle tests**

```bash
pnpm -C packages/logix-react exec vitest run test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts
```

Expected: PASS.

## Chunk 4: Example Carrier Dogfood

### Task 5: Remove example-visible helper route

**Files:**
- Modify or remove: `examples/logix-react/src/runtime/lifecycleOwner.ts`
- Modify or remove: `examples/logix-react/src/runtime/moduleHotBoundary.ts`
- Modify: `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`
- Modify: `examples/logix-react/src/demos/AppDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- Modify: `examples/logix-react/test/hmr-lifecycle-dogfood-sweep.contract.test.ts`
- Modify: `examples/logix-react/test/hmr-lifecycle-owner.contract.test.ts`

- [ ] **Step 1: Update dogfood sweep**

Assert covered demo files contain no `createExampleRuntimeOwner(` and no per-demo `import.meta.hot.dispose` lifecycle policy.

- [ ] **Step 2: Remove helper calls from demos**

Restore demos to normal runtime creation shape. Keep lifecycle wiring in host setup.

- [ ] **Step 3: Retire helper test**

Replace helper contract with a carrier contract or delete it if the new carrier test fully covers the behavior.

- [ ] **Step 4: Run static dogfood tests**

```bash
pnpm -C examples/logix-react exec vitest run test/hmr-lifecycle-dogfood-sweep.contract.test.ts
```

Expected: PASS.

### Task 6: Enable carrier once in example host and tests

**Files:**
- Modify: `examples/logix-react/vite.config.ts`
- Modify: `examples/logix-react/vitest.config.ts`
- Create: `examples/logix-react/test/hmr-host-carrier.contract.test.ts`
- Modify: `examples/logix-react/test/browser/hmr-active-demo-reset.contract.test.tsx`
- Create: `examples/logix-react/test/browser/hmr-module-invalidation-carrier.contract.test.tsx`
- Modify: `examples/logix-react/test/browser/hmr-repeated-reset.contract.test.tsx`
- Create or modify: `examples/logix-react/test/support/hmrWitnessArtifacts.ts`

- [ ] **Step 1: Configure Vite carrier**

Add the Logix dev lifecycle Vite integration once in `vite.config.ts`.

- [ ] **Step 2: Configure Vitest carrier**

Add the test setup carrier once in `vitest.config.ts`.

- [ ] **Step 3: Update browser witnesses**

Simulate or trigger hot lifecycle events through the carrier. Cover active task/timer recovery, module-only invalidation, and 20 repeated resets.

- [ ] **Step 4: Write feature artifact output**

Record environment, witness name, event count, residual resource counts, verdict, and perf conclusion or withheld reason under `specs/158-runtime-hmr-lifecycle/perf/`.

- [ ] **Step 5: Run example carrier tests**

```bash
pnpm -C examples/logix-react exec vitest run test/hmr-host-carrier.contract.test.ts test/browser/hmr-active-demo-reset.contract.test.tsx test/browser/hmr-module-invalidation-carrier.contract.test.tsx test/browser/hmr-repeated-reset.contract.test.tsx
```

Expected: PASS.

## Chunk 5: Evidence Envelope and Diagnostics

### Task 7: Connect lifecycle evidence to canonical evidence law

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/hotLifecycle/evidence.ts`
- Modify: `packages/logix-core/src/internal/verification/evidence.ts`
- Modify: `packages/logix-core/src/internal/verification/evidenceExportPipeline.ts`
- Modify: `packages/logix-core/src/internal/debug-api.ts`
- Modify: `packages/logix-core/test/Contracts/HotLifecycleEvidenceEnvelope.contract.test.ts`
- Create or modify: `packages/logix-core/test/Contracts/HotLifecycleEvidenceExportPipeline.contract.test.ts`
- Modify: `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-diagnostics-disabled.guard.test.ts`
- Modify: `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-evidence-serialization.contract.test.ts`

- [ ] **Step 1: Extend evidence tests**

Assert event type `runtime.hot-lifecycle`, deterministic ids, reset/dispose payloads, host cleanup summary, residual resource summary, and serializability.

- [ ] **Step 2: Keep diagnostics-disabled correctness independent**

No event allocation may be required for correctness when diagnostics or evidence capture is disabled.

- [ ] **Step 3: Implement export pipeline support**

Use existing `EvidencePackage` conventions. Do not add a new report shell.

- [ ] **Step 4: Run evidence tests**

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-evidence-serialization.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-diagnostics-disabled.guard.test.ts test/Contracts/HotLifecycleEvidenceEnvelope.contract.test.ts test/Contracts/HotLifecycleEvidenceExportPipeline.contract.test.ts
```

Expected: PASS.

## Chunk 6: Docs, Perf, and Closure

### Task 8: Update authority and user docs

**Files:**
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md`
- Modify: `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/react-integration.md`
- Modify: `apps/docs/content/docs/guide/essentials/react-integration.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/troubleshooting.md`
- Modify: `apps/docs/content/docs/guide/advanced/troubleshooting.cn.md`
- Modify: `packages/logix-core/test/Contracts/HotLifecycleDocsWriteback.contract.test.ts`
- Modify: `packages/logix-core/test/Contracts/HotLifecycleControlPlaneNegativeWriteback.contract.test.ts`

- [ ] **Step 1: Update docs to one carrier model**

Docs must say: enable once at host dev lifecycle boundary, keep normal runtime authoring, reset/dispose only, evidence through canonical envelope, no `Runtime.hmr`, no `Runtime.make({ hmr: true })`.

- [ ] **Step 2: Run docs tests**

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/HotLifecycleDocsWriteback.contract.test.ts test/Contracts/HotLifecycleControlPlaneNegativeWriteback.contract.test.ts
```

Expected: PASS.

### Task 9: Run performance and final gates

**Files:**
- Modify: `specs/158-runtime-hmr-lifecycle/perf/hmr-lifecycle-baseline.md`
- Create or modify: `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-bookkeeping.perf.test.ts`
- Modify: `specs/158-runtime-hmr-lifecycle/notes/acceptance.md`
- Modify: `specs/158-runtime-hmr-lifecycle/quickstart.md`

- [ ] **Step 1: Run focused perf**

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-bookkeeping.perf.test.ts
```

Expected: PASS or record `comparable=false` with reason.

- [ ] **Step 2: Run package gates**

```bash
pnpm --filter @logixjs/core typecheck
pnpm --filter @logixjs/react typecheck
pnpm --filter @examples/logix-react typecheck
pnpm --filter @logixjs/core test
pnpm --filter @logixjs/react test
pnpm --filter @examples/logix-react test
```

Expected: PASS, or record unrelated dirty-tree blockers with exact failing commands.

- [ ] **Step 3: Run repo gates**

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

Expected: PASS, or record unrelated blockers.

- [ ] **Step 4: Run SpecKit checks**

```bash
.codex/skills/speckit/scripts/bash/check-prerequisites.sh --feature 158 --json --require-tasks
.codex/skills/speckit/scripts/bash/extract-user-stories.sh --feature 158 --json
.codex/skills/speckit/scripts/bash/extract-coded-points.sh --feature 158 --json
.codex/skills/speckit/scripts/bash/extract-tasks.sh --feature 158 --json
```

Expected: all scripts return JSON without errors.

## Execution Notes

- The already-created core hot lifecycle primitives can be retained if they satisfy the carrier route.
- The already-created example helper route is superseded. Do not continue extending it.
- Any deletion of helper files must be limited to this HMR residue and only after imports are removed.
- Worktree is dirty. Use read-only git commands only unless the user explicitly asks for VCS actions.
