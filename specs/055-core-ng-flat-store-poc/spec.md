# Feature Specification: core-ng Flat Store PoC（arena/SoA/handle 化）

**Feature Branch**: `055-core-ng-flat-store-poc`  
**Created**: 2025-12-31  
**Status**: Frozen  
**Input**: 046 registry 条目 `055`（`specs/046-core-ng-roadmap/spec-registry.json`）

## Summary

探索把核心状态与热路径数据结构从“对象图”迁移到“flat memory（SoA/arena + integer handles）”：目标是显著降低 GC 压力与长尾，提供可证据化的内存/分配收益，同时保持对统一最小 IR 的可降解。

## Hard Constraints

- **先 PoC 后扩面**：必须先选一个明确试点（例如 list/row 或 patch/dirties），在证据闭环后再扩面。
- **integer handles**：跨层传递只允许稳定 id/handle；禁止把对象引用当成隐式契约。
- **可解释/可回放**：flat 结构必须能映射回统一 IR/Trace（否则就是并行真相源）。
- **证据门禁**：Node + ≥1 headless browser before/after/diff，且 `summary.regressions==0`；额外关注 alloc/GC 指标（如可得）。

## Dependencies

- `045`（对照 harness）

## Open Questions

- 试点范围（已预选，仍保持 `frozen`）：先从 `patch/dirties/dirtyRoots` 数据面做 PoC，避免直接触碰状态对象模型与 Reducer 语义。
- 迁移策略（预案）：trial-only 注入 + 可回退；默认路径不受影响，失败必须可解释并可在 strict gate 下升级 FAIL。

## Promotion Criteria（Idea → Draft）

- 明确试点模块与数据模型（含 schema/handle 约束）。
- 固化“回退口径”（无法达标必须能回到旧实现）。
- 补齐 `plan.md`/`tasks.md`/`quickstart.md`，并绑定 perf matrix suites。

## References

- 046 总控：`specs/046-core-ng-roadmap/`
- integer bridge：`specs/050-core-ng-integer-bridge/`
- 事务零分配 guardrails：`specs/051-core-ng-txn-zero-alloc/`
