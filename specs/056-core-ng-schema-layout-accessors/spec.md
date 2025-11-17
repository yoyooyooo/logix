# Feature Specification: Schema Layout Accessors（offset/typed view）

**Feature Branch**: `056-core-ng-schema-layout-accessors`  
**Created**: 2025-12-31  
**Status**: Done  
**Input**: 046 registry 条目 `056`（`specs/046-core-ng-roadmap/spec-registry.json`）

## Summary

在 FieldPathIdRegistry（schema/静态 fieldPaths）上补齐 **stringPath → pathId 的直达映射**，并在 txn 内把 dirtyPaths 归一化/去冗余（prefix canonicalize）下沉到 **id 级算法**：减少 `split('.')`/临时数组分配与重复 trie walk，为后续更完整的 layout/accessor（offset/typed view）路线建立可对比的 JS baseline。

## Hard Constraints

- **统一最小 IR**：accessor 表必须可被静态描述（Static IR），且能进入同一套 Trace/Devtools/Perf evidence。
- **默认路径不绑工具链**：运行时 JIT-style 也必须可生成 accessor 表；工具链仅可选加速。
- **事务窗口禁 IO**：生成/初始化必须在构造期完成；txn window 只做纯访问。
- **证据门禁**：Node + ≥1 headless browser before/after/diff，且 `summary.regressions==0`。

## Dependencies

- `045`（对照 harness）
- `049`（Exec VM：accessor 表最自然的消费端）

## Open Questions

- Schema 来源与粒度：以哪些 schema 为输入（Store.Spec？selector spec？domain schema？）避免“全域 layout”失控。
- accessor 表缓存归属：generation vs instance；如何清理避免短生命周期模块泄漏。

## Promotion Criteria（Idea → Draft）

- 选定试点（最小 schema 子集 + 1 条热路径接入）。
- 固化 accessor 表 schema（version/hash）与证据字段（off 近零成本）。
- 补齐 `plan.md`/`tasks.md`/`quickstart.md`，并绑定 perf matrix suites。

## References

- 046 总控：`specs/046-core-ng-roadmap/`
- Exec VM：`specs/049-core-ng-linear-exec-vm/`
- Guardrails：`specs/039-trait-converge-int-exec-evidence/`
