# 2026-03-22 · N-3 runtime-shell resolve boundary attribution（design package）

> 后续状态更新（2026-03-22 同日）：`N-3` contract-freeze 已完成，当前结论更新为 `implementation-ready=true`，见 `docs/perf/2026-03-22-n-3-contract-freeze.md`。

## 目标与范围

- workspace：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf`
- branch：`v4-perf`
- 本轮目标：把 `N-3 runtime-shell.resolve-boundary-attribution-contract` 从 identify 包推进到 design package。
- 本轮实际收口：`docs/proposal-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=false`
- 结果分类：`discarded_or_pending`

## 结论

`N-3` 当前仍不能直接开 implementation line。  
本轮先把归因协议、reason 词表、boundary 决策面和 focused validation matrix 补到 design package 级别，后续只有在 gate 冻结后才进入实现。

## 为什么现在不能直接实施

1. 缺少统一的 boundary decision 合同。
- identify 包已经明确 `resolve-shell` 与 `operationRunner` 需要同键聚合。
- 但 `mode / reasonCode / reuseKey / shellRef / boundaryClass` 这组核心字段还没冻结成单一返回结构。

2. 缺少统一 reason taxonomy。
- 当前只有候选词表，没有把 `snapshot_missing / snapshot_scope_mismatch / middleware_env_mismatch / trait_config_mismatch / concurrency_policy_mismatch / diagnostics_level_escalated` 写成稳定协议。
- 如果先实现再补文档，后续很容易在 `resolve-shell` 与 `operationRunner` 之间出现 reason 漂移。

3. 缺少 ledger v1.1 的字段分层规则。
- 还没写清哪些字段进入 `resolveShell.snapshot` sample，哪些字段进入 `operationRunner.txnHotContext`，哪些字段只做派生显示。
- 若直接下代码，Node microbench 原始样本、summary 和后续 diff 很容易变成三套口径。

4. 缺少 focused validation matrix。
- 当前 identify 包只有 success/failed 条件，没有把 schema、reason 覆盖率、唯一 nextcut 输出、probe 噪声归类冻结成串行 gate。
- 直接实施会把 correctness、归因覆盖率和 residual 噪声混在一起。

## 最小设计缺口（必须先补齐）

### D1 · `resolveRuntimeShellBoundary(...)` 合同冻结

内部统一入口至少返回：
- `mode`
- `reasonCode`
- `reuseKey`
- `shellRef`
- `boundaryClass`

约束：
- 同一输入链路必须能一跳映射到 `dispatch-shell / resolve-shell / operationRunner`
- 不引入第二套平行 decision 面

### D2 · reason taxonomy 冻结

先冻结首批 reason 词表：
- `snapshot_missing`
- `snapshot_scope_mismatch`
- `middleware_env_mismatch`
- `trait_config_mismatch`
- `concurrency_policy_mismatch`
- `diagnostics_level_escalated`

约束：
- 统一枚举，不允许自由字符串
- `resolve-shell` 与 `operationRunner` 共享同一词表

### D3 · ledger v1.1 字段分层

至少写清：
- `resolveShell.snapshot` sample 增量字段
- `operationRunner.txnHotContext` sample 增量字段
- `reuseKeyHash / shellSource / boundaryClass` 的归属层

目标：
- raw 样本、summary、后续 diff 同口径
- 字段增量保持 slim，可序列化

### D4 · focused validation matrix

至少冻结四组验证：
1. schema/字段兼容
2. reason 覆盖率
3. 唯一 nextcut 输出
4. `probe_next_blocker` 噪声归类

## 后续 gate（开 implementation line 前必须全部通过）

1. `Gate-A protocol-freeze`
- D1/D2 文档落盘且 cross-reference 完整。
- reviewer 能从文档直接恢复 boundary decision 结构与 reason 词表。

2. `Gate-B ledger-freeze`
- D3 完成，ledger v1.1 的字段归属与兼容策略已固定。
- raw 样本、summary、diff 三层口径一致。

3. `Gate-C validation-freeze`
- D4 落盘，最小验证命令固定。
- 明确怎样判断“reason 覆盖率不足”和“唯一 nextcut 未收敛”。

## 实施线最小验证命令（冻结版）

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts
python3 fabfile.py probe_next_blocker --json
```

口径说明：
- 前两条负责 runtime-shell 合同与样本一致性。
- `probe_next_blocker` 只负责 non-regression 与噪声归类，不负责证明 `N-3` 收益。

## 开线准入条件（implementation-ready 定义）

只有当以下条件同时满足，才可开 `N-3` 实施线：
- `Gate-A/B/C` 全通过
- 明确 `public API change = false` 仍成立
- 明确不与其它 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.*` 结构改造并行
- 最小验证链路与证据命名已预先冻结

## 本轮收口说明

- 本轮不实施代码。
- 本轮不改 public API。
- 本轮不改 `packages/**`。
- 本轮只推进 design package、summary、evidence 与 routing 口径。
