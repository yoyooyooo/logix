# Contracts: 097 Runtime-Scoped Observability

本目录定义 O-004 的最小契约产物，用于约束 runtime-scoped 观测隔离行为。

## Source of Truth

- 特性规格：`specs/097-runtime-scoped-observability/spec.md`
- 实施计划：`specs/097-runtime-scoped-observability/plan.md`
- 数据模型：`specs/097-runtime-scoped-observability/data-model.md`

## 本特性契约

- `identity-model.md`：稳定身份与派生规则（runtimeLabel / instanceId / txnSeq / opSeq / eventSeq）。

## 约束

- 禁止并行真相源：runtime 观测语义必须可降解到统一事件锚点模型。
- 事务窗口禁止 IO：观测链路不得在事务内引入异步副作用。
- 诊断事件必须 Slim 且可序列化。
