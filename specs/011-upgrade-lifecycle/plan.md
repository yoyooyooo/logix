# Implementation Plan: Lifecycle 全面升级

**Branch**: `[011-upgrade-lifecycle]` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/011-upgrade-lifecycle/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

将模块生命周期升级为“声明式 + 统一调度 + 可等待可诊断”的运行时能力：明确初始化门禁与任务分类、销毁顺序与幂等、错误兜底与可序列化诊断链路，并补齐稳定标识模型与性能/诊断预算。

> 文档节奏说明：本特性的 SSoT / 用户文档可能会在实现前先补“目标语义草案”，但以实现完成后的 **Doc Sweep** 为准；若实现与文档存在差异，应优先在本特性 `specs/011-upgrade-lifecycle/*` 内标注差异与待办，避免误导。

## Coordination（与 016 的单入口关系）

- 本目录维护 `specs/011-upgrade-lifecycle/tasks.md` 作为 011 的实施入口：生命周期门禁/销毁语义、错误分层、平台信号与 React onError 桥等以此为准。
- 与 `specs/016-serializable-diagnostics-and-identity/*` 的关系：凡触及“可导出诊断边界/JsonValue/错误摘要（errorSummary/downgrade）/instanceId 单锚点/RuntimeDebugEventRef”等横切整改，必须同时对齐 016 的裁决源与 contracts，并在两边用依赖/引用方式避免双真相源。

## Post-Implementation Review（用于验收收口，非实现）

> 011 的实现主干已落地，但仍存在关键验收缺口。本节把 review 结论收敛为 **P0/P1 整改计划**，并与 005/协议层约束对齐（尤其是“可序列化 + 稳定锚点”）。

### 已落地（方向正确，作为现状基线）

- setup-only：`$.lifecycle.*` 在 run 段触发 phase guard 并拒绝注册（`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`）。
- init 门禁（串行 + blocking）：init effects 在 `ModuleRuntime.make` 中统一调度执行（`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`）。
- destroy LIFO + best-effort：destroy effects 逆序执行（`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`）。
- 平台信号：onSuspend/onResume/onReset 已接线到 Platform（`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`）。
- React onError 桥：`RuntimeProvider.onError` 监听 lifecycle:error 与 error 级 diagnostic（`packages/logix-react/src/components/RuntimeProvider.tsx`）。
- perf 证据：`pnpm perf bench:011:lifecycle` 与 `specs/011-upgrade-lifecycle/perf/*`。

### P0：协议/锚点/文档（必须先收敛）

#### P0.1 诊断事件可序列化（对齐 NFR-002/NFR-005 与 005 协议硬门）

- 风险现状：Debug 事件仍可能携带 `cause: unknown` 并被 DevtoolsHub ring buffer 原样存储（不可序列化对象图会污染导出/跨宿主链路）。
- 收敛目标：
  - **宿主内**：允许保留原始 `cause` 仅用于日志/打印；
  - **导出/跨宿主**：必须降级为可 JSON 序列化摘要（参考 `specs/011-upgrade-lifecycle/contracts/schemas/error-summary.schema.json`，以及 `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json` 的硬门）。
- 规划动作（不在本次执行）：
  - 明确 `lifecycle:error` 的“原始事件 vs 可导出事件”边界（DebugSink → Hub → Export）；
  - 为 `lifecycle:error` 与关键 diagnostic 补齐 `errorSummary`/`causePretty` 的结构化字段，并禁止把原始 cause 写入可导出 meta。

#### P0.2 Identity Drift Fix Plan（instanceId 单锚点）

- 目标：对外协议与证据包以 `instanceId` 为唯一实例锚点（不暴露第二锚点字段）。
- 迁移策略（不做兼容层）：统一事件/回调上下文只输出 `instanceId`；旧数据直接重采集/升级，不提供 alias 兼容。

#### P0.3 用户文档漂移修复（P0，实施阶段必须完成）

- 待修正：将 `apps/docs` 中的 lifecycle 示例统一改为 setup-only（LogicPlan 形态），并移除不存在的 `$.lifecycle.onReady`。
- 待对齐：Suspense 文档明确 `useModule` 默认同步；仅 `suspend:true + key` 才会挂起。

### P1：FR/NFR 缺口（排期分批收敛）

- FR-002/FR-009：区分“必需初始化”与“启动任务（不阻塞可用性但失败要上报）”、以及对外一致的初始化状态表达/句柄，目前缺少稳定落点；需要在 contracts 与 runtime API 上补齐。
- 性能基线：当前 perf 文档标注 “Before 不可对比”，导致只能算 after 单点数据；需要补齐可对比的 baseline 策略（例如固定基线输入与测量脚本版本）。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.8.2（ESM） + Node.js 20+  
**Primary Dependencies**: effect v3（`effect@^3.19.8`）、`@logixjs/core`、`@logixjs/react`、Vitest（含 `@effect/vitest` 风格用例）  
**Storage**: 内存态（Effect Context/Scope + Ref/SubscriptionRef），无持久化存储  
**Testing**: Vitest 4 + `@effect/vitest`（Effect-heavy）、React 侧使用 Testing Library（按既有用例）  
**Target Platform**: Node.js 20+；React 19（适配层）；Devtools 事件以进程内聚合为主（后续可桥接到 Sandbox）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**: 以“模块实例创建/初始化门禁/终止清理”为测量路径；相对基线：p95 创建/终止增量 ≤ 5%，诊断关闭时增量 ≤ 1%  
**Constraints**: 稳定标识（无随机/时间默认 id）、事务窗口禁止 IO/await、诊断事件 slim 且可序列化、默认诊断近零成本  
**Scale/Scope**: 单进程内可并行多实例（同模块多 key / 多会话）；Devtools ring buffer 默认 500 条事件窗口

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

### Answers (Pre-Research)

- **Intent → Flow/Logix → Code → Runtime**：本特性聚焦在 `Bound API $.lifecycle`（Logix 入口）与 `ModuleRuntime`（Runtime 执行与 Scope）之间的契约，使“生命周期意图”可声明、可调度、可诊断。
- **Docs-first & SSoT**：先更新/对齐 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md` 的生命周期语义与消费模式，再同步 `apps/docs` 的用户教程与示例；实现细节落到 `packages/logix-core` 与 `packages/logix-react`。
- **Contracts**：会变更/补齐 `BoundApi.lifecycle` 的语义（注册 vs 执行、初始化门禁、销毁顺序、错误策略）与 Debug/诊断事件字段；对应文档以 `.codex/skills/project-guide/references/runtime-logix/*` 为主事实源。
- **IR & anchors**：不引入第二套 IR；生命周期的观测面作为 Dynamic Trace 的事件扩展，必须使用稳定标识并保持可序列化（与 Debug/Devtools 统一）。
- **Deterministic identity**：移除随机/时间作为默认 id 来源，改为稳定的 `instanceId + txnSeq + opSeq`（并由此派生 `txnId/opId/eventId/linkId` 等确定性标识），并在本特性 contracts 与 data-model 中固化。
- **Transaction boundary**：生命周期任务不得在事务窗口内执行会阻塞/等待的工作；事务内写入仍必须通过统一事务机制进入 dirty-set/patch；违反边界需输出可行动诊断。
- **Performance budget**：触及 `ModuleRuntime.make`、生命周期调度、Debug 事件记录；Phase 0 先建立可复现基线，Phase 1 设计时明确哪些路径新增常数项/分配，并提供回归防线。
- **Diagnosability**：补齐生命周期阶段事件（init/start/ready/failure/destroy 等）与错误上下文；关闭诊断应近零成本；开启诊断遵守事件数量与体积上界。
- **Breaking changes**：属于破坏性升级；迁移说明写入本特性的 `quickstart.md`，并同步更新 `apps/docs` 与 `examples/*`（不提供兼容层）。
- **Quality gates**：合并前至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`（含 core/runtime 相关用例）；新增/修改的生命周期测试必须覆盖成功/失败/中途终止/多实例并行。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file ($speckit plan command output)
├── research.md          # Phase 0 output ($speckit plan command)
├── data-model.md        # Phase 1 output ($speckit plan command)
├── quickstart.md        # Phase 1 output ($speckit plan command)
├── perf.md              # Perf evidence template + runner script link
├── contracts/           # Phase 1 output ($speckit plan command)
└── tasks.md             # Phase 2 output ($speckit tasks command - NOT created by $speckit plan)
```

### Source Code (repository root)
```text
packages/logix-core/
├── src/internal/runtime/core/Lifecycle.ts
├── src/internal/runtime/BoundApiRuntime.ts
├── src/internal/runtime/ModuleRuntime.ts
├── src/internal/runtime/core/DebugSink.ts
└── test/

packages/logix-react/
└── src/internal/ModuleCache.ts

packages/logix-query/            # 既有 $.lifecycle 用例（迁移样板）
packages/logix-form/             # 既有 $.lifecycle 用例（迁移样板）

.codex/skills/project-guide/references/runtime-logix/         # SSoT（语义与契约）
apps/docs/content/docs/           # 用户文档（产品视角）
examples/                         # 可运行示例（回归/验收）
```

**Structure Decision**: pnpm workspace 下的 runtime 核心改动优先落在 `packages/logix-core`，React 行为与 Suspense 门禁对齐落在 `packages/logix-react`，文档以 `docs/specs` 为 SSoT 并同步 `apps/docs` 与 `examples`。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

No violations identified for this feature at planning time.

## Phase Plan (Outputs)

### Phase 0 - Outline & Research

- 产出 `research.md`：对生命周期语义、初始化门禁策略、错误策略、稳定标识模型、诊断事件预算与测量方法做出明确决策（含备选方案与取舍）。
- 建立性能基线方案：给出可复现的测量入口与数据记录方式（以脚本/基准用例为准）。

### Phase 1 - Design & Contracts

- 产出 `data-model.md`：固化 Module Instance / Lifecycle Task / Outcome / ErrorContext / DiagnosticEvent 的字段与状态转换。
- 产出 `contracts/`：以 OpenAPI 3.1 + JSON Schema 形式固化生命周期事件与对外可观测字段（不暗示具体传输实现）。
- 产出 `quickstart.md`：提供迁移说明与最小可用接线方式（同步模式/可等待模式/平台信号）。
- 更新 agent context：运行 `/.specify/scripts/bash/update-agent-context.sh codex`，将本次计划中的技术上下文写入 agent 文件。

### Phase 1 - Constitution Re-check (Post-Design)

- 确认 contracts 已覆盖稳定标识与事件 slim/可序列化约束；
- 确认性能预算与诊断预算可被验收用例验证；
- 确认 breaking change 的迁移说明已在 quickstart 与用户文档中落地。

### Phase 3 - Closeout (Docs & Examples)

> 实现完成后的扫尾阶段：用最少动作消除“契约/实现/示例/用户文档”的漂移，不引入兼容层。

- 回填并校对 `.codex/skills/project-guide/references/runtime-logix/logix-core/*` 与 `apps/docs/content/docs/*`：确保错误分类、取消语义、生命周期门禁/销毁顺序等描述与实现一致。
- 更新 `examples/*`：补至少 1 个可运行场景覆盖“必需初始化门禁 + 启动任务 + 终止清理 + 错误兜底”。
- 将 quickstart 中标注的“目标语义示例”替换为可运行示例（或明确保留为概念示例并链接到可运行代码）。

## Constitution Re-check (Post-Design Results)

- **Docs-first & SSoT**：本计划的契约面已落在 `specs/011-upgrade-lifecycle/contracts/*` 与 `specs/011-upgrade-lifecycle/data-model.md`；后续实现前应先回填/对齐 `.codex/skills/project-guide/references/runtime-logix/*` 与 `apps/docs/*`（见 Summary 与 Project Structure）。
- **IR & anchors**：未引入新 IR；生命周期事件被建模为可序列化的诊断/trace 事件（见 `contracts/schemas/lifecycle-event.schema.json`）。
- **Deterministic identity**：已在 data-model 与 contracts 中固化 `moduleId + instanceId` 作为实例锚点，并为 `txnSeq/opSeq` 留出字段与派生规则（见 `specs/011-upgrade-lifecycle/data-model.md`）。
- **Transaction boundary**：已在 spec/plan 中明确“事务窗口禁止等待/阻塞”，并将其纳入边界用例与需求追踪（见 `specs/011-upgrade-lifecycle/spec.md` 的 Edge Cases 与 FR-010）。
- **Diagnosability budgets**：事件数量/体积预算在成功指标与 data-model 中给出上界（见 `specs/011-upgrade-lifecycle/spec.md` 的 SC-005 与 `specs/011-upgrade-lifecycle/data-model.md` 的 Budgets）。
- **Breaking changes**：迁移原则已写入 `specs/011-upgrade-lifecycle/quickstart.md`；实现阶段需同步更新 `apps/docs` 与 `examples/*`。
