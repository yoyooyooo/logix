# Contracts: 060 Txn Lanes（事务后续工作优先级调度 / 可解释调度）

本目录存放本特性的“契约层”产物（用于实现阶段对齐与验收），并遵守 **不引入并行真相源** 原则。

## Source of Truth（不复制、不分叉）

- 统一观测协议与证据包：`specs/005-unify-observability-protocol/contracts/`
- 可序列化诊断与稳定身份：`specs/016-serializable-diagnostics-and-identity/contracts/`
- 043 Trait converge time-slicing：`specs/043-trait-converge-time-slicing/spec.md`
- 044 采样诊断口径：`specs/044-trait-converge-diagnostics-sampling/spec.md`
- Read Lanes（读状态车道）meta 产出：`specs/057-core-ng-static-deps-without-proxy/`（060 负责统一 Lanes 证据投影与 Devtools 汇总视图）

## 本特性新增/固化的契约点

- **TxnLanePolicy（Resolved）**：Txn Lanes 的生效策略（含 configScope），用于解释“当前实例采用的调度策略是什么”。
- **TxnLaneEvidence（Slim）**：用于解释“为什么延后/为什么让路/是否合并取消/是否触发饥饿保护”的最小可序列化摘要。

schemas：

- `schemas/txn-lane-policy.schema.json`
- `schemas/txn-lane-evidence.schema.json`
