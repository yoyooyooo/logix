# Research: Logic Traits in Setup

**Date**: 2025-12-22  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/023-logic-traits-setup/spec.md`  
**Goal**: 在不引入并行真相源的前提下，让 traits 能在 Logic setup 阶段声明并随 Logic 复用而复用，同时保持确定性、可诊断、可回放与近零成本诊断开销。

## 现状快照（已验证）

- `Module.make({ traits })` / `ModuleTag.make({ traits })` 当前只支持把 `traits` 当作 `StateTraitSpec`：在 `ModuleTag.make` 阶段 `StateTrait.build` 生成 `StateTraitProgram`，并在 `ModuleTag.implement` 注入一段 setup-only Logic 调用 `StateTrait.install`（见 `packages/logix-core/src/ModuleTag.ts`；`Module.make` 会把 `traits` 透传给内部的 `ModuleTag.make`）。
- Runtime 已有“两阶段 LogicPlan（setup/run）”执行模型：`Module.logic(($)=>...)` 允许返回 `{ setup, run }`，`ModuleRuntime` 在初始化时先执行所有 setup，再 fork run（见 `packages/logix-core/src/internal/runtime/ModuleRuntime.logics.ts` 与 `packages/logix-core/src/internal/runtime/ModuleFactory.ts`）。
- `BoundApi.traits.source.refresh(fieldPath)` 已作为 traits 运行时入口存在，但目前 traits 的“声明入口/合并入口”仍停留在 Module.make。
- Debug/Devtools 已有读取 Program 的能力：`Debug.getModuleTraits(module)` 通过 Symbol 槽位读取 `StateTraitProgram`；dev 环境还有按 moduleId 的 registry（`ModuleTraitsRegistry`）。
- `022-module` 已落地 `logicUnitId`（slot key）与 `trace:module:descriptor`：`Module.logic(build, { id? })` 与 `withLogic(logic, { id? })` 共同决定挂载到模块上的逻辑单元 id；重复 id 采用 `last-write-wins` 并在 dev+diagnostics!=off 时发 `module_logic::override` 诊断（见 `packages/logix-core/src/Module.ts` 与 `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`）。

## 决策（本特性建议）

### Decision 1：把“Logic 贡献 traits”建模为 setup 阶段的声明行为，而不是运行期可变行为

**Rationale**:
- setup 阶段天然适合做结构 wiring（与现有 traits install 模式一致），且默认不依赖 Env，利于确定性与可回放。
- 运行期可变会引入行为漂移与诊断复杂度，且与“setup 后冻结”的需求冲突。

**Alternatives considered**:
- 让运行期动态 add/remove traits：会破坏确定性与冻结语义，且难以保证事务边界与证据一致性。

### Decision 2：traits 合并与冲突检测必须发生在“进入运行前”，并输出 provenance

**Rationale**:
- 组合规模提升后，必须“硬失败 + 可定位来源”，否则组合性会转化为排障成本与不稳定性。
- provenance 是 Devtools/回放解释链路的基础信息，应与 traits 最终快照一起稳定导出。

**Alternatives considered**:
- last-wins/merge：除非有强需求，否则会引入隐式语义与不可预测行为；本特性默认以确定性与硬失败优先。

### Decision 3：优先复用现有 StateTrait/Program/IR 出口，新增的只是“来源与组合入口”

**Rationale**:
- 现有 `StateTraitProgram` 已提供 Graph/Plan/StaticIR，且已经被 Devtools/文档对齐引用。
- 本特性是“组合与声明位置扩展”，不应新造第二套 trait IR。

**Alternatives considered**:
- 重新设计通用 Trait Kernel：收益较大但范围爆炸；更适合作为后续主题，不作为 023 的交付目标。

## 需要在实现阶段补齐的证据/基线

- 性能：模块构建/初始化路径的基线与对比（默认关闭诊断时回归 ≤1%）。
- 诊断：新增事件/摘要的载荷必须 Slim 且可序列化；默认关闭时近零成本。

## Open Questions

无（本次规划避免留下 NEEDS CLARIFICATION；若实现阶段出现分歧，以 007 的冲突/回放口径为裁决基线）。
