# Implementation Plan: 089 Optimistic Protocol（可回滚、可解释）

**Branch**: `089-optimistic-protocol` | **Date**: 2026-01-10 | **Spec**: `specs/089-optimistic-protocol/spec.md`  
**Input**: Feature specification from `specs/089-optimistic-protocol/spec.md`

## Summary

目标：把 optimistic 更新定义为一等公民协议（apply/confirm/rollback），并强制与 088 的 Async Action 协调面合流：稳定标识贯穿、事务边界严格、诊断事件可解释且 Slim。

## Deepening Notes

- Decision: optimisticId 从 action `linkId` + 单调序号派生（推荐 `<linkId>::p<seq>`）（source: `specs/089-optimistic-protocol/spec.md` Clarifications）
- Decision: rollback 顺序强制 LIFO（不支持非 LIFO 选择性回滚）（source: `specs/089-optimistic-protocol/spec.md` Clarifications）
- Decision: token 必须携带可回滚 inverse 记录，保证有限步回滚（source: `specs/089-optimistic-protocol/spec.md` Clarifications）
- Decision: token 数量/体积必须有界（超限拒绝或 override 清理旧 token）（source: `specs/089-optimistic-protocol/spec.md` Clarifications）
- Decision: confirm/rollback 必须幂等，乱序以 optimisticId 精确匹配（source: `specs/089-optimistic-protocol/spec.md` Clarifications）
- Decision: optimistic 事件 schema 固化（Slim/可序列化）（source: `specs/089-optimistic-protocol/contracts/README.md`）

## Dependencies

- 依赖：`specs/088-async-action-coordinator/`（ActionRun + stable ids + 诊断链路）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、`@logixjs/react`、`@logixjs/devtools-react`  
**Storage**: N/A（运行期纯内存；证据落盘到 `specs/089-optimistic-protocol/perf/*`）  
**Testing**: Vitest（Effect-heavy 用 `@effect/vitest`；React 行为/集成用 Vitest；必要时补 browser 覆盖）  
**Target Platform**: Node.js 20+ + modern browsers（headless）  
**Project Type**: pnpm workspace  
**Performance Goals**: optimistic 写入/回滚不得显著增加事务提交/订阅传播开销；`diagnostics=off` 近零成本  
**Constraints**: 稳定标识去随机化；事务窗口禁 IO；事件 Slim/可序列化；token 数量有界；forward-only  
**Scale/Scope**: core + core-ng 共同契约；至少落地 core 协议 + Devtools 事件/视图入口；React 侧仅作为消费方

## Constitution Check

_GATE: 必须在进入实现前通过；重点是“可回滚、可解释、可控成本”。_

- 映射链路：optimistic 是 ActionRun 的一个可追踪片段（Dynamic Trace）；最终必须收敛到一致状态。
- 事务边界：apply/confirm/rollback 均为同步事务；事务内禁 IO/await。
- 稳定标识：optimisticId 必须稳定、可复现，并能与 instance/txn/action 链路对齐。
- token 有界：必须定义合并/覆盖/清理规则，避免无限堆积（内存/诊断灾难）。
- 诊断：事件 Slim/可序列化；`diagnostics=off` 近零成本；ring buffer 有界。
- Dual kernels：契约必须跨 core/core-ng 一致；consumer 不直依赖 core-ng。
- Breaking changes：forward-only；如改变现有语义，必须写迁移说明（无兼容层/弃用期）。

### Gate Result (Pre-Implementation)

- PASS（依赖 088 的协调锚点；本 spec 固化协议边界与门槛）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- Baseline 语义：代码前后（before/after）
- envId：darwin-arm64.node20.chrome-headless（以实际采集机为准；before/after 必须一致）
- profile：default（交付）
- collect（before）：`pnpm perf collect -- --profile default --out specs/089-optimistic-protocol/perf/before.<sha>.<envId>.default.json`
- collect（after）：`pnpm perf collect -- --profile default --out specs/089-optimistic-protocol/perf/after.<sha|worktree>.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/089-optimistic-protocol/perf/before.<sha>.<envId>.default.json --after specs/089-optimistic-protocol/perf/after.<sha|worktree>.<envId>.default.json --out specs/089-optimistic-protocol/perf/diff.before.<sha>__after.<sha|worktree>.<envId>.default.json`
- Suites：至少覆盖 1 条 Node + 1 条 Browser（optimistic apply/rollback + notify；diagnostics off/on 对照）
- Failure Policy：`comparable=false` 禁止下硬结论；复测必须同 envId/profile/matrixHash

## Project Structure

### Documentation (this feature)

```text
specs/089-optimistic-protocol/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── README.md
│   └── schemas/
│       ├── optimistic-event.schema.json
│       └── optimistic-event-meta.schema.json
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Optimistic.ts (new public submodule)
└── internal/runtime/core/
   ├── OptimisticRuntime.ts (new)
   └── ... (wiring into ActionRuntime/StateTransaction/DebugSink)

packages/logix-react/
└── (可选) hooks/组件：暴露 optimistic 状态给 UI（尽量 Viewer）

packages/logix-devtools-react/
└── (optimistic timeline/markers; 关联 action run)

examples/logix/
└── src/scenarios/
   └── optimistic/ (new demo，用于验收与 perf workload)
```

**Structure Decision**:

- optimistic 协议必须与 088 的 ActionRun 合流（同一链路 id），避免并行真相源。
- 事件模型优先 Slim/可序列化；重 payload 通过 downgrade 机制裁剪。

## Complexity Tracking

无（若实现需要大文件/复杂协议，必须补齐拆解简报与门槛）
