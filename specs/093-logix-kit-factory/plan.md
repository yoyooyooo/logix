# Implementation Plan: Logix Kit Factory（语法糖机器）

**Branch**: `093-logix-kit-factory` | **Date**: 2026-01-21 | **Spec**: `specs/093-logix-kit-factory/spec.md`  
**Input**: `specs/093-logix-kit-factory/spec.md`

## Summary

为 `@logixjs/core` 新增一个公共子模块 `Kit`（v1 命名裁决见 `research.md`），提供两类 factory：

- `forService(tag)`：把一个稳定 `Context.Tag` 同时接到 Trait/Logic/Workflow 三个入口（等价组合，不新增语义）。
- `forModule(module, readQuery)`：把 Module-as-Source 标准化为 InputKit，供 `StateTrait.externalStore` 写回使用。

强约束：零副作用、稳定 identity、可诊断、尽量 tree-shakable。

### Questions Digest（external questions via `$speckit plan-from-questions`）

- Q001：降低 “TraitMeta 白名单裁剪” 的困惑：文档显著提示 + 开发期反馈（`Kit.validateMeta(meta)` / dev warn）。
- Q002：明确 Module-as-Source 边界：补齐“动态实例选择”反模式与正确建模；在“不可解析到唯一源模块实例”时给出明确错误与修复提示。
- Q003：降低 stepKey 手工负担但保持显式：提供确定性 helper（`Kit.makeStepKey(prefix, literal)`）+ 稳定性测试门禁（仍不做隐式自动补全）。
- Q004：Perf Evidence 仍标注为 N/A，但在任务中增加“热路径边界验证”；若发现必须触及热路径/导出协议，立即启用 perf evidence 流程并回填本节。
- Q005：domain kit 落点保持 “先落在 examples/app 侧”，但补齐一份 `domain-kit-guide.md` + 一个 Router 参考实现，避免后续碎片化。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`（StateTrait/ExternalStore/Workflow/ReadQuery）  
**Storage**: N/A  
**Testing**: Vitest + `@effect/vitest`（按需要；本特性以单测为主）  
**Target Platform**: Node.js + 浏览器（仅影响编译/装配期；不进入 tick 热路径）  
**Project Type**: pnpm workspace（packages/* + apps/*）  
**Performance Goals**: 默认不触及热路径；若引入热路径变化，必须补 perf evidence  
**Constraints**: forward-only evolution；稳定身份；事务窗口禁 IO；单一真相源  
**Scale/Scope**: 以端口型能力复用为主要收益（Router/Session/Flags/WebSocket 等）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于“组合层/造糖层”，目标是把既有运行时原语（ExternalStore/StateTrait/Logic/Workflow）用确定性模板拼装成可复用 sugar，减少胶水并避免双真相源；不新增运行时语义与调度路径。
- **Docs-first & SSoT**：语义与身份规则以既有 SSoT 为准，主要依赖：
  - `specs/073-logix-external-store-tick`（ExternalStore + externalStore trait + Module-as-Source 边界）
  - `specs/075-workflow-codegen-ir`（Workflow.call/callById 与分支形态）
  - `specs/078-module-service-manifest`（Tag→ServiceId 的 contract）
  - `.specify/memory/constitution.md`（零成本诊断/稳定身份/事务边界/forward-only）
- **Effect/Logix contracts**：新增 `@logixjs/core` 公共子模块（`Kit`），仅提供 build-time 组合 API；不改变既有 ExternalStore/StateTrait/Workflow 契约。
- **IR & anchors**：Kit 不引入新的 IR；只复用并暴露既有可导出锚点（ExternalStore descriptor、ReadQueryStaticIr、Workflow 的 serviceId/stepKey）。
- **Deterministic identity**：Kit 不生成随机/时间 id；所有 identity 必须从稳定输入派生或由调用方显式提供（见 `contracts/identity.md`）。
- **Transaction boundary**：Kit 不在事务窗口内执行 IO；写侧通过显式 command/service port（Effect）在事务外执行，读侧通过 `StateTrait.externalStore` 写回进入事务窗口。
- **React consistency（no tearing）**：不触及 React 订阅模型；但强制遵守“外部源必须通过 ExternalStore→StateTrait.externalStore 接入，UI 不双读”口径（避免双真相源）。
- **External sources（signal dirty）**：ExternalStore 仍遵守 073 的 Pull-based（Signal Dirty）契约；Kit 不改变 subscribe/getSnapshot 语义。
- **Internal contracts & trial runs**：不新增 Runtime Service；仅组合已有接口；测试以单测验证“零副作用 + 形状等价”。
- **Dual kernels（core + core-ng）**：Kit 位于 `@logixjs/core`，不引入 `@logixjs/core-ng` 依赖；对 core-ng 无要求（纯组合层）。
- **Performance budget**：不进入 tick 热路径；若实现中不得不触及热路径/导出协议，则补 perf evidence（本节暂 N/A）。
- **Diagnosability & explainability**：Kit 本身不新增诊断协议；仅在参数缺失/不稳定时 fail-fast，并复用下游错误/诊断（见 `contracts/diagnostics.md`）。
- **用户心智模型（≤5 关键词）**：`tag` / `kit` / `externalStore` / `commandPort` / `workflow.call`
- **Breaking changes（forward-only）**：新增 API（非破坏）；若未来发现命名/分层不优，按 forward-only 直接替换并给迁移说明（不保留兼容层）。
- **Public submodules**：新增 `packages/logix-core/src/Kit.ts`（必须有实际实现，不做纯 re-export）；实现细节如需下沉放 `src/internal/**`。
- **Quality gates**：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo` + `packages/logix-core` 相关单测（Kit）。

### Gate Result (Pre-Design)

- PASS（本阶段交付为 design artifacts；实现按 `tasks.md` 推进）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- N/A（v1 目标是不进入 tick 热路径；任务中补充“热路径边界验证”。如实现阶段发现必须修改热路径/导出协议，立即改为填写并执行 perf 证据计划）

## Project Structure

### Documentation (this feature)

```text
specs/093-logix-kit-factory/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── domain-kit-guide.md
├── contracts/
│  ├── public-api.md
│  ├── identity.md
│  └── diagnostics.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Kit.ts                # 新增：Kit 工厂（仅组合，无副作用）
├── KitWorkflow.ts        # 新增：Workflow sugar（薄封装；委托 Workflow.call/callById）
└── index.ts              # 导出：`export * as Kit from './Kit.js'` + `export * as KitWorkflow from './KitWorkflow.js'`

packages/logix-core/test/
└── Kit/
   ├── README.md
   ├── Kit.forService.test.ts
   ├── Kit.forModule.test.ts
   ├── KitWorkflow.forService.test.ts
   ├── Kit.metaValidation.test.ts
   ├── Kit.noSideEffect.test.ts
   ├── Kit.stepKey.test.ts
   ├── Kit.tickBoundary.test.ts
   └── Kit.workflowBoundary.test.ts

examples/logix/src/patterns/
└── router-kit.ts           # 参考 domain kit：用于验证 API 可用性与写法口径
```

**Structure Decision**: Kit 是 `@logixjs/core` 的公共子模块（非 internal），以最小 API 面对业务与平台出码；domain kits（router/session/...）仍先落在 examples 或 app 侧避免 core 与平台耦合，但本特性会提供一份 domain kit 写法指南与一个 Router 参考实现作为口径锚点。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
