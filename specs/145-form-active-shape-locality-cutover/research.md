# Research: Form Active Shape Locality Cutover

## Decision 1: locality-first continuity

**Decision**: row-local continuity 只依赖稳定 locality。
**Rationale**: 避免 index 漂移污染。
**Alternatives considered**: index-first continuity。

## Decision 2: single locality language

**Decision**: cleanup、remap、ownership receipts 共用同一 locality 语言。
**Rationale**: 避免 side refs。
**Alternatives considered**: 各自单独维护 receipt 坐标。
