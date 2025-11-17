# Implementation Plan: 015 Devtools Converge Performance Pane

**Branch**: `015-devtools-converge-performance` | **Date**: 2025-12-18 | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/015-devtools-converge-performance/spec.md`  
**Input**: Feature specification from `/specs/015-devtools-converge-performance/spec.md`

## Summary

为 converge 提供 Devtools 侧的性能深挖入口：多行时间轴（按模块实例分组，txn 级条形，决策/执行分段）+ Audits（稳定 ID，基于证据输出可操作建议与可复制代码片段）。所有输入只来自可序列化证据与统一观测管线；MVP 仅要求“内嵌面板 live + 离线导入”两种形态结论一致。

**Scheduling Note**:

- 015 属于 Devtools 交付面（组件/面板/插件），按当前节奏整体延后：先完成 `specs/016-serializable-diagnostics-and-identity` 的 core hardening（单锚点 + 可序列化诊断 + setup-only）再推进。
- 在 016 完成前，本 spec 不新增“横切整改”任务入口；任何涉及协议/锚点/降级/分档的改动统一通过 016 的 tasks 推进。

## Technical Context

**Language/Version**: TypeScript 5.x（pnpm workspace）  
**Primary Dependencies**: `@logix/devtools-react`、`@logix/core`、`effect` v3；依赖统一观测协议/聚合底座（Spec 005）  
**Storage**: N/A（内存聚合；离线证据包导入/导出由底座提供）  
**Testing**: Vitest（UI 回归 + 纯函数 Audits 测试）  
**Target Platform**: modern browsers（内嵌面板 + 离线导入）  
**Project Type**: monorepo（packages + apps + specs）  
**Performance Goals**: 常用交互（筛选/选择/缩放）在常规规模证据包下 200ms 内可见结果；高密度/大包进入可预测降级（目标与测量口径复用 005）  
**Constraints**: 面板展示与 Audits 不读取运行时内部状态；证据缺字段必须显式降级；排序必须确定性可复现（缺少全局排序键时退回实例内单调序号）  
**Scale/Scope**: 以 converge 证据为中心的单面板；不承担通用 Devtools 时间轴替代；不强制扩展面板实时一致性

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Intent → Flow/Logix → Code → Runtime**：本特性不改变 Runtime 行为；消费 Runtime 导出的证据事件并产出可解释的 Devtools 视图与行动建议，属于 Tooling 层。
- **Docs-first & SSoT**：依赖并遵守 runtime 调试事件 SSoT（`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`）与观测协议底座（`specs/005-unify-observability-protocol`）；converge 证据字段来自 converge 特性（013）。
- **Contracts**：本特性不修改 Runtime 对外协议；仅新增 Devtools 侧“审计输出/代码片段”的可序列化结构（在本 spec 的 `contracts/` 固化），便于回归测试与未来导出。
- **IR & anchors**：不引入第二套真相源；排序与窗口聚合遵守既有锚点/序号语义；缺失时必须降级并提示，不做补造。
- **Deterministic identity**：面板展示依赖稳定锚点（模块/实例/事务/事件序号）；缺少全局排序键时退回实例内单调序号，保证重放一致。
- **Transaction boundary**：不触及事务窗口；禁止在 Devtools 侧通过“执行器特判”影响 Runtime 行为。
- **Performance budget**：主要风险在 UI 渲染/聚合开销与“观察者效应”；复用 005 的 Worker-first/降级策略与目标口径；本特性只加 converge 维度的 lane/标记与审计规则。
- **Diagnosability & explainability**：Audits 输入必须可解释（证据字段 -> 命中 -> 建议），并在证据不足时明确降级；建议输出必须可序列化、可分享。
- **Breaking changes**：无公共 API 破坏；如未来需要调整审计结构或建议文案，以本特性 contracts 与用户文档为迁移口径。
- **Quality gates**：合并前至少通过 typecheck/lint/test；并对 “证据不足降级/排序确定性/两宿主一致性” 做回归用例。

## Project Structure

### Documentation (this feature)

```text
specs/015-devtools-converge-performance/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   └── schemas/
│       ├── converge-audit-finding.schema.json
│       └── converge-action-snippet.schema.json
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-devtools-react/
└── src/                     # converge pane 与 audits/timeline 视图（本特性实现落点）

specs/005-unify-observability-protocol/
└── ...                      # 统一观测协议/聚合/时间轴引擎（本特性依赖底座）

specs/013-auto-converge-planner/
└── contracts/               # converge evidence schema（本特性输入契约）

.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md
```

**Structure Decision**: 015 只实现 converge pane 与 Audits，所有数据源/导入/排序/聚合能力依赖 005；所有事件语义与分档依赖 09-debugging；所有 converge 证据字段依赖 013。

## Phase 0 - Outline & Research

输出：`research.md`

- 决定 converge 事件识别与抽取策略（只依赖可序列化证据）。
- 决定排序与窗口聚合的“确定性降级”规则（缺失全局排序键时退回实例内单调序号）。
- 决定 Audits 的最小输出结构（可序列化、稳定 ID、证据不足降级）。

## Phase 1 - Design & Contracts

输出：`data-model.md`、`contracts/`、`quickstart.md`

- 固化 Devtools 侧数据模型（TxnRow/Lane/Audit/Finding/Snippet）。
- 固化 Audits 输出与代码片段的 schema（便于回归测试与证据包导出）。
- 固化 quickstart：如何用一份证据包验证“时间轴可用 + 至少一条建议可复制 + 降级不误导 + 两宿主一致”。

## Phase 1 - Constitution Re-check (Post-Design)

- contracts 与 data-model 已固化，且无 Runtime 协议破坏。
- 降级/排序确定性规则明确，可被回归测试覆盖。
