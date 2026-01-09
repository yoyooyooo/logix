# Implementation Plan: Full-Duplex Prelude（080 · Group Spec）

**Branch**: `080-full-duplex-prelude` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature group description from `specs/080-full-duplex-prelude/spec.md`

## Summary

本 spec 是 **总控（Spec Group）**：把“全双工前置”拆成可调度的成员 specs，并固化统一裁决：

- 单一真相源：源码锚点声明是权威；TrialRun/Spy 仅作证据与校验输入；
- 统一最小 IR：Static IR（Manifest/Artifacts/PortSpec/TypeIR）+ Dynamic Trace/Evidence；
- Platform-Grade 子集：可解析/可回写；子集外显式降级（Raw Mode）；
- 构建期能力 Node-only：Parser/Rewriter/Write-back 必须与 runtime 纯净隔离；
- 工具裁决：TS 解析用 `ts-morph`；需要 AST 辅助用 `swc`；Node-only 与前端尽可能用 `effect` 同构。

## Questions Digest（外部问题清单回灌）

来源：外部问题清单通过 `$speckit plan-from-questions` 贴入（本段只记录裁决，不记录全文）。

- Q011：M2（可回写闭环）是 M3（Slots/Spy）的硬性前置：在回写闭环成熟前，禁止引入“需要大规模自动回写/迁移”的语义特性推进策略。
- Q012：工具链安装体积/冷启动设预算：避免把 Node-only 重依赖带入浏览器构建；CLI 对不需要解析的子命令必须 lazy-load `ts-morph`；`logix --help` / 纯导出类命令应维持快速启动。
- Q013：严格禁止 `packages/logix-core` 依赖 `typescript/ts-morph/swc`（保持 runtime 纯净；build-time 能力只存在于 Node-only 包）。

## Deepening Notes（关键裁决）

- Decision: **M2 是 M3 的硬前置**：回写闭环（081/082/079/085）达标前，M3（Slots/Spy）只允许 report/手写探索，禁止引入“需要大规模自动回写/迁移”的推进策略（source: spec Clarifications AUTO）。
- Decision: Node-only 工具链与 runtime 严格隔离：`ts-morph/swc` 仅允许在 `packages/logix-anchor-engine`/`packages/logix-cli`，`packages/logix-core` 禁止依赖（source: spec Clarifications AUTO）。
- Decision: CLI 对不需要解析的命令必须 lazy-load `ts-morph`（保障 `logix --help` 冷启动预算；source: Q012）。
- Decision: 单一真相源：一切“自动补全”只能写回源码锚点字段；TrialRun/Spy 永远只是 evidence（source: spec + Q011）。

## Review Notes（078+ 方向复核）

- 依赖顺序合理：先补静态 IR 缺口（078/067/035），再进入回写闭环（081/082/079/085），消费侧（086）作为字段漂移的早期暴露面。
- `081` 的子集边界需“显式降级而非静默漏报”：明确只识别 `$.use(Tag)`；对子集外形态必须输出可枚举 reason codes，并在报告里给出可行动的迁移提示。
- `ServiceId` 规范化必须只有一个实现并全链路复用（078/079/084/085）：禁止 `toString()` 作为 ID；无法得到稳定 ID 时必须 fail-fast 或显式降级为 report-only（不得写入不可信 IR）。
- 触及 runtime/react/devtools 关键链路的成员 spec，必须在各自 `plan.md#Perf Evidence Plan` 固化可复现的 before/after/diff；`diagnostics=off` 默认近零成本。

## Technical Context

**Language/Version**: TypeScript（workspace：5.8.2；子包可能用 5.9.x；以 `package.json` 为准）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`（IR/TrialRun/Diagnostics/Manifest）、Node-only：`ts-morph`（Parser/Rewriter）、`swc`（AST 辅助，按需）  
**Storage**: N/A（本 group 不引入持久化；导出工件为 JSON 文件）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`；CLI/engine 以 Node 集成用例为主）  
**Target Platform**: Node.js 20+（构建期/CLI） + modern browsers（IR/证据的消费者：sandbox/devtools）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**: N/A（本 group 主要是工具链/导出/回写；触及 runtime 热路径的 perf evidence 由成员 specs 自己出证据）  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）、稳定锚点（去随机化）、事务窗口禁 IO、诊断输出 Slim 且可序列化、forward-only（无兼容层/无弃用期）

## Constitution Check（总控口径）

- **Docs-first & SSoT**：平台侧“全双工子集/锚点系统/统一最小 IR”以 `docs/ssot/platform/ir/00-codegen-and-parser.md` 等为基线；具体交付以 `specs/*` 为准，避免并行口径。
- **IR & anchors（单一事实源）**：任何自动补全/回写必须写回源码锚点字段；TrialRun/Spy 只能作为证据与对照输入。
- **Deterministic identity**：runId/instanceId/txnSeq/opSeq/serviceId 等必须稳定可复现；禁止随机/时间默认值作为主锚点来源。
- **Transaction boundary**：事务窗口禁 IO；所有导出/试跑/采集必须受控并可收束。
- **Diagnosability**：所有工件/报告必须 JSON-safe、Slim、可 diff；超限必须显式截断并可解释。
- **Forward-only evolution**：任何破坏性变化用迁移说明替代兼容层。

## Milestones（只定义顺序与门槛，不复制 member tasks）

> 具体验收以 member spec 的 SC/FR 为准；本节只定义“组内调度门槛”。

- **M0（证据硬门）**：005/016 达标：跨宿主证据/导出 JSON-hard-gate + 单一 instanceId 锚点与去随机化口径。
- **M1（结构可见）**：025/031/035/067/078 达标：平台可枚举 actions/servicePorts/ports&typeIr/artifacts，并在缺失/冲突时可解释定位。
- 备注：`085` 的 Phase 3（IR 导出 + TrialRun）可提前作为 M1 的验证跑道落地；`085` 的 Phase 4+（anchor index/autofill/write-back）仍计入 M2。
- **M2（可回写闭环）**：081/082/079/085 达标：
  - Parser 产出 AnchorIndex@v1（含缺口点 + reason codes）；
  - Rewriter 产出 PatchPlan@v1 并安全回写（最小 diff + 幂等 + 显式失败）；
  - Autofill 只补未声明且高置信度项（宁可漏不乱补，默认 `port=serviceId`）；
  - CLI 提供统一子命令作为集成测试跑道（report-only/write-back）。
- **M3（语义增强/证据增强，可选）**：083/084：slots 语义坑位与 loader spy 证据采集（均不得破坏“单一真相源”）。

> Guardrail（Q011）：M3 的任何“自动迁移/自动回写”诉求必须在 M2 达标后才允许进入实现；M2 之前 M3 仅允许手写/报告型探索，不得要求平台承担“填坑”义务。

## Perf Evidence Plan

N/A（本 group 本身不改 runtime 热路径）。  
若某个 member 触及核心路径：按其 `plan.md` 产出 `$logix-perf-evidence` 的 before/after/diff，并在 group checklist 里只检查“证据存在且可比”。

## Project Structure（本 group 的产物）

```text
specs/080-full-duplex-prelude/
├── spec.md
├── plan.md
├── quickstart.md
├── spec-registry.json
├── spec-registry.md
└── checklists/
    ├── requirements.md
    └── group.registry.md   # 由 $speckit group 生成（索引式执行清单）
```

## Source Code Structure（由成员 specs 落地，不在 group 内复制实现任务）

```text
packages/logix-core/               # runtime + IR/TrialRun/Manifest（保持纯净：不引入 ts-morph/swc）
packages/logix-anchor-engine/      # Node-only：Parser/Rewriter（081/082），使用 ts-morph（可选 swc）
packages/logix-cli/                # Node-only：CLI（085），串联 core + anchor-engine 的基础能力
packages/logix-sandbox/            # 浏览器侧消费者（IR/证据展示与验证）
packages/logix-devtools-react/     # Devtools UI 消费者（解释链路）
```

## Deliverables by Phase（组内推进方式）

- **Phase 0（registry）**：维护 members/依赖/Hard 标记（已完成：`spec-registry.*` + group checklist）。
- **Phase 1（plans）**：为 081/082/085 等 Node-only 基建补齐 `plan.md` 与契约 schema；并把 ts-morph/swc/effect 同构裁决写入计划与落点。
- **Phase 2（execution）**：按 group checklist 跳转到 member `tasks.md` 执行（本 group 不复制 tasks）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
