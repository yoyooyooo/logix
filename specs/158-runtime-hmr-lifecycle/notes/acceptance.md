# Acceptance Notes

## Implemented In This Pass

- Core internal hot lifecycle primitive under `packages/logix-core/src/internal/runtime/core/hotLifecycle/**`.
- Decision set limited to `reset | dispose`.
- Idempotent owner reset/dispose and repeated reset cleanup sequencing.
- Runtime resource registry with slim cleanup summary.
- Evidence builder and `runtime.hot-lifecycle` observation envelope adapter.
- Public surface guard proving no `Runtime.hmr`, `Runtime.hotLifecycle`, or `disposeForHotReload`.
- Repo-internal lifecycle contracts exposed through `@logixjs/core/repo-internal/runtime-contracts`.
- React dev lifecycle carrier entrypoints under `@logixjs/react/dev/lifecycle`, `@logixjs/react/dev/vite`, and `@logixjs/react/dev/vitest`.
- React host cleanup helper and `RuntimeProvider` projection cleanup hook consume the installed carrier while ordinary component code keeps the normal React integration shape.
- Runtime external-store hot lifecycle disposer registry.
- The repo-local example runtime owner helper route is superseded and no longer appears in covered example authoring code.
- Example host activation is configured once in `examples/logix-react/vite.config.ts` and `examples/logix-react/test/setup/logix-dev-lifecycle.ts`.
- Example carrier browser contracts cover active demo reset, module-only invalidation, and 20 repeated resets through the host dev lifecycle carrier.
- Real Vite dev-server smoke passed for `/task-runner-demo`: Playwright observed source HMR, preserved a browser global token and route URL, then dispatched `refresh` again and observed pending/success log writeback without console errors.
- `@logixjs/react/dev/vite` is config-load safe: it does not import lifecycle runtime code during Vite config evaluation, and installs the browser carrier only through the injected HTML bootstrap.
- SSoT writeback in runtime `04`, `09`, and `10`.
- User docs writeback across scope/resource lifetime, React integration, recipe, and troubleshooting docs.
- React public surface remains split: root `@logixjs/react` does not export dev carrier names, and docs only import dev carrier paths in host setup examples.
- React `useModule(Module)` legacy public input now throws guidance consistently with the current host law: `useModule(ModuleTag)` for shared instances and `useModule(Program, options?)` for local instances.

## Verified Commands

- `pnpm -C examples/logix-react exec vitest run test/hmr-host-carrier.contract.test.ts test/browser/hmr-active-demo-reset.contract.test.tsx test/browser/hmr-module-invalidation-carrier.contract.test.tsx test/browser/hmr-repeated-reset.contract.test.tsx`
- `pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-owner-handoff.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-resource-cleanup.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-interrupted-work.guard.test.ts test/Runtime/Lifecycle/hot-lifecycle-no-duplicate-resources.guard.test.ts`
- `pnpm -C packages/logix-react exec vitest run test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts`
- `pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-evidence-serialization.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-diagnostics-disabled.guard.test.ts test/Contracts/HotLifecycleEvidenceEnvelope.contract.test.ts test/Contracts/HotLifecycleEvidenceExportPipeline.contract.test.ts`
- `pnpm -C examples/logix-react exec vitest run test/hmr-lifecycle-dogfood-sweep.contract.test.ts`
- `pnpm -C packages/logix-core exec vitest run test/Contracts/HotLifecycleDocsWriteback.contract.test.ts test/Contracts/HotLifecycleControlPlaneNegativeWriteback.contract.test.ts`
- `pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`
- `pnpm -C packages/logix-react exec vitest run test/Hooks/useModule.legacy-inputs.test.tsx test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`
- `pnpm -C apps/docs types:check`
- `pnpm -C apps/docs build`
- `pnpm -C examples/logix-react dev --host 127.0.0.1 --port 5198 --strictPort`
- Playwright real Vite HMR smoke for `http://127.0.0.1:5198/task-runner-demo`: source edit on `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`, token retained, URL retained, post-HMR refresh dispatch produced two latest log lines, console/page errors empty.
- `pnpm --filter @logixjs/core typecheck`
- `pnpm --filter @logixjs/react typecheck`
- `pnpm --filter @examples/logix-react typecheck`
- `pnpm --filter @logixjs/core test`
- `pnpm --filter @logixjs/react test -- --run`
- `pnpm --filter @examples/logix-react test -- --run`
- `pnpm -C packages/logix-cli exec vitest run test/Args/Args.cli-config-prefix.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:turbo`

## Repo Gate Results

- Repo gates `pnpm typecheck`, `pnpm lint`, and `pnpm test:turbo` pass after package-level closure.
- CLI archived `trialrun` argv-normalization witness now asserts the route-minimal contract: archived alias is rejected as `未知命令：trialrun`.

## Withheld Claims

- Production steady-state perf conclusion is withheld. `perf/hmr-lifecycle-baseline.md` records `comparable=false`.
- Full retention across HMR is not claimed. The implemented development policy resets the runtime owner and proves post-HMR interactivity without page refresh.
- Example helper based evidence is superseded and not counted as final closure evidence.
