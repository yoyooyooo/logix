# Research: O-022 Action API 收敛

## Source Traceability

- Backlog: O-022
- Source: `docs/todo-optimization-backlog/items/O-022-action-api-action-intent.md`

## Decision 1: 对外分层冻结

- **Decision**: 对外 API 分层冻结为 `$.dispatchers` 主入口、`$.action(token)` 动态入口、`$.dispatch` 兼容低阶。
- **Rationale**: 保留 DX 与类型安全，同时完成内核收敛。
- **Alternatives considered**:
  - 统一改成字符串入口：拒绝，会牺牲主入口 DX。
  - 继续多入口平权：拒绝，重复实现与诊断分叉不可控。

## Decision 2: 统一内核到 ActionIntent

- **Decision**: token/type/payload 归一流程集中在 ActionIntent。
- **Rationale**: 降低重复路径，提升可诊断性。
- **Alternatives considered**:
  - 只做 facade 层封装不改内核：拒绝，性能与诊断收益不足。

## Decision 3: 字符串入口 forward-only 管理

- **Decision**: `$.dispatch(type,payload)` 保留兼容定位，但不再默认推荐。
- **Rationale**: 兼顾现存调用与长期收敛。
- **Alternatives considered**:
  - 立即删除字符串入口：拒绝，迁移风险过高。
