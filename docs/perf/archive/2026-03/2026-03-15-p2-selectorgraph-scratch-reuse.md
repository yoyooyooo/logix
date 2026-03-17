# 2026-03-15 · P2 selector invalidation scratch reuse

## 目标

在不碰 `RuntimeExternalStore` 的前提下，先对 `SelectorGraph` 做第一刀：

1. 把按 root 的 selector candidate 索引前移到注册期稳定化
2. 把 commit 时的 dirty-root 聚合改成可复用 scratch

这刀只处理 `SelectorGraph.onCommit(...)` 的重复分配税，不碰更大的 readQuery / process API 面。

## 改动

文件：

- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

实现点：

1. 取消 commit 内部临时 `indexedCandidatesByRoot` 重建
- 旧路径每次 commit 都会按 root 从 `Set<string>` 重新拼 `IndexedRootCandidate[]`
- 现在改成在 `ensureEntry(...)` 时就把 candidate 挂到稳定的 `candidateIndexByReadRoot`
- `releaseEntry(...)` 时同步清理 candidate bucket

2. 取消 commit 内部临时 `dirtyRootsToProcessByRoot` 分配
- 旧路径每次 commit 都会新建 root 级 `Map<rootKey, FieldPath[]>`
- 现在改成 `dirtyRootScratchBuckets + generation` 复用
- 每个 root bucket 只在首次出现时创建，后续 commit 复用数组并清空

3. 补一条回归测试
- 覆盖“最后一个订阅者 release 后，root candidate 状态会被清掉，并且后续 re-register 仍能正常调度”

## 预期收益

这刀的理论收益点很明确：

1. commit 热路径减少两类稳定分配
- `Map<rootKey, IndexedRootCandidate[]>`
- `Map<rootKey, FieldPath[]>`

2. 多 selector、多 root、连续 commit 场景下，减少每次 commit 的索引重建

3. `process.trigger.moduleStateChange` 这类依赖 `changesReadQueryWithMeta` 的链路会间接受益
- 它们最终仍走到 `SelectorGraph.onCommit(...)`

## 验证

通过：

- `pnpm --dir packages/logix-core test -- test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
- `pnpm --dir packages/logix-core test -- test/internal/Runtime/Process/TriggerStreams.RuntimeSchemaCache.test.ts`
- `pnpm --dir packages/logix-core test -- test/Process/Process.Trigger.ModuleStateChange.test.ts`
- `pnpm --dir packages/logix-core test -- test/Runtime/ModuleRuntime/SelectorGraph.InvalidationScratchReuse.Perf.off.test.ts`

贴边 perf 证据：

- 场景：`selectorGraph.invalidationScratchReuse.off`
- 数据集：`selectors=1024 roots=32 dirtyRootsPerTxn=8 txns=256 seed=20260315`
- 运行参数：`iters=40 warmup=5`
- 结果：
  - `legacy.p50=7.192ms`
  - `legacy.p95=7.592ms`
  - `optimized.p50=3.193ms`
  - `optimized.p95=3.377ms`
  - `p95.ratio=0.445`
- 行为一致性：
  - `scheduledLegacy=62543`
  - `scheduledOptimized=62543`

解释：

- 这条 micro-bench 直接对比了本刀命中的调度子路径：
  - 旧路径：commit 内临时重建 root candidate 索引 + 临时 dirty-root bucket
  - 新路径：注册期稳定索引 + commit 期 scratch reuse
- 它能直接证明目标路径存在明确正向收益

旁证：

- `pnpm --dir packages/logix-core test -- test/Process/Process.Trigger.ModuleStateChange.DedupePerfEvidence.off.test.ts`
- 结果 `p95.ratio=1.003`
- 这条 perf test benchmark 的是 trigger dedupe 状态机，不是 `SelectorGraph.onCommit(...)` 的分配路径
- 结论只能说明“没有在近邻 process 链上引入明显退化”，不能代替上面的贴边 perf 证据

未通过：

- `pnpm --dir packages/logix-core typecheck:test`

失败原因：

- 当前 worktree 在 workspace 范围内存在大量与本刀无关的类型错误与依赖解析问题
- 报错集中在 `examples/logix-react`、`packages/domain`、`packages/logix-form`、若干 Node 类型缺失
- 当前没有指向本次修改文件的新增类型错误

## 结论

这是一个方向正确、实现局部且行为已锁住的小刀。

当前证据强度：

1. 功能与回归层面通过
2. 结构性分配税已明显减少
3. 已补一条贴边 micro-bench，目标路径存在明确正向收益

因此当前裁决是：

- 保留代码
- 建议进入合流评审
- 若主会话仍要求更高等级证据，再补 browser/node 侧真实 `changesReadQueryWithMeta` perf 边界即可
