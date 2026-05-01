# Research: Form Settlement Submit Cutover

## Decision 1: single submitAttempt

**Decision**: submit gate 只围绕单一 `submitAttempt`。
**Rationale**: 消掉隐式边界。
**Alternatives considered**: 多条 submit state 观察线。

## Decision 2: decoded payload as output only

**Decision**: decoded payload 只进入 submit output。
**Rationale**: 不长第二持久状态树。
**Alternatives considered**: decoded payload state slice。
