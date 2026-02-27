# Research: O-023 Flow run(config)

## Source Traceability

- Backlog: O-023
- Source: `docs/todo-optimization-backlog/items/O-023-flow-run-config-unification.md`

## Decision 1: 单入口 + 配置语义

- **Decision**: 所有 run* 族语义统一映射到 `run(config)`。
- **Rationale**: 降低 API 面复杂度并减少重复分支。
- **Alternatives considered**:
  - 保留 run* 并仅增加别名：拒绝，长期仍会漂移。

## Decision 2: 统一策略执行器

- **Decision**: latest/exhaust/parallel/task 行为由单一策略执行器承载。
- **Rationale**: 便于构建语义矩阵测试与诊断映射。
- **Alternatives considered**:
  - 各模式独立实现：拒绝，重复维护成本高。

## Decision 3: 迁移分阶段完成

- **Decision**: 新入口 -> alias/codemod -> 全量迁移 -> 删除旧符号。
- **Rationale**: 平衡风险与收敛速度。
- **Alternatives considered**:
  - 一次性删除旧入口：拒绝，回归风险过大。
