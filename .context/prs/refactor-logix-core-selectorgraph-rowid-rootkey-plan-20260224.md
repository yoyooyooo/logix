# PR Draft: refactor/logix-core-selectorgraph-rowid-rootkey-plan-20260224

- PR：`#53` https://github.com/yoyooyooo/logix/pull/53
- 合并策略：`auto-merge(rebase)` 已开启（等待 required checks）
- CI watcher：`.context/pr-ci-watch/pr-53-20260224-030942.log`

## 目标
- 优化 `logix-core` 提交热路径中两类高频匹配开销：
  - `SelectorGraph.onCommit` 的中间集合分配与二次遍历。
  - `RowId` 对齐门控中每次 commit 重复归一化 list path 的成本。
- 在保持功能与诊断语义不变的前提下，减少默认提交路径分配与重复扫描。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/state-trait/rowid.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
- `packages/logix-core/test/internal/StateTrait/RowId.UpdateGate.test.ts`
- `specs/070-core-pure-perf-wins/tasks.md`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - 引入 `lastScheduledTxnSeq` 去重标记，替代“先收集 dirtySelectorIds 再二次遍历”的路径。
  - 多 selector 场景改为单次 dirty root 扫描 + 即时评估，移除提交阶段 `Set/Map` 中间收集路径。
  - 保持以下语义不变：
    - `dirtyAll` / 无 registry 的保守全量评估。
    - readless selector 的保守评估。
    - 单 selector 快路径与 diagnostics 事件行为。
- `packages/logix-core/src/internal/state-trait/rowid.ts`
  - 新增 `listConfigs` 匹配计划缓存（`WeakMap`，按数组引用缓存）。
  - 将 `shouldReconcileListConfigsByDirtySet` 从“每次归一化全部 list path”改为“命中 rootKey bucket 再做 overlaps 判断”。
  - 保留保守策略：list path 归一化失败或 rootId 不可映射时返回 `true`，避免漏同步。
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - 新增回归：同一 selector 同时命中多个 dirty roots 时，每个 txn 最多评估一次。
- `packages/logix-core/test/internal/StateTrait/RowId.UpdateGate.test.ts`
  - 新增回归：多 list 根路径下的 rootKey 过滤命中。
  - 新增回归：重复 list path 配置在多次调用下结果稳定。

## 验证
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅
- `pnpm test -- test/Runtime/ModuleRuntime/SelectorGraph.test.ts`（@logixjs/core）✅
- `pnpm test -- test/internal/StateTrait/RowId.UpdateGate.test.ts`（@logixjs/core）✅

## 性能与诊断证据
- 预期收益：
  - Selector 提交链路减少中间集合分配，降低多 selector 模式下的 commit 固定成本。
  - RowId 门控在 list-heavy 模块中复用匹配计划，减少每次 commit 的 path 归一化与全量路径比较开销。
- 诊断语义：
  - `trace:selector:eval` 发射条件与负载未改变。
  - RowId 门控的保守 fallback 仍保持“宁可多做，不可漏做”。

## 独立审查
- Reviewer：subagent（`agent_id=019c8be4-93c1-7350-b3ad-27e79fb0ea29`）
- 审查关注点：
  - `SelectorGraph` 去重标记设置在评估前，是否会在异常路径下导致漏评估。
  - `RowId` 计划缓存按数组引用缓存，是否具备稳定命中前提。
- 处理结果：
  - `SelectorGraph` 已补注释：`evaluateEntry` 为 `E=never` 的 total effect，评估前标记是为了同事务多 dirty root 去重。
  - `rowid` 已补注释：缓存依赖 `traitState.listConfigs` 的稳定引用（program rebuild 之间复用），属于热路径有效缓存。
- 最终结论：`可合并`（未发现阻断问题）。

## 风险与回滚
- 风险：Selector 去重标记若处理不当，可能导致同事务漏评估或重复评估。
- 风险：RowId 计划缓存若键失配，可能产生错误复用（已用 listConfigs 数组引用作 key，且语义由回归锁定）。
- 回滚：
  - SelectorGraph 回退到 `dirtySelectorIds` 收集路径。
  - RowId 回退到每次调用实时归一化 list path 的实现。

## 机器人评论消化（CodeRabbit）
- 待 PR 创建后补充。
