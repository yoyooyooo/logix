# Research: Form Canonical Error Carrier Cutover

## Decision 1: single error carrier

**Decision**: `FormErrorLeaf` 是唯一 canonical error carrier。
**Rationale**: 这是 reason/trial/repair 共用同一 truth 的前提。
**Alternatives considered**: 保留 string leaf；保留 raw object leaf。

## Decision 2: `errors.$schema` downgrade

**Decision**: `errors.$schema` 退出 canonical role，只保留 residue 身份。
**Rationale**: 避免第二错误树。
**Alternatives considered**: 保留 schema 错误树作为长期特例。
