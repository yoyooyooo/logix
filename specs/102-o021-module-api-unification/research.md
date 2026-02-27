# Research: O-021 Module 实例化 API 统一

## Source Traceability

- Backlog: O-021
- Source: `docs/todo-optimization-backlog/items/O-021-module-instantiation-api-unification.md`

## Decision 1: 公开入口统一为单一路径

- **Decision**: 对外仅保留一个统一实例化入口（具体命名在实现中冻结）。
- **Rationale**: 降低心智负担，减少重复 API 组合导致的错误路径。
- **Alternatives considered**:
  - 继续保留三入口并加强文档：拒绝，无法消除长期分叉成本。
  - 仅内部收敛不改公开 API：拒绝，用户侧歧义仍在。

## Decision 2: 保持装配契约稳定优先于短期语法便利

- **Decision**: Runtime/AppRuntime 契约不漂移，收敛通过内部共核完成。
- **Rationale**: 核心路径稳定性优先，避免连锁破坏。
- **Alternatives considered**:
  - 直接重写装配协议：拒绝，风险过高且不满足渐进迁移需求。

## Decision 3: 迁移按消费端分层推进

- **Decision**: 先 core API，再 examples/react/sandbox，最后文档与 lint 门禁。
- **Rationale**: 降低一次性变更半径，便于定位问题。
- **Alternatives considered**:
  - 一次性全量替换：拒绝，回归与定位成本不可控。
