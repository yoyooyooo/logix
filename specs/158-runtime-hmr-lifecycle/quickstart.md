# Quickstart: Runtime HMR Lifecycle

**Feature**: `158-runtime-hmr-lifecycle`  
**Date**: 2026-04-25

## Goal

Verify that Logix React examples recover from development hot lifecycle events without manual page refresh.

## Expected Author Model

Use one host development lifecycle boundary:

1. Enable Logix development lifecycle once in the host setup, for example a Vite plugin, React dev lifecycle entrypoint, or Vitest setup entrypoint.
2. Write normal runtime code in examples and app modules.
3. Let the host dev lifecycle carrier provide lifecycle owner, registry, and evidence services through internal Effect DI.
4. On hot update, the carrier defaults to `reset`.
5. The carrier uses `dispose` when no successor runtime is created.
6. Inspect lifecycle evidence if recovery fails.

Example source should keep the target user-facing shape:

```ts
const runtime = Runtime.make(Program, {
  label: 'TaskRunnerDemoRuntime',
  devtools: true,
})

export const Demo = () => (
  <RuntimeProvider runtime={runtime}>
    <DemoView />
  </RuntimeProvider>
)
```

Do not add long-term per-demo hot cleanup snippets or example-visible lifecycle owner helpers.

## Manual Verification Check

1. Start the React example dev server.
2. Open a demo with active work, such as task runner or timer-like flow.
3. Trigger pending work.
4. Edit the demo or module source.
5. Observe whether the demo remains interactive.
6. If it breaks until full refresh, capture route, file edited, console output, and whether pending work was active.

## Automated Evidence

Evidence targets map to the closure matrix in [plan.md](./plan.md):

Focused closure commands:

```bash
pnpm -C examples/logix-react exec vitest run test/hmr-host-carrier.contract.test.ts test/browser/hmr-active-demo-reset.contract.test.tsx test/browser/hmr-module-invalidation-carrier.contract.test.tsx test/browser/hmr-repeated-reset.contract.test.tsx
pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-owner-handoff.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-resource-cleanup.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-interrupted-work.guard.test.ts test/Runtime/Lifecycle/hot-lifecycle-no-duplicate-resources.guard.test.ts
pnpm -C packages/logix-react exec vitest run test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts
pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-evidence-serialization.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-diagnostics-disabled.guard.test.ts test/Contracts/HotLifecycleEvidenceEnvelope.contract.test.ts test/Contracts/HotLifecycleEvidenceExportPipeline.contract.test.ts
pnpm -C examples/logix-react exec vitest run test/hmr-lifecycle-dogfood-sweep.contract.test.ts
pnpm -C packages/logix-core exec vitest run test/Contracts/HotLifecycleDocsWriteback.contract.test.ts test/Contracts/HotLifecycleControlPlaneNegativeWriteback.contract.test.ts
pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts
pnpm --filter @logixjs/core typecheck
pnpm --filter @logixjs/react typecheck
pnpm --filter @examples/logix-react typecheck
pnpm --filter @logixjs/core test
pnpm --filter @examples/logix-react test -- --run
```

Package and repo-level gates:

```bash
pnpm --filter @logixjs/react test -- --run
pnpm typecheck
pnpm lint
pnpm test:turbo
```

Browser evidence must cover:

- `CM-01`: active task or timer pending during runtime owner replacement
- `CM-03`: child module invalidation forwarded to the root owner
- repeated 20 `reset` events
- no duplicate active task/timer/watcher copies after cleanup settles
- lifecycle evidence generated when diagnostics or evidence capture is enabled
- `CM-04`: no mixed-runtime snapshot in React consumers and host cleanup summary is present
- covered examples contain no `createExampleRuntimeOwner(...)` authoring calls

The browser evidence is a host-specific upgrade layer. It must write feature artifacts and consume the same lifecycle evidence envelope described by `docs/ssot/runtime/09-verification-control-plane.md`. It must not introduce a separate HMR report protocol.

## Implementation Outcome

- Host activation is now a dev-only carrier boundary:
  - Vite: `examples/logix-react/vite.config.ts` calls `logixReactDevLifecycle()`.
  - Vitest: `examples/logix-react/test/setup/logix-dev-lifecycle.ts` calls `installLogixDevLifecycleForVitest()`.
  - Carrier entrypoints live under `@logixjs/react/dev/lifecycle`, `@logixjs/react/dev/vite`, and `@logixjs/react/dev/vitest`.
- The Vite entrypoint is safe to import from `vite.config.ts`; it injects browser carrier bootstrap HTML and does not load lifecycle runtime code during config evaluation.
- Covered example demos keep normal `Runtime.make`, `ManagedRuntime.make`, `RuntimeProvider`, and `useModule` authoring.
- Covered example demos contain no `createExampleRuntimeOwner(...)` authoring calls and no long-term per-demo `import.meta.hot.dispose` cleanup policy.
- Hot lifecycle evidence uses the existing `runtime.hot-lifecycle` event and existing evidence envelope.
- Real Vite dev-server HMR smoke was run for `/task-runner-demo`; Playwright verified no full page refresh, route retention, no console errors, and post-HMR `refresh` dispatch/writeback.
- Production steady-state overhead claim remains withheld. `perf/hmr-lifecycle-baseline.md` records `comparable=false`.
- `packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts` was repaired because the test referenced a nonexistent module-local `RuntimeContracts` property while validating package gates.

## Evidence Location

Use this directory for feature-specific artifacts:

```text
specs/158-runtime-hmr-lifecycle/perf/
specs/158-runtime-hmr-lifecycle/notes/
```

Expected artifact families:

- `hmr-browser-evidence`
- `lifecycle-evidence`
- `host-cleanup-summary`
- `perf-baseline`

## Closure Checklist

- Active example recovers without manual refresh.
- Previous runtime owner leaves no disallowed active resources.
- Diagnostics explain reset, dispose, or cleanup failure.
- Examples follow normal runtime authoring code and receive hot lifecycle support from the host dev lifecycle carrier.
- Docs state owner, boundary, reset, cleanup, evidence.
