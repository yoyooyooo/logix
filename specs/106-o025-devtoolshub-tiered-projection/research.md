# Research: O-025 DevtoolsHub 投影分层

## Source Traceability

- Backlog: O-025
- Source: `docs/todo-optimization-backlog/items/O-025-devtoolshub-tiered-projection.md`

## Decision 1: light/full 双档分层

- **Decision**: full 维护重资产，light 只保留摘要与 degraded 原因。
- **Rationale**: 兼顾高保真与高性能。
- **Alternatives considered**:
  - 单档模式继续叠加优化：拒绝，难以同时兼顾两类目标。

## Decision 2: 先升级 consumer 再切默认

- **Decision**: 采用 staged 迁移，先处理 degraded 语义消费。
- **Rationale**: 降低默认切换风险。
- **Alternatives considered**:
  - 直接切默认 light：拒绝，消费端崩溃风险高。

## Decision 3: snapshotToken 与可见字段一致性

- **Decision**: 明确 token 与字段可见性合同。
- **Rationale**: 避免“状态已变但字段缺失”的误判。
