# Feature Specification: Planner Typed Reachability（TypedArray 极致化）

**Feature Branch**: `059-core-ng-planner-typed-reachability`  
**Created**: 2025-12-31  
**Status**: Done  
**Input**: 046 registry 条目 `059`（`specs/046-core-ng-roadmap/spec-registry.json`）

## Summary

把 Planner/Reachability 的核心数据结构与算法改造为 TypedArray/bitset/queue 等“纯内存形态”（adjacency list、work queue、visited bitset），以降低 Map/Set 与对象分配税，并为后续 Wasm/Flat memory 路线提供可对照的 JS baseline。

## Hard Constraints

- **先 JS 极致化**：作为 Wasm 路线（054）的前置 baseline；若 JS 就能达标则不启动 Wasm。
- **可复现**：任何随机/样本必须固定 seed；稳定 hash/版本号要进入 evidence 字段。
- **证据门禁**：Node + ≥1 headless browser before/after/diff，且 `summary.regressions==0`。
- **事务窗口禁 IO**：planner 构建/预编译与 txn window 关系必须写清（避免每窗口重建）。

## Dependencies

- `045`（对照 harness）

## Open Questions

- 与 013/039 的重叠：哪些 planner 部分已覆盖、哪些是新的 typed 形态；如何避免重复投入。
- Browser 基线选择：用 converge/txnCommit 跑道，还是另立 planner microbench（以证据为准）。

## Promotion Criteria（Idea → Draft）

- 明确试点模块与指标（reachability/plan compile/dirty closure 等）。
- 固化数据结构约束与 evidence 字段（off 近零成本）。
- 补齐 `plan.md`/`tasks.md`/`quickstart.md`，并绑定 perf matrix suites。

## References

- 046 总控：`specs/046-core-ng-roadmap/`
- Planner baseline：`specs/013-auto-converge-planner/`
- Guardrails：`specs/039-trait-converge-int-exec-evidence/`
