# Research: O-026 Trace digest-first

## Source Traceability

- Backlog: O-026
- Source: `docs/todo-optimization-backlog/items/O-026-trace-digest-first-payload.md`

## Decision 1: 默认 digest-first

- **Decision**: 事件默认只携带 digest 与锚点。
- **Rationale**: 控制载荷体积与传输成本。
- **Alternatives considered**:
  - 保留全量载荷并局部优化：拒绝，成本上限难降。

## Decision 2: 详细结构按需回查

- **Decision**: 通过静态 IR lookup 获取详情。
- **Rationale**: 把重结构从热路径事件中移出。
- **Alternatives considered**:
  - 事件中保留可选大字段：拒绝，仍会被误用为默认路径。

## Decision 3: 三端 staged 迁移

- **Decision**: consumer 先适配，再切 runtime 默认。
- **Rationale**: 降低协议断裂风险。
- **Alternatives considered**:
  - runtime 先切：拒绝，消费端回归风险高。
