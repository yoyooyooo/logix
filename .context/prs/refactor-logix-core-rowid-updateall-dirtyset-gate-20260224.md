# PR Draft: refactor/logix-core-rowid-updateall-dirtyset-gate-20260224

## 目标
- 优化 `logix-core` 事务提交热路径：避免每次 commit 都对所有 list 配置执行 `rowIdStore.updateAll`。
- 在不牺牲一致性的前提下，以 `dirtySet` 门控 RowId 对齐，减少无关字段提交时的遍历开销。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/state-trait/rowid.ts`
- `packages/logix-core/src/internal/field-path.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- `packages/logix-core/test/internal/StateTrait/RowId.UpdateGate.test.ts`
- `specs/070-core-pure-perf-wins/tasks.md`

## 本轮改动
- `packages/logix-core/src/internal/state-trait/rowid.ts`
  - 新增 `shouldReconcileListConfigsByDirtySet`：依据 `dirtySet + fieldPathIdRegistry + listConfigs` 判断是否需要执行 list RowId 全量对齐。
  - 判定策略：
    - `dirtyAll` -> 必须对齐。
    - 无 registry 或 rootId 映射失败 -> 保守对齐（防漏同步）。
    - 仅当 dirty roots 与 list path 前缀重叠时对齐，否则跳过。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - commit 热路径引入 RowId 对齐门控：由“有 list 配置就 updateAll”升级为“`shouldReconcileListConfigsByDirtySet` 为 true 才 updateAll”。
  - 保持事务窗口、commitHub 发布和 state:update 语义不变。
- `packages/logix-core/test/internal/StateTrait/RowId.UpdateGate.test.ts`
  - 新增 8 条回归：覆盖 dirtyAll、无 registry、未知 rootId 保守回退、祖先/后代路径重叠命中、无关路径跳过等关键分支。

## 验证
- `pnpm --filter @logixjs/core test -- test/internal/StateTrait/RowId.UpdateGate.test.ts` ✅
- `pnpm --filter @logixjs/core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` ✅
- `pnpm --filter @logixjs/core test -- test/internal/StateTrait/RowId.UpdateGate.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` ✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 性能与诊断证据
- 性能收益点：list-heavy 模块在“提交字段与 list 配置无重叠”场景，跳过 `updateAll` 的全量遍历。
- 正确性策略：无法确定是否相关时一律回退 `updateAll`，保证不牺牲 RowId 一致性。
- 本地策略：类型与测试门禁走通；性能回归继续由 PR CI 工件收敛。

## 独立审查
- Reviewer：subagent（`agent_id=019c8bc4-cf6f-75c2-a8de-71d53bfd64bd`）
- 初审结论：无高/中风险，`可合并`；指出 3 条低风险建议：
  - list path 归一化应与 `FieldPath` 同口径（避免非常规 path 误判）。
  - 建议补 1 条真实提交链路集成回归（当前以纯函数门控测试为主）。
  - PR 记录需补齐审查结论。
- 已处理：
  - `rowid.ts` 改为复用 `normalizeFieldPath`，归一化失败时保守回退 `true`（不跳过 `updateAll`）。
  - `RowId.UpdateGate.test.ts` 增补 `list path normalization fails -> true` 回归。
  - 本文件已补齐审查记录与结论。
- 最终结论：`可合并`（残余低风险：真实提交链路的 updateAll 次数断言可在后续 PR 继续补强）。

## 风险与回滚
- 风险：若 dirty-path 与 list-path 重叠判定错误，可能导致少量场景漏做 RowId 对齐（已通过保守回退降低风险）。
- 回滚：移除 `shouldReconcileListConfigsByDirtySet` 门控，恢复 commit 时“有 list 配置即 `updateAll`”的旧路径。

## 机器人评论消化（CodeRabbit）
- 待 PR 创建后补充。
