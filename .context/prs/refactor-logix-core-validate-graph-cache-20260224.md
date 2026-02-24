# PR Draft: refactor/logix-core-validate-graph-cache-20260224

## 目标
- 收敛 `StateTrait scoped validate` 热路径中的依赖图重复构建成本。
- 在不改变 `reverseClosure` 语义的前提下，将 `DependencyGraph` 归一化结果按 program 级缓存复用。

## 模块阅读范围
- `packages/logix-core/src/internal/state-trait/graph.ts`
- `packages/logix-core/src/internal/state-trait/validate.impl.ts`
- `packages/logix-core/test/internal/StateTrait/StateTrait.ScopedValidate.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/state-trait/graph.ts`
  - 新增 `dependencyGraphCache: WeakMap<StateTraitProgram, DependencyGraphCacheEntry>`。
  - `buildDependencyGraph(program)` 先按 `program + graph.edges 引用` 命中缓存；命中直接返回，未命中再构建并回填缓存。
  - 缓存失效策略：当 `program.graph.edges` 引用变化时自动重建，避免跨代错误复用。
- `packages/logix-core/test/internal/StateTrait/StateTrait.ScopedValidate.test.ts`
  - 新增回归：`reuses cached dependency graph when program edges reference is stable`。
  - 覆盖“同 edges 引用复用同一图对象 / edges 引用变化触发重建”两条关键路径。

## 验证
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 性能与诊断证据
- 该优化位于 `validate` 主链路（每次 scoped validate 都会触达 `buildDependencyGraph`），属于“重复结构归一化”消除。
- 运行时行为保持不变：仅复用 `reverseAdj` 构建结果，不改变图内容与遍历顺序。
- 诊断协议无新增字段/无事件语义变化。

## 独立审查
- Reviewer：subagent（`agent_id=019c8e69-3200-73c1-84bc-9c5d83c28aa7`）
- Blocking findings：无
- Non-blocking suggestions：`reverseAdj` 的内部数组是可变结构，后续可考虑冻结/拷贝防止外部误改。
- Verdict：可合并

## 风险与回滚
- 风险：若未来引入“就地修改 `program.graph.edges` 且保持同引用”的非标准路径，缓存可能保留旧结果。
- 回滚：移除 `dependencyGraphCache` 与命中逻辑，恢复每次构建。

## 机器人评论消化（CodeRabbit）
- 已获取 PR #58 评论流：CodeRabbit 当前为 in-progress，尚未产出可执行建议。
- 已记录 perf-quick 机器人摘要：comparable=true，regressions=0，head budgetExceeded=0。
- 处理策略：等待 CodeRabbit 完成后再做最终消化与回写（如有建议将补充“采纳/暂不采纳+理由”）。
