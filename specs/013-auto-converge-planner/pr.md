# PR：010 → 013 的控制面契约输入（已消化 / 仅保留 future）

> 原始目的：把 `specs/010-form-api-perf-boundaries` 对 013 的最小诉求写清楚，避免 010/014 的验收链路在实现阶段“临时补丁化”或口径漂移。

## Status

- **Archived**：已吸收进 013 的 `spec/contracts/tasks/quickstart`，作为单一事实源的一部分。

## 已吸收（权威落点）

> 本 PR 的可落地内容已完全被下列文档收编；本文件不再重复列举明细，避免产生第二份口径。

- 控制面契约与证据字段：`specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json`
- A/B 复现与覆盖策略（Provider/module override）：`specs/013-auto-converge-planner/quickstart.md`
- 范围边界与再评估裁决：`specs/013-auto-converge-planner/spec.md`

## 未吸收 / 未来再评估

### [FUTURE] per-transaction override

**问题**：是否需要提供每笔事务级别的 converge override（例如 submit/root validate 强制 `requestedMode=full`）？

**当前结论**：暂不支持；优先用 Provider/module override 达到 A/B 与基线复现。

**为什么是 FUTURE**：

- 会引入“每笔事务一个开关”的新维度，容易补丁化并扩大长期维护成本（诊断/复现/审计口径变复杂）。
- 若要可解释且可回放，必须把“覆盖来源”纳入可序列化证据（例如扩展 `configScope` 以包含 `transaction` 或等价字段），并同步更新消费侧与迁移说明；这属于协议面破坏性演进，必须等 010/014 的代表性证据证明“非做不可”再引入。

**再评估触发条件**：

- 010/014 的代表性矩阵点证明“仅单次事务强制 full”是必要且 Provider/module override 无法表达。

**若引入的硬约束**：

- evidence 必须可审计且可序列化；需要扩展来源口径（例如 `configScope` 增加 `transaction` 或等价字段），并同步更新消费侧与迁移说明。
