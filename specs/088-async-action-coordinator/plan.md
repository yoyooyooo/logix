# Implementation Plan: 088 Async Action Coordinator（统一异步链路协调面）

**Branch**: `088-async-action-coordinator` | **Date**: 2026-01-10 | **Spec**: `specs/088-async-action-coordinator/spec.md`  
**Input**: Feature specification from `specs/088-async-action-coordinator/spec.md`

## Summary

目标：把“一次用户交互触发的异步链路（pending → IO → writeback → settle）”提升为 Runtime/React/Devtools 可消费的一等公民（Async Action），并用稳定标识贯穿，使业务侧不再到处手写 loading 协调。

本特性同时是 087 路线的基础依赖：`089/090/091/092` 都必须对齐 088 的 action 语义与标识。

## Deepening Notes

- Decision: ActionRunId 复用 `linkId`（稳定可重建；推荐 `<instanceId>::o<opSeq>`）（source: `specs/088-async-action-coordinator/spec.md` Clarifications）
- Decision: `actionId` 必须显式且稳定（用于合并/取消/诊断聚合）（source: `specs/088-async-action-coordinator/spec.md` Clarifications）
- Decision: 默认并发策略 `latest-wins`（同 actionId 覆盖取消；旧 run 必须 settle=cancelled）（source: `specs/088-async-action-coordinator/spec.md` Clarifications）
- Decision: 取消尽量传播到 IO（AbortController），否则用 generation/linkId guard 丢弃旧结果（source: `specs/088-async-action-coordinator/spec.md` Clarifications）
- Decision: failure vs defect 分离；导出只保留可序列化 errorSummary（source: `specs/088-async-action-coordinator/spec.md` Clarifications）
- Decision: action 事件最小集合固定（trigger/pending/settle），并固化 schema（source: `specs/088-async-action-coordinator/contracts/README.md`）

## Existing Foundations（直接复用）

- 稳定锚点与事务标识：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`docs/specs/drafts/topics/runtime-v3-core/01-transaction-identity-and-trace.md`
- Debug/Devtools 事件模型（Slim/JsonValue）：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- React 侧订阅与优先级通知：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`、`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、`@logixjs/react`、`@logixjs/devtools-react`  
**Storage**: N/A（运行期纯内存；证据落盘到 `specs/088-async-action-coordinator/perf/*`）  
**Testing**: Vitest（Effect-heavy 用 `@effect/vitest`；React 行为/集成用 Vitest；必要时补 browser 覆盖）  
**Target Platform**: Node.js 20+ + modern browsers（headless）  
**Project Type**: pnpm workspace（packages + apps + examples）  
**Performance Goals**: 新增 action 协调能力在核心路径（dispatch/commit/notify）的 p95/alloc 不得显著回归；诊断开启/关闭的差异必须可度量  
**Constraints**: 稳定标识去随机化；事务窗口禁 IO；诊断事件 Slim/可序列化；React 无 tearing；forward-only（无兼容层）  
**Scale/Scope**: 覆盖 core + core-ng（契约一致），至少落地：Runtime action run + React hooks + Devtools 事件/视图入口

## Constitution Check

_GATE: 必须在进入实现前通过；并在实现后用 perf evidence + devtools 事件校验回看。_

- 映射链路：把“异步协调”收敛为 Runtime 的 ActionRun（可跟踪、可取消、可串因果链），并在 React 层以 Viewer 模式消费（不通过 `useEffect` 做数据胶水）。
- 合同/文档：若引入新的对外 API/协议（action 事件/状态），必须同步更新 runtime SSoT（`docs/ssot/runtime/**`）与用户文档（`apps/docs`）。
- IR/锚点：action 事件必须能降解到统一最小 IR（动态 trace），并贯穿稳定锚点（`instanceId/txnSeq/opSeq/linkId`）。
- 事务边界：严格禁止在事务窗口内 IO/await；pending 与回写必须通过事务提交表达。
- React 无 tearing：action 状态的订阅/快照必须与模块状态快照处于同一“快照锚点”，禁止双真相源。
- External sources：如 action 期间接入外部源，订阅必须 pull-based（signal dirty + 去重调度）。
- Dual kernels：action 协议属于 core/core-ng 共同契约；consumer 不得直依赖 `@logixjs/core-ng`。
- 性能与诊断：`diagnostics=off` 近零成本；开启诊断时事件 Slim、可序列化且 ring-buffer 有界。
- Breaking changes：forward-only；如改变现有 dispatch/事件协议，必须写迁移说明（不提供兼容层）。

### Gate Result (Pre-Implementation)

- PASS（已在 spec/plan 固化边界；实现必须补齐 perf evidence + 事件链路）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- Baseline 语义：代码前后（before/after）
- envId：darwin-arm64.node20.chrome-headless（以实际采集机为准；必须保持 before/after 一致）
- profile：default（交付）
- collect（before）：`pnpm perf collect -- --profile default --out specs/088-async-action-coordinator/perf/before.<sha>.<envId>.default.json`
- collect（after）：`pnpm perf collect -- --profile default --out specs/088-async-action-coordinator/perf/after.<sha|worktree>.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/088-async-action-coordinator/perf/before.<sha>.<envId>.default.json --after specs/088-async-action-coordinator/perf/after.<sha|worktree>.<envId>.default.json --out specs/088-async-action-coordinator/perf/diff.before.<sha>__after.<sha|worktree>.<envId>.default.json`
- Suites：至少覆盖 1 条 Node + 1 条 Browser 关键路径（action pending/settle + notify +（可选）react render）
- Failure Policy：出现 `comparable=false` 禁止下硬结论；复测必须同 envId/profile/matrixHash

## Project Structure

### Documentation (this feature)

```text
specs/088-async-action-coordinator/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── README.md
│   └── schemas/
│       ├── async-action-event.schema.json
│       └── async-action-event-meta.schema.json
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Action.ts (new public submodule)
└── internal/runtime/core/
   ├── ActionRuntime.ts (new)
   ├── ActionRuntime.events.ts (new)
   └── ... (wiring into ModuleRuntime/DebugSink)

packages/logix-react/src/
└── internal/hooks/
   ├── useAction.ts (new)
   └── useActionPending.ts (new)

packages/logix-devtools-react/src/
└── internal/ui/
   └── (Action timeline / badges entry; new or extend existing views)

apps/docs/content/docs/
└── guide/
   └── (Async Action 心智模型与用法入口；面向业务开发者)

examples/logix/
└── src/scenarios/
   └── async-action/ (new demo，用于验收与 perf workload)
```

**Structure Decision**:

- API 命名：对外收敛为一个 public submodule（`Action`），内部实现下沉 `src/internal/**`，避免泄露 internal。
- 事件模型：Devtools 只消费 Slim/JsonValue；重 payload 必须降级/裁剪。
- React：尽量作为 Viewer（订阅+触发），不引入数据胶水 `useEffect` 同步 state。

## Complexity Tracking

无（若实现阶段引入新协议/大文件，需要在实现 PR/补充 plan.md 记录拆解简报与理由）
