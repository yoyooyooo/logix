# Quickstart: 089 Optimistic Protocol

本 quickstart 用于实现后的验收与回归；实现任务见 `specs/089-optimistic-protocol/tasks.md`。

## 1) 基本验收（最小示例）

- 示例路径：`examples/logix/src/scenarios/optimistic/*`（按 tasks 落地路径为准）
- 覆盖路径：
  - optimistic + confirm（成功）
  - optimistic + rollback（失败）
  - optimistic + cancel（覆盖/路由切换）

## 2) 诊断链路验收

- 断言：
  - apply/confirm/rollback 均有 optimisticId 且可与 action run 关联
  - rollback 有原因分类（failure/cancel/override）且 payload 可序列化

## 3) 性能证据（必须）

- 按 `specs/089-optimistic-protocol/plan.md#Perf Evidence Plan` 产出 Node + Browser before/after/diff，落盘到 `specs/089-optimistic-protocol/perf/*`
