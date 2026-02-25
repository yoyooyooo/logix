# ModuleRuntime.transaction listConfigs guard 证据补齐（PR4）

- 分支：`perf/cr88-moduletxn-listconfigs-bench`
- 目标：补齐 `ModuleRuntime.transaction` 中 listConfigs guard（`getListConfigs` + `shouldReconcileListConfigsByDirtySet`）的可复现微基准证据，不改 API。

## 改动范围
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
  - 新增微基准夹具，对比两种提交路径：
    - `legacy`：有 listConfigs 就执行 `rowIdStore.updateAll`
    - `guarded`：先走 `shouldReconcileListConfigsByDirtySet`，仅命中时执行 `updateAll`
  - 固定输出两组证据：
    - `no-overlap`：dirty root 与 list path 不重叠（验证 guard 跳过收益）
    - `overlap`：dirty root 与 list path 重叠（验证 guard 不牺牲一致性）

## 微基准命令（可复现）
- `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`

## 本次结果（2026-02-25，本地）
- `[perf] ModuleRuntime.transaction.listConfigsGuard no-overlap iters=20 txns=256 legacy.p50=13.144ms legacy.p95=13.427ms guarded.p50=0.048ms guarded.p95=0.071ms speedup=276.47x updateAll(legacy=5120,guarded=0)`
- `[perf] ModuleRuntime.transaction.listConfigsGuard overlap iters=20 txns=256 legacy.p50=13.194ms legacy.p95=13.500ms guarded.p50=13.522ms guarded.p95=13.776ms guardedOverhead=1.02x updateAll(legacy=5120,guarded=5120)`

## 最小功能回归
- 命令：`pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/RowId.UpdateGate.test.ts`
- 结果：`1 file / 11 tests passed`

## 结论
- 在 no-overlap 场景，guard 成功将 `updateAll` 从 `5120` 次降为 `0`，证据显示提交热路径有明显收益。
- 在 overlap 场景，guard 与 legacy 同步执行 `updateAll`（均为 `5120` 次），符合一致性预期。

## 机器人 Review 消化
- Gemini Code Assist：
  - inline 建议 1：测试导入统一为 `@effect/vitest`，已采纳；
  - inline 建议 2/3：测试体改为 `it.effect(..., () => Effect.sync(...))` 并同步闭合结构，已采纳。
- 对应修复提交：`ee45f31c`（保持单 commit）。
- CodeRabbit：本轮仅 rate-limit 提示，无 actionable 代码建议。
