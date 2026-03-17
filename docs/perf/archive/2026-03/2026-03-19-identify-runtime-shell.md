# 2026-03-19 · runtime shell / txn / dispatch / hot snapshot 下一刀识别

## 范围与口径

- 本次只做 read-only 识别。
- 证据主轴：
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
  - `docs/perf/archive/2026-03/2026-03-11-dispatch-shell-fixed-tax-probe.md`
  - `docs/perf/archive/2026-03/2026-03-16-p0-1-txn-direct-worktree-revalidation.md`
  - `docs/perf/archive/2026-03/2026-03-16-p0-2-transaction-hot-snapshot.md`
  - `docs/perf/archive/2026-03/2026-03-17-p0-2-transaction-operation-hot-context.md`
  - `docs/perf/archive/2026-03/2026-03-18-s1-threshold-modeling.md`
  - `docs/perf/archive/2026-03/2026-03-18-form-threshold-modeling.md`
  - `docs/perf/archive/2026-03/2026-03-18-s1-externalstore-regression-localize.md`

补充口径：
- `2026-03-18` 的两条 threshold modeling 已把 current-head 默认 blocker 收敛到 `clear`，因此本页结论属于 future cut 排序，不是当前 blocker 修复。

## Top2 候选（runtime shell 视角）

### Top1：`P0-1+` dispatch/txn 边界壳继续收敛（优先打 outer await / interpreter 壳）

切面定义：
- 继续沿 `P0-1 txn fastpath` 的同一主轴推进。
- 目标从“idle 直达”扩到“dispatch -> enqueueTransaction 返回前后的外层壳税”，聚焦 `dispatch shell residual`。

证据依据：
- `2026-03-11 dispatch-shell fixed-tax probe` 已把主税定位到事务体外层壳，排除了 `queue/commit/dispatchRecord/dispatchCommitHub/queueResolvePolicy` 主因。
- Node 微基线显示 `residual.avg` 仍占大头，且“ensuring 改写”试探有明确负优化，说明剩余税点在 Effect 组合壳路径，不能用简单重排 closeout 消除。
- `P0-1` 已有稳定正收益与独立 worktree 复核，说明这条主轴具备可持续迭代价值。

正面收益：
- 命中最宽入口面：`dispatch`、部分 watcher 写回、transaction 入口共用壳。
- 有机会把 `dispatch shell` 当前 residual 再下压一档，收益可横向扩散到多 suite。

反面风险：
- 容易触碰 lane 公平性、背压、override 语义。
- 若把 closeout/finalizer 顺序改坏，会出现 p95 尾部反向，`2026-03-11` 已有失败先例。

API 变动判断：
- 预期不需要公开 API 变动。
- 只在 runtime internal 组合层推进。

最小验证命令：
```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
```

### Top2：`P0-2+` hot context/snapshot 继续下沉到 dispatch 外层组合壳

切面定义：
- 延续 `P0-2` 已验证路径，把 transaction/deferred/operation 的 hot snapshot 能力再下沉一层，减少 dispatch 外层重复服务解析与上下文拼装。
- 重点继续压缩 `RunSession/middleware/runtimeLabel/overrides` 的读取与透传次数。

证据依据：
- `P0-2` 从 deferred worker 到 transaction，再到 transaction/operation shared hot context，连续多刀 `accepted_with_evidence`。
- 同路径 micro-bench 在中高 batch 存在持续正收益，表明“快照下沉”仍有真实空间。
- `dispatch-shell` 证据表明 inner queue/commit 主因占比低，继续在 hot context 与 outer compose 层做减法更贴边。

正面收益：
- 延续已成立机制，失败风险低于全新方向。
- 对 `off/light/full` 与多入口更容易形成同构收益。

反面风险：
- 动态 override 与 trace/diagnostics 的语义边界可能被压扁。
- 若快照生命周期过宽，可能引入过期配置读取问题。

API 变动判断：
- 预期不需要公开 API 变动。
- 可能新增/调整 internal snapshot 结构。

最小验证命令：
```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts --testTimeout=20000
```

## 唯一建议下一线

建议开线：`P0-1+ dispatch/txn outer-shell residual cut`。

优先级高于同角度其它线的理由：

1. 证据指向最集中。`dispatch-shell` 定位链已把多条可疑点排除，剩余主税集中在 outer shell residual，信号更硬。
2. 收益面最宽。该层切面横跨 dispatch/txn 多入口，潜在复用面大于继续做更窄的 operation 局部快照。
3. 失败成本可控。历史已有明确失败样式，能直接作为 guardrail，减少盲试次数。
4. 与当前状态一致。current-head 已 `clear`，适合开“一条结构性 residual 线”做 future cut 识别式实施，不需要先做 gate 修补。

## 是否建议后续开实施线

- 建议：`是`。
- 建议开 `1` 条，先做 `P0-1+`，`P0-2+` 保留为顺位二号候选。
