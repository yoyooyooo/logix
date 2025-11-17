# Feature Specification: core-ng Wasm Planner（可选极致路线）

**Feature Branch**: `054-core-ng-wasm-planner`  
**Created**: 2025-12-31  
**Status**: Frozen  
**Input**: 046 registry 条目 `054`（`specs/046-core-ng-roadmap/spec-registry.json`）

## Summary

探索把 Planner/Reachability 的关键算法迁移到 Wasm（或 Wasm-like）以进一步压低 JS 侧 Map/Set/对象分配成本：以 **resident data + integer bridge + buffer reuse** 为不变量，保证 bridge tax 可控且可证据化。

## Hard Constraints

- **证据驱动再启动**：只有在 JS TypedArray 极致化（见 059）仍不足、且证据显示 GC/Map/Set 主导时才启动。
- **禁止字符串跨边界**：Wasm 边界只允许整型句柄与 TypedArray/ArrayBuffer 视图。
- **buffer 复用**：不得在热路径频繁分配/拷贝；需明确 arena/池化策略。
- **事务窗口禁 IO**：加载/初始化必须在装配期完成；txn window 只做纯计算。
- **证据门禁**：Node + ≥1 headless browser before/after/diff，且 `summary.regressions==0`，并明确 bridge tax 指标。

## Dependencies

- `045`（对照 harness）
- 建议前置：`059`（Planner typed reachability 的 JS 形态先做到极致，作为 baseline）

## Open Questions

- Wasm 入口：只做 reachability？还是扩到 plan 编译？边界与数据结构如何切割才不引入巨大 glue tax？
- Browser/Sandbox 分发：产物打包与缓存策略如何对齐（尤其在 Vite/Next/Sandbox host）。

## Promotion Criteria（Idea → Draft）

- 给出明确的“触发条件”与“失败回退”口径（不满足证据则停止/回滚）。
- 固化跨边界数据结构与最小 IR 映射（避免第二套真相源）。
- 补齐 `plan.md`/`tasks.md`/`quickstart.md`，并绑定 perf matrix suites（必须含 Browser）。

## References

- 046 总控：`specs/046-core-ng-roadmap/`
- 规划/Reachability baseline：`specs/013-auto-converge-planner/`
- Guardrails：`specs/039-trait-converge-int-exec-evidence/`
