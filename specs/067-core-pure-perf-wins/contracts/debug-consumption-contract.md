# Contract: Debug sinks “会被消费”判定（067）

## 目标

在不引入并行真相源、且不破坏自定义 sinks 语义的前提下，为默认档提供“不会被消费就不付费”的门控基础。

## 基本规则

1. **保守正确**：只在“可证明不会被消费”的情况下跳过记录；未知 sink 一律按“可能消费”处理。
2. **不改变兜底语义**：
   - `lifecycle:error` 必须可见（至少 Node 下不会静默丢失）。
   - `diagnostic` 的 warn/error 在 prod/errorOnly 下必须可见；`diagnostic(info)` 仍可被丢弃（避免噪音）。
3. **默认档 off 近零成本**：在 `diagnosticsLevel=off` 且 sinks 为 errorOnly-only 时不得生成纯观测 payload（decision/dirtySummary/topK/hotspots 等）；若 sinks 非 errorOnly-only（存在明确 consumer），允许生成 `state:update.traitSummary` 所需的 slim decision，但必须避免 heavy/exportable 细节（hotspots、静态 IR 导出等）。

## errorOnly-only 判定

当 sinks 集合满足以下条件时，可判定为 errorOnly-only：

- sinks 只包含 `errorOnlySink`（无其它 sinks）。

在该条件下：

- `state:update` / `trace:*` / `action:*` 等高频事件允许直接 early-return。
- `lifecycle:error` 与 `diagnostic(warn/error)` 必须保持现有行为。

## 未来扩展（非本次交付）

若未来需要支持更精细的 “消费判定”（例如 trace-only sink、metrics-only sink），应通过“显式可序列化的 sink capability 描述”扩展，而不是依赖运行时猜测或 magic 字段。
