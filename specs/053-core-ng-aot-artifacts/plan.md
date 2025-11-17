# Implementation Plan: 053 core-ng AOT Artifacts（Static IR / Exec IR 工件化）

**Branch**: `053-core-ng-aot-artifacts` | **Date**: 2025-12-31 | **Spec**: `specs/053-core-ng-aot-artifacts/spec.md`  
**Input**: Feature specification from `specs/053-core-ng-aot-artifacts/spec.md`

## Summary

目标：在不改变运行时契约的前提下，引入“构建期产物（AOT artifacts）”作为 **可选加速器**：把运行时可预编译的 Static IR / Exec IR 固化为可序列化工件，供 runtime 快速加载；同时保持 JIT 路径为默认、AOT 路径可回退且可证据化。

本 spec 的关键不是“做插件”，而是把 **工件 schema / hash / fallback / 证据字段** 先固化，保证未来即使替换工具链也不会产生并行真相源与不可解释回退。

Update: Trigger Check（Phase 2）已核对，当前未触发（保持 `frozen`）。

## Deepening Notes

- Decision: **证据驱动再启动**：只有在证据显示解释层/预编译成本主导且 runtime 手段难以再降时，才允许进入实现阶段；否则保持为 Draft（research-only）。
- Decision: **AOT-ready, not AOT-required**：默认路径不得依赖工具链；AOT 只能作为可选加速器。
- Decision: **统一最小 IR**：AOT 工件必须与 runtime 侧统一 IR 等价（同语义/同 schema），且进入同一套 Trace/Devtools/Perf evidence 链路。
- Decision: **稳定标识**：同输入→同 hash；禁止随机化；工件必须携带 `artifactVersion/artifactHash` 与 minimal summary。
- Decision: **事务窗口禁 IO**：任何工件加载/解析不得出现在 txn window；必须在装配期完成。

## Technical Context

- **已有地基（runtime-only）**：
  - Static IR：`packages/logix-core/src/Reflection.ts`（export/manifest）+ `packages/logix-core/src/internal/state-trait/converge-ir.ts`
  - Exec IR（JIT-style）：`packages/logix-core/src/internal/state-trait/converge-exec-ir.ts`（TypedArray tables）
  - Exec VM（消费端）：`specs/049-core-ng-linear-exec-vm/`（core-ng 装配期注入）
  - integer bridge / 稳定 id：`specs/050-core-ng-integer-bridge/`（去随机化与可对比基础）
- **建议的工件边界（最小闭环）**：
  - 工件内容：Static IR digest +（可选）Exec IR tables（或其可再生摘要）
  - 工件载入：装配期读取/反序列化 → 校验 `artifactHash` → 注入 runtime（Layer/Tag）
  - 回退口径：缺失/版本不匹配/校验失败 → 退回 JIT，并输出稳定 `reasonCode`（strict gate 下可升级为 FAIL）

## Constitution Check

- **Intent/Flow/Logix**：不改变上层 DSL/语义；只增加可选加速器。
- **IR & anchors**：工件必须是统一最小 IR 的另一种生产方式，不得引入并行协议。
- **Deterministic identity**：hash/version 必须稳定可对比；同输入→同 hash。
- **Transaction boundary**：txn 内禁 IO；加载/解析在装配期完成。
- **Dual kernels**：core=`supported`（不要求支持工件加载）；core-ng=`supported`（作为主要目标）。
- **Performance & diagnosability**：必须 Node+Browser 证据门禁；fallback 必须可解释且可证据化。

## Perf Evidence Plan（MUST）

> 只有在“触发条件满足”后才执行本节；否则仅作为预案保留。

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（至少覆盖 `priority=P1`）
- 必须覆盖两条轴：
  1) before/after（git 维度）：引入工件加载与注入前 vs 后
  2) fallback（运行时维度）：AOT 可用 vs AOT 不可用（缺失/校验失败）且可解释
- PASS 判据：Node 与 Browser diff 都必须 `comparable=true && regressions==0`

## Project Structure

### Documentation (this feature)

```text
specs/053-core-ng-aot-artifacts/
├── spec.md
├── plan.md
├── quickstart.md
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core/src/Reflection.ts                 # Static IR export/manifest（事实源）
packages/logix-core/src/internal/state-trait/*        # converge Static/Exec IR

packages/logix-core-ng/src/*                          # core-ng 装配期注入（AOT artifact loader）
packages/logix-react/test/browser/*                   # browser perf suites（P1）
```

## Deliverables by Phase

- **Phase 0（research）**：确认触发条件是否满足（解释层成本主导、runtime 优化已接近平台上限），并固化工件 schema + fallback reasonCode + evidence 字段（Slim、可序列化）。
- **Phase 1（design）**：设计“工件加载/校验/注入”的 Layer 边界与 strict gate 策略（可升级 FAIL），并明确 Browser/Sandbox 的资源路径与缓存策略（只做最小可解释方案）。
- **Phase 2（tasks）**：见 `specs/053-core-ng-aot-artifacts/tasks.md`。

### Gate Result (Post-Design)

- FROZEN（保留为可选加速器预案；仅在触发条件满足时解冻启动；避免把工具链税提前引入默认路径）
