# Implementation Plan: 087 Async Coordination Roadmap（总控：拆分与调度）

**Branch**: `087-async-coordination-roadmap` | **Date**: 2026-01-10 | **Spec**: `specs/087-async-coordination-roadmap/spec.md`  
**Input**: Feature specification from `specs/087-async-coordination-roadmap/spec.md`

## Summary

本 plan 的交付是“总控入口”而不是实现细节：把 Async 协调缺口拆分为互斥 member specs，并提供 registry + group checklist，保证后续实现可并行推进、可验收、可回写证据且不产生并行真相源。

## Deepening Notes

- Decision: 成员 spec 的实施前门槛包含 `data-model.md` 与 `contracts/README.md`（允许 N/A 但必须有原因与替代门槛）（source: `specs/087-async-coordination-roadmap/spec.md` Clarifications）
- Decision: 087 只做索引与门槛归纳，不复制成员实现任务/协议细节（source: `specs/087-async-coordination-roadmap/spec.md` Clarifications）

## Review Notes（078+ 方向复核）

- 依赖顺序正确：`088` 作为统一协调面先落地（稳定锚点/事件/取消语义），`089/090/091` 只在其上扩展；`092` 再把 action→txn→notify→commit 串成可回归链路。
- 成员 spec 禁止“另起一套 pending/标识/事件模型”：所有新协议必须能降解到统一最小 IR（Dynamic Trace）并复用稳定锚点（`instanceId/txnSeq/opSeq/linkId`）。
- 触及 runtime/react/devtools 关键链路的成员 spec，`plan.md#Perf Evidence Plan` 必须给出可复现的 Node + Browser before/after/diff；`diagnostics=off` 默认近零成本。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、`@logixjs/react`、`@logixjs/devtools-react`、`@logixjs/query`  
**Storage**: N/A（本 group 仅文档；成员 spec 的证据落盘到各自 `specs/<id>/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`；React/Browser 用 Vitest browser）  
**Target Platform**: Node.js 20+ + modern browsers（headless）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**: N/A（总控 spec 不触及核心路径；门槛由各 member spec 的 `plan.md#Perf Evidence Plan` 定义）  
**Constraints**: 单一事实源（registry json）、forward-only、成员 spec 必须对齐性能与可诊断性宪法门禁  
**Scale/Scope**: 5 个 member specs（088–092），按依赖分 3 个里程碑推进（见 `spec-registry.md`）

## Constitution Check

_GATE: 本 group spec 本身不改代码，但必须固化“成员 spec 的硬门槛”，并提供可执行的调度入口。_

- Intent → Flow/Logix → Code → Runtime：本 group 只负责把“协调能力”拆成可交付的 Flow/Runtime/React/Devtools 变更单元（各 member），避免直接在业务里手写协同。
- SSoT：关系事实源以 `spec-registry.json` 为准；`spec-registry.md` 仅解释，不新增关系信息。
- 合同/协议：本 group 不定义新的运行时契约，但要求每个 member 若引入/改变契约，必须同步更新 runtime SSoT（`docs/ssot/runtime/**`）与用户文档（`apps/docs`）。
- IR/锚点/稳定标识：本 group 要求 member specs 一律对齐稳定锚点（`instanceId/txnSeq/opSeq/linkId`）与统一最小 IR（Static IR + Dynamic Trace）。
- 事务边界：member specs 必须显式遵守“事务窗口禁止 IO/async”，并提供诊断/证据链路解释异步分段（pending → IO → writeback）。
- React 无 tearing：member specs 若触及 React 或外部源接入，必须以“单一快照锚点”保证同一 commit 读取一致（参照 073 的 Tick/RuntimeStore 约束）。
- 证据门禁：触及核心路径的 member specs 必须提供 `$logix-perf-evidence` 的 Node + Browser 证据；`diagnostics=off` 近零成本。
- Breaking changes：forward-only；如引入 breaking change，必须写迁移说明（不提供兼容层/弃用期）。

### Gate Result

- PASS（本 group 不引入代码层复杂度；仅固化调度与门槛；后续由 member specs 承担代码与证据）

## Perf Evidence Plan（MUST）

- N/A（总控 spec 仅文档与调度入口）
- 约束：每个 member spec 的 `plan.md` 必须填写 Perf Evidence Plan；group checklist 必须能链接到各 member 的 perf 产物目录（若已产出）

## Project Structure

### Documentation (this feature)

```text
specs/087-async-coordination-roadmap/
├── spec.md
├── plan.md
├── spec-registry.json        # SSoT: members/deps/status
├── spec-registry.md          # 人读阐述（不承载关系 SSoT）
├── checklists/
│   ├── requirements.md       # spec 质量门（本 spec）
│   └── group.registry.md     # group 执行清单（脚本生成，index-only）
├── research.md               # 关键裁决与替代方案摘要
├── quickstart.md             # 如何刷新 checklist / 汇总进度
└── tasks.md                  # 调度型 tasks（禁止复制 member 实现任务）
```

### Source Code (repository root)

本 group spec 不直接改代码；代码落点由 member specs 的 `plan.md#Project Structure` 定义。预期涉及的包范围（仅导航，不作为实现承诺）：

```text
packages/logix-core/
packages/logix-react/
packages/logix-devtools-react/
packages/logix-query/
apps/docs/
examples/logix/ (用于可复现实例/验收场景)
```

**Structure Decision**:

- 使用 Spec Group 模式（registry + checklist）作为单入口；实现细节不在 087 聚合，避免并行真相源。

## Complexity Tracking

无（文档与索引交付，不引入宪法违例；后续复杂度由成员 specs 各自承担并在各自 plan.md 记录）
