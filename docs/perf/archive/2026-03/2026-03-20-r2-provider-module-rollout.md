# 2026-03-20 · R2 provider_module/provider_default tier-first rollout 下一刀

> worktree: `agent/v4-perf-r2-provider-module-rollout`  
> branch: `agent/v4-perf-r2-provider-module-rollout`

## 0. 目标与边界

本刀只做 `provider_module/provider_default` 层的 tier-first rollout 收口，保持实现面最小：

1. 修正高优先级 tier（interactive/throughput）无法覆盖低优先级 `forced_off/forced_sync` 的语义断点。  
2. 保证 surface 与 diagnostics 归因一致，`trace:txn-lane` 能解释 override 清除来源。  

约束遵守：
- 未回到设计阶段。
- 未做 queue-side 微调。
- 未改 React / external-store。

## 1. 实现摘要

### 1.1 provider 层 tier-first 覆盖语义修正

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`

改动点：
- `collectPatchWrites`：当 `parsed.tier` 为 `interactive/throughput` 时，显式把 `overrideMode` 记为该层写入字段。  
- `applyParsedPatch`：当 `parsed.tier` 为 `interactive/throughput` 时，若状态中已有低层残留 `overrideMode`，在当前层清除并记录归因。  

结果：
- `provider_default` 可用 interactive tier 重新启用 lanes，不再被低层 `forced_off/forced_sync` 锁死。  
- `provider_module` 可在模块粒度覆盖 `provider_default` 的 kill-switch。  
- `resolvedBy.overrideMode` 与 `resolvedBy.queueMode` 会正确指向实际清除该字段的 provider 层。  

### 1.2 lane 测试补齐 provider_default/provider_module 覆盖面

文件：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

新增用例：
- `provider_default interactive tier clears lower forced_off and restores lanes`
- `provider_module interactive tier clears provider_default forced_off and wins by moduleId`

关键断言：
- `effective.enabled === true`
- `effective.overrideMode === undefined`
- `effective.queueMode === 'lanes'`
- `explain.scope` 分别为 `provider_default` / `provider_module`
- `resolvedBy.overrideMode` 与 `resolvedBy.queueMode` 跟随对应 provider 层

## 2. 验证与门禁

执行命令：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

结果：
- `typecheck:test`：通过。  
- lane 4 文件：`16/16` 用例通过。  
- `probe_next_blocker --json`：`status=clear`，`threshold_anomaly_count=0`，未新增 blocker。  

## 3. 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-provider-module-rollout.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-provider-module-rollout.probe-next-blocker.json`

## 4. 结论

本刀为 `accepted_with_evidence`：
- provider_default/provider_module 层 tier-first rollout 已完成关键语义收口。  
- diagnostics 归因与生效策略一致，覆盖清除路径可解释。  
- 验证门禁全部通过，未引入新的 blocker。  
