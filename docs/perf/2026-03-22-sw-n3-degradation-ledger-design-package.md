# 2026-03-22 · SW-N3 degradation ledger + reducer patch sink（design package）

> 后续状态更新（2026-03-22 同日）：`SW-N3` 已补齐 contract freeze，当前结论更新为 `implementation-ready=true`，见 `docs/perf/2026-03-22-sw-n3-contract-freeze.md`。

## 目标与范围

- workspace：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf`
- branch：`v4-perf`
- 本轮目标：把 `SW-N3 Degradation-Ledger + ReducerPatchSink contract` 从 identify 包推进到可执行的 design package。
- 本轮实际收口：`docs/proposal-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=false`
- 结果分类：`discarded_or_pending`

## 结论

`SW-N3` 的 design package 已完成，且后续已补齐 contract freeze。  
本文件保留 design-package 视角，最新开线口径以 `docs/perf/2026-03-22-sw-n3-contract-freeze.md` 为准。

## 为什么现在不能直接实施

1. 缺少统一的 `StateWriteIntent` slim 合同。
- 当前 identify 包已给出方向，但跨 `dispatch / boundApi.update / trait.externalStore / moduleAsSource` 的字段集还没冻结。
- 若直接实现，后续很容易在 ingress 之间出现字段漂移，导致 degrade ratio 口径不可比。

2. 缺少 `ReducerPatchSink` 的决策矩阵。
- “有 patch 证据”“只有 top-level 已知”“只能降级到 customMutation” 三类路径还没写成单表。
- 若没有矩阵，`dirtyAll/customMutation` 的 reason code 会继续散在不同入口，无法形成统一账本。

3. 缺少 `state:update` / devtools / perf 指标的同词表对齐。
- 目前还没有冻结“哪个字段进入 slim event、哪个字段进入 projection、哪个字段进入 perf gate”的统一口径。
- 若先实现再补文档，会把 state-write 诊断与 perf 预算重新分裂成多套真相源。

4. 缺少 focused validation matrix。
- 当前只有 identify 包，没有把 contract schema、ingress correctness、projection correctness、probe comparability 写成串行 gate。
- 直接实施会让 correctness gate、预算门和 residual 噪声混在一起，难以裁决 accepted。

## 最小设计缺口（必须先补齐）

### D1 · `StateWriteIntent` 合同冻结

统一内部合同最少包含：
- `source`: `reducer | boundApi.update | trait.externalStore | moduleAsSource`
- `anchor`: `instanceId/txnSeq/opSeq`
- `coverage`: `precisePatch | topLevelKnown | customMutation`
- `degradeReason`: 复用稳定枚举，禁止自由字符串
- `pathIdsTopK`: 可选，保持 slim 与可序列化

约束：
- 不新增随机标识。
- 不把大对象快照塞进合同。
- `customMutation` 必须带 reason code。

### D2 · `ReducerPatchSink` 决策矩阵

必须先冻结以下三类决策：
- reducer 能提供 patch 证据时：落 `precisePatch`
- 只能确认 top-level 变化时：落 `topLevelKnown`
- 无 patch 证据时：显式落 `customMutation + degradeReason`

额外约束：
- 不允许“静默 dirtyAll”。
- 任何 `customMutation` 都必须可回溯到 `source + anchor + reason`。

### D3 · 诊断与预算门对齐

需要把以下三层对齐到同一词表：
- `state:update` slim 事件
- `packages/logix-devtools-react` 的 projection / timeline 读取面
- perf 指标：
  - `stateWrite.degradeRatio`
  - `stateWrite.degradeUnknownShare`

要求：
- 字段命名统一
- 原因枚举统一
- event/projection/perf 三层可一跳映射

### D4 · focused validation matrix

至少冻结四组验证：
1. contract schema
2. ingress correctness
3. devtools projection correctness
4. `probe_next_blocker` comparability 记录

## 后续 gate（开 implementation line 前必须全部通过）

1. `Gate-A contract-freeze`
- D1/D2 文档落盘且交叉引用完成。
- reviewer 能从文档直接恢复 ingress 决策矩阵。

2. `Gate-B projection-budget-freeze`
- D3 完成，`state:update` / devtools / perf 指标三层口径一致。
- `stateWrite.degradeRatio` 与 `stateWrite.degradeUnknownShare` 的分桶和含义已固定。

3. `Gate-C validation-freeze`
- D4 落盘，最小验证命令固定。
- 失败分类已定义，能区分 correctness、projection、comparability。

## 实施线最小验证命令（冻结版）

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/Contracts.019.TxnPerfControls.test.ts \
  test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts
pnpm -C packages/logix-devtools-react exec vitest run \
  test/internal/devtools-react.integration.test.tsx \
  test/internal/ConvergeTimelinePane.test.tsx
python3 fabfile.py probe_next_blocker --json
```

口径说明：
- 前三条负责 contract / ingress / projection。
- `probe_next_blocker` 只负责 non-regression 与噪声归类，不负责证明 `SW-N3` 收益。

## 开线准入条件（implementation-ready 定义）

只有当以下条件同时满足，才可开 `SW-N3` 实施线：
- `Gate-A/B/C` 全通过
- 明确 `public API change = false` 仍成立
- 明确与 `SW-N2` 保持串行
- 最小验证链路与证据命名已预先冻结

## 本轮收口说明

- 本轮不实施代码。
- 本轮不改 public API。
- 本轮不改 `packages/**`。
- 本轮只推进 design package、summary、evidence 与 routing 口径。
