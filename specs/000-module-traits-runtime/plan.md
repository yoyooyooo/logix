# Implementation Plan: 001-module-traits-runtime（StateTrait + EffectOp/Middleware 主线）

**Branch**: `001-module-traits-runtime` | **Spec**: `specs/000-module-traits-runtime/spec.md`
**Input**: Feature specification + research/data-model/quickstart under `specs/000-module-traits-runtime/`

## Summary

本特性负责把「模块图纸中的 `state + actions + traits` → StateTraitProgram → Runtime EffectOp/Middleware 总线」这条链路打通，并替代早期基于 `@logixjs/data` 的字段能力方案。  
核心目标：

- 为模块作者提供稳定的 StateTrait DSL（`StateTrait.from(StateSchema)({ ... })`），统一表达 computed / source / link 能力；
- 在 `@logixjs/core` 内部实现 StateTraitProgram（含 Graph/Plan），并在 Runtime 中通过 `StateTrait.install($, program)` 将其挂载到 Bound API；
- 通过 EffectOp/Middleware 总线把 Trait 行为与 Debug / Resource / Query / Devtools 视图打通。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM 输出）+ Node.js 20+，面向现代浏览器（Chromium/Firefox/Safari 最近两个大版本）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`（StateTrait/Runtime 内核）、`@logixjs/react` / `@logixjs/devtools-react`（用于示例与端到端验证）  
**Storage**: N/A（本特性仅管理内存中的 Module/StateTrait 程序与运行时状态，不直接接入外部存储）  
**Testing**: Vitest（含 `@effect/vitest`），通过 `pnpm typecheck`、`pnpm typecheck:test` 与 `pnpm test --filter logix-core`/`--filter logix-react` 作为主要质量门  
**Target Platform**: Node.js 20+（开发与测试环境）、现代浏览器（Logix React 示例与 Devtools 集成）  
**Project Type**: pnpm monorepo；本特性主要落在 `packages/logix-core`，并通过 `packages/logix-react` / `packages/logix-devtools-react` 与示例应用验证  
**Performance Goals**: 在维持现有 Logix Runtime 性能基线的前提下，引入 StateTrait/EffectOp 不产生明显额外开销；高频 Path 需保持「类型推导友好 + 调试可观测」  
**Constraints**:  
- Trait/Runtime 契约必须与 `.codex/skills/project-guide/references/runtime-logix/logix-core/*` 中的描述保持一致（文档为 SSoT）；  
- StateTraitProgram/Graph/Plan 需保持可序列化/可调试，便于 Devtools 与平台消费；  
- 中间件执行只能通过 EffectOp 总线落地，避免新增 ad-hoc Hook。  
**Scale/Scope**:  
- 范围：`packages/logix-core` StateTrait 内核 + Runtime EffectOp/Middleware 管道 + `specs/000-module-traits-runtime` 文档集；  
- 不在本轮范围：Devtools UI 细节、Studio/Parser 的完整实现，仅对接必要的数据契约。

## Constitution Check

- Intent → Flow/Logix → Code → Runtime 映射：  
  - Intent 层由 v3 SDD 文档定义 Module 图纸与 Trait 能力；  
  - Flow/Logix 层通过 StateTraitProgram + Logic/Flow API 将「图纸」映射为 Effect 程序；  
  - Code/Runtime 层由 `@logixjs/core` ModuleRuntime + EffectOp/Middleware 统一执行业务与横切能力。  
- 依赖 / 修改的上游 specs：  
  - `docs/specs/sdd-platform/ssot/*` 中关于 Module 图纸与 Traits 的章节；  
  - `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md` / `03-logic-and-flow.md` / `06-platform-integration.md` 中的 StateTrait / EffectOp / Middleware 契约。  
- Effect/Logix 契约变更落点：  
  - 新增 StateTraitProgram/Graph/Plan/EffectOp 数据结构与运行时行为；  
  - 所有变更需先在 runtime-logix 文档中明确，再下沉到 `packages/logix-core` 实现。  
- 质量门：  
  - merge 前必须通过 `pnpm typecheck`、`pnpm typecheck:test`、`pnpm lint` 与 `pnpm test --filter logix-core`；  
  - Phase N 阶段需额外补齐高风险路径的类型/行为测试（Graph/Plan 构造、EffectOp 中间件组合、Resource/Query 集成）。

## Project Structure

### Documentation（本特性）

```text
specs/000-module-traits-runtime/
├── plan.md              # 本文件（Implementation Plan）
├── spec.md              # Feature Specification（主事实源）
├── research.md          # Phase 0 决策与备选方案
├── data-model.md        # StateTraitProgram / Graph / Plan / EffectOp 等数据模型
├── quickstart.md        # Module 图纸 → Runtime → Devtools 端到端示例
├── contracts/           # 对外 API 契约说明（TypeScript 级别）
├── tasks.md             # 任务分解与 Phase 规划
└── checklists/          # 质量与准备度检查清单
```

### Source Code（repository root）

```text
packages/
├── logix-core          # StateTrait / EffectOp / Middleware 运行时内核（本特性主落点）
├── logix-react         # React 适配层（RuntimeProvider / hooks），用于端到端示例
├── logix-devtools-react# Devtools 视图与调试集成（本轮仅视作数据消费方）
└── logix-sandbox       # Playground / Runtime Alignment Lab（后续场景验证）

examples/
└── logix-react         # 示例模块与应用（含 quickstart 示例 CounterWithProfile 等）
```

**Structure Decision**:  
- 不新增独立的 `@logixjs/data` 包作为字段能力宿主，相关实现与规范统一归档为历史 PoC；  
- 以 `packages/logix-core` 为唯一 StateTrait/EffectOp 承载位置，通过 TypeScript 类型与 runtime-logix 文档保持 SSoT 一致。

## Complexity Tracking

目前未引入额外项目或过度架构复杂度；如后续需要拆分 Runtime/Devtools 包或引入独立 Playground 包，再在此处记录原因与替代方案对比。
