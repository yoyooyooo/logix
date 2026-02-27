# Research: O-024 Txn Lane 策略前移缓存

## Source Traceability

- Backlog: O-024
- Source: `docs/todo-optimization-backlog/items/O-024-txn-lane-policy-cache.md`

## Decision 1: capture 阶段预计算缓存

- **Decision**: 在 capture context 预计算策略并在热路径复用。
- **Rationale**: 直接减少重复 merge 开销。
- **Alternatives considered**:
  - 保持运行时实时 merge：拒绝，热路径税持续存在。

## Decision 2: override 生效时序收紧

- **Decision**: override 仅在 capture/re-capture 生效。
- **Rationale**: 强化语义确定性，避免运行时隐式漂移。
- **Alternatives considered**:
  - 保留即时覆盖：拒绝，难以诊断且不稳定。

## Decision 3: 诊断与手册同步发布

- **Decision**: 事件合同与操作手册一起更新。
- **Rationale**: breaking 语义需要可解释链路支撑。
- **Alternatives considered**:
  - 仅改代码不改文档：拒绝，不符合可诊断性要求。
