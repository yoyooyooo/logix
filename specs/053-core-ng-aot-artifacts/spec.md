# Feature Specification: core-ng AOT Artifacts（Static IR / Exec IR 工件化）

**Feature Branch**: `053-core-ng-aot-artifacts`  
**Created**: 2025-12-31  
**Status**: Frozen  
**Input**: 046 registry 条目 `053`（`specs/046-core-ng-roadmap/spec-registry.json`）

## Summary

在不改变运行时契约的前提下，引入“构建期产物（AOT artifacts）”作为 **可选加速器**：把运行时可预编译的 Static IR / Exec IR 固化为可序列化工件，供 runtime 快速加载；同时保持 JIT 路径为默认、AOT 路径可回退且可证据化。

## Hard Constraints

- **AOT-ready, not AOT-required**：默认路径不得依赖工具链；AOT 只能作为可选加速器。
- **统一最小 IR**：AOT 工件必须与 runtime 侧的统一 IR 等价（同语义/同 schema），且能进入同一套 Devtools/Trace/Perf evidence 链路。
- **稳定标识**：工件必须可对比（`version/hash`），同输入→同 hash；禁止随机化。
- **事务窗口禁止 IO**：任何工件加载/解析不得出现在 txn window；必须在构造期/装配期完成。
- **证据门禁**：Node + ≥1 headless browser before/after/diff，且 `summary.regressions==0`。

## Dependencies

- `045`（dual kernel contract / 对照 harness）
- `049`（Exec VM/JIT-style 预编译基座：先把“运行时可预编译”做成，再谈 build-time 产物）
- `050`（integer bridge / 稳定 id：支撑工件可对比与去随机化）

## Open Questions

- 工件粒度：按 Module？按 Pattern？按 Schema bundle？如何避免“工件碎片化”导致缓存/加载税？
- 工件加载策略：按需加载 vs 预加载；如何在 Browser/Sandbox 场景下对齐资源路径与缓存。
- Debug/Devtools：工件与运行时 Trace 的对齐锚点（hash/版本号）如何暴露到证据字段。

## Promotion Criteria（Idea → Draft）

- 明确工件 schema（至少：`artifactVersion/artifactHash` + minimal summary）。
- 明确 fallback/回退口径（AOT 不可用时如何降级到 JIT，且必须可解释/可证据化）。
- 补齐 `plan.md`/`tasks.md`/`quickstart.md`，并绑定 `$logix-perf-evidence` 的 suite 与对照轴（Node+Browser）。

## References

- 046 总控：`specs/046-core-ng-roadmap/`
- Guardrails：`specs/039-trait-converge-int-exec-evidence/`
- Exec VM：`specs/049-core-ng-linear-exec-vm/`
