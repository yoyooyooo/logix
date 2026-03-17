# 2026-03-20 · boot/preload sync-confirm（sync-ready neutral lane）

## 结论类型

- `accepted_with_evidence`
- `recyclable`

## 可回收结论

本线可回收。`sync-ready neutral lane` 已去掉 boot 期默认 async config confirm，同时保留 ready 期一次性 refresh 窗口。最小门禁与 probe 全绿，未新增 blocker。

## 输入与目标

- 输入基线：`docs/perf/archive/2026-03/2026-03-19-boot-preload-residual-plan.md`
- 唯一目标：实现 `sync-ready neutral lane`，去掉 boot 默认 async confirm，保留 ready 一次 refresh。
- 明确禁做：`boot-epoch config singleflight`、`RAF/readSync scope-make fastpath`、旧 `neutral-config singleflight`、`unresolved-only preload continuation`。

## 实施范围

已修改：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/archive/2026-03/2026-03-20-boot-preload-sync-confirm.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-boot-preload-sync-confirm.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-boot-preload-sync-confirm.probe-next-blocker.json`

未修改（禁区保持）：

- `packages/logix-react/src/internal/store/ModuleCache.ts`
- `packages/logix-core/**`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `README.md`

## 代码切口

### 1) RuntimeProvider 的 confirm 门控改为 sync-ready ready-window

在 `RuntimeProvider` 的 config confirm effect 中新增：

- `isSyncReadyNeutralLane`：`loaded && loadMode === 'sync' && !bootConfigOwnerLocked && !syncOverBudget`
- `shouldRunAsyncConfigConfirm`：非 `sync-ready neutral` 维持原行为；`sync-ready neutral` 仅在 `providerReadyAtRef.current !== undefined` 时触发。

效果：

- 移除 boot 期默认 async confirm。
- 保留 ready 期一次 refresh 窗口。
- token 仍使用 `owner + lane + phase`，未改 token 语义。

### 2) 最小测试补强

`runtime-bootresolve-phase-trace` 增加断言：

- `runtime.base + phase=ready` 的 async snapshot 为 1 次。
- `runtime.base + phase=boot` 的 async snapshot 为 0 次。

## 最小验证结果

1. `pnpm --filter @logixjs/react typecheck:test`  
   结果：通过。
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`  
   结果：`2 passed, 0 failed`。
3. `pnpm --filter @logixjs/react exec vitest run test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks`  
   结果：`9 passed, 0 failed`。
4. `python3 fabfile.py probe_next_blocker --json`  
   结果：`status=clear`，`blocker=null`。

## 证据落盘

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-boot-preload-sync-confirm.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-boot-preload-sync-confirm.probe-next-blocker.json`

## 失败门复核

未观察到以下回摆：

- `boot-epoch config singleflight` 语义回摆。
- `unresolved-only preload continuation` 语义回摆。
- config-bearing 首屏正确性回归。

