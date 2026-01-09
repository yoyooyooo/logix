# Implementation Plan: Logic Traits in Setup

**Branch**: `[023-logic-traits-setup]` | **Date**: 2025-12-22 | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/023-logic-traits-setup/spec.md`  
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/023-logic-traits-setup/spec.md`

**Note**: 本文件由 `$speckit plan` 产出，位置：`/Users/yoyo/Documents/code/personal/intent-flow/specs/023-logic-traits-setup/plan.md`。

## Summary

允许在 `Logic` 的 `setup` 阶段声明并贡献 traits，并与 Module-level traits 一起合并为“模块最终 traits 集”。对齐 `022-module`：Module-level traits 归属到 `ModuleTag.make({ traits })`（同时 `Module.make({ traits })` 会把 `traits` 透传给内部的 `ModuleTag.make`），Logic-level provenance 复用 `logicUnitId`（slot key）作为稳定来源标识。实现上基于现有“两阶段 LogicPlan（setup/run）”执行模型，在 runtime 初始化阶段收集 traits 贡献并完成确定性合并、冲突检测与 provenance（来源链路）生成，同时把最小可回放证据纳入现有 Debug/Devtools 口径（保持禁用时近零成本）。

## Review Notes (Applied)

- 冻结时机：在 setup 完成后禁止再注册 traits 贡献（调用即报错），避免进入 Running 后产生漂移。
- 稳定 Logic 来源：为 provenance 的 `originId` 提供稳定策略（匿名/动态生成 logic 也需可复现），避免仅依赖组合顺序或运行期 opSeq 造成漂移。
- provenance 注入契约化：通过 `LogicUnitServiceTag` 提供“当前逻辑单元（logicUnit）”上下文，作用域=单个 logic 的 setup/run fiber；只读，不得写入 runtime state（对齐宪章的 DIP/可复现约束）。
- 组合与建图解耦：traits 合并/冲突检测作为“Composition Policy”独立于图构建逻辑；合并完成后再进入 build/graph/plan 生成，便于测试与隔离爆炸半径。

## Technical Context

**Language/Version**: TypeScript 5.8.2 + Node.js 22.21.1  
**Primary Dependencies**: `effect@^3.19.8` + `@logixjs/core`（Logix Runtime v3）  
**Storage**: N/A（无持久化数据模型）  
**Testing**: Vitest（`packages/logix-core/test/*`）+ `@effect/vitest`（Effect-heavy 用例）  
**Target Platform**: Node.js（核心运行时）+ 现代浏览器（React/Sandbox/Devtools 消费诊断证据）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*` + `apps/*`）  
**Performance Goals**: 仅触及模块构建/初始化路径；默认关闭诊断时新增开销预算 ≤1%（以同一基线对比），并提供可复现测量（新增/扩展 Vitest 基准或 profile 脚本）  
**Constraints**: 稳定标识（instanceId/txnSeq/opSeq）不漂移；事务窗口禁止 IO；诊断事件 Slim 且可序列化；内部协议必须显式契约化（避免 magic 字段与参数爆炸）  
**Scale/Scope**: 典型模块 1–20 个 logics、10–200 条 trait 规则；需要支持确定性合并与冲突定位

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Intent → Flow/Logix → Code → Runtime` 映射：traits 声明属于 Blueprint/Setup（可编译、可合并、可冲突检测的 Static IR），在 Runtime 初始化阶段完成 wiring/install，并在运行期以统一诊断/回放证据解释其影响。  
- 依赖/对齐的 specs：`/Users/yoyo/Documents/code/personal/intent-flow/specs/000-module-traits-runtime/spec.md`、`/Users/yoyo/Documents/code/personal/intent-flow/specs/007-unify-trait-system/spec.md`（TraitLifecycle/IR/冲突诊断口径）、`/Users/yoyo/Documents/code/personal/intent-flow/specs/022-module/spec.md`（logicUnitId/descriptor 作为 provenance 稳定锚点）。  
- 合同变化：预计新增/调整 `Module.logic` / `LogicPlan` / `BoundApi.traits` 的“声明 traits”入口与产物（详见本特性 `contracts/*`）；同时扩展 Debug/Devtools 可读到 provenance。  
- IR & anchors：扩展 traits 的最小 Static IR（现有 `StateTrait.exportStaticIr`）以携带来源链路与稳定 id；避免引入第二套并行真相源。  
- 确定性标识：复用并强化现有稳定 instanceId/txnSeq/opSeq；为 traits 贡献引入稳定可复现的逻辑来源标识（不依赖随机/时间）。  
- 事务边界：traits 贡献收集在初始化 setup 阶段完成；事务窗口内不允许引入 IO/异步行为（保持现有约束）。  
- 内部契约与可试运行：避免新增散落字段；采用现有 Symbol 槽位（`runtimeInternalsAccessor`）或显式 Runtime Service 来挂载 traits 贡献与最终快照；证据必须可导出并在 Node/浏览器可复现。  
- 性能预算：主要触及 Module.make（build program）与 ModuleRuntime.make（setup 收集与 install）；新增/扩展基准用例，默认关闭诊断时回归 ≤1%。  
- 可诊断性：增加“traits 来源/合并/冲突”结构化事件与摘要；禁用时近零成本，启用成本在 plan/tasks 中量化。  
- 对外心智模型：本变更改变“traits 可声明位置与组合语义”，需要文档给出 ≤5 关键词与优化梯子（在实现阶段同步更新 SSoT/用户文档）。  
- Breaking changes：允许破坏性变更（本仓拒绝向后兼容）；迁移说明以“迁移文档”替代兼容层（在 tasks 阶段写入）。  
- 质量门：实现完成前至少跑通 `pnpm typecheck`、`pnpm lint`、`pnpm test`（或最小受影响包级别等价门槛），并新增覆盖 traits 组合/冲突/证据稳定性的单测。

## Project Structure

### Documentation (this feature)

```text
specs/023-logic-traits-setup/
├── plan.md              # This file ($speckit plan command output)
├── research.md          # Phase 0 output ($speckit plan command)
├── data-model.md        # Phase 1 output ($speckit plan command)
├── quickstart.md        # Phase 1 output ($speckit plan command)
├── contracts/           # Phase 1 output ($speckit plan command)
└── tasks.md             # Phase 2 output ($speckit tasks command - NOT created by $speckit plan)
```

> 用户文档（产品视角）同步落点（实现阶段完成后必须更新）：
>
> - `apps/docs/content/docs/api/core/bound-api.md`（补齐 `$.traits.declare` 语义与使用边界）
> - `apps/docs/content/docs/guide/advanced/performance-and-optimization.md`（补齐 traits 组合的成本模型与优化梯子）

### Source Code (repository root)
```text
packages/
└── logix-core/
    ├── src/
    │   ├── Module.ts                              # 022：Module（定义对象）/withLogic/logicUnitId/descriptor（traits provenance 需对齐 logicUnitId）
    │   ├── ModuleTag.ts                           # 022：原 Module（身份锚点）更名后的落点；Module-level traits（StateTraitProgram + setup-only logic 注入）迁移到此
    │   ├── state-trait.ts                         # StateTrait DSL/build/install/exportStaticIr
    │   ├── Debug.ts                               # Debug.getModuleTraits / devtools 视图
    │   └── internal/
    │       ├── runtime/
    │       │   ├── ModuleFactory.ts               # Module.logic 构造 LogicPlan（setup/run）与 phaseRef
    │       │   ├── ModuleRuntime.logics.ts        # ModuleRuntime 启动：执行 setup、fork run
    │       │   ├── BoundApiRuntime.ts             # 022：$.use(module) 拆壳；023：declare 需避免引入热路径额外分配/异步
    │       │   └── core/
    │       │       ├── module.ts                  # ModuleLogic/LogicPlan/BoundApi（含 traits 运行时入口）
    │       │       └── runtimeInternalsAccessor.ts # Symbol 槽位（ModuleTraitsProgram 等）
    │       └── debug/
    │           └── ModuleTraitsRegistry.ts        # Devtools-only Program 索引（dev 环境）
    └── test/
        └── *.test.ts                              # 组合/冲突/证据稳定性回归用例（将新增或扩展）
.codex/skills/project-guide/references/runtime-logix/logix-core/api/
└── 02-module-and-logic-api.md                     # API/语义对齐（实现阶段需同步更新）
```

**Structure Decision**: 该特性属于 Runtime 合约演进，落点以 `packages/logix-core` 为主；文档与契约产物落在本特性目录 `specs/023-logic-traits-setup/*`，并在实现阶段回写 runtime SSoT 文档以避免漂移。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Constitution Check (Post-Design Re-check)

- 产物齐全：`research.md`、`data-model.md`、`contracts/*`、`quickstart.md`、`tasks.md` 均已生成，且已对齐 `specs/022-module/spec.md` 的 `logicUnitId/descriptor` 稳定锚点口径。
- 未引入并行真相源：规划仍以既有 `StateTraitProgram`/`StateTrait.exportStaticIr` 为最小 IR 落点，新增仅限“贡献收集/合并/冲突/来源”与证据桥接。
- 诊断与稳定标识约束可落地：traits 来源锚点以 resolved `logicUnitId` 为主，derived 明确降级；诊断事件保持 Slim 且可序列化；事务窗口仍禁止 IO。
- 性能基线（Diagnostics=off）：`packages/logix-core/test/LogicTraits.Setup.Perf.off.test.ts`（traits=100、contribs=4、iters=30）测得 p50=3.98ms、p95=5.18ms；后续以该基线约束“新增开销 ≤1%”，并在 diagnostics=light/full 下量化额外 trace 事件的成本。
