---
title: SDD Platform · Topic Overview
status: draft
version: 2025-12-19
value: core
priority: next
related:
  - docs/ssot/platform/README.md
  - docs/ssot/platform/foundation/02-glossary.md
---

# SDD Platform · Topic Overview

> 定位：本 Topic 收敛“Spec‑Driven Development（SDD）如何在 Logix 平台落地”的**草案与工程化路线**：我们不在这里重新定义平台 SSoT，而是把平台侧实现拆成可执行的文档模块，并确保所有模块共享同一套运行时物理口径与证据链契约。
>
> 上游口径（必读，SSoT）：
> - 最小系统方程与符号表（The One）：`docs/ssot/platform/foundation/01-the-one.md`
> - 运行时物理模型（系统方程/符号表）：`docs/ssot/platform/contracts/00-execution-model.md`
> - RunResult/Trace/Tape 契约（平台 Grounding）：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
> - 时间旅行交互（愿景/模式）：`docs/ssot/platform/contracts/02-time-travel.md`

## 按角色阅读（最短路径）

- 需求录入者（PM/架构师）：先看 `00-overview.md` → `ui-ux/03-spec-studio.md` → `ui-ux/05-multi-view-principles.md` → `11-spec-to-code-mvp.md`
- 架构师（裁决者）：在上面基础上补 `05-intent-pipeline.md` → `08-alignment-lab-and-sandbox.md`；远期方向可略读 `02-full-duplex-architecture.md`（先看 0 节）
- 开发（实施者）：先看 `11-spec-to-code-mvp.md` → `01-module-traits-integration.md` → `08-alignment-lab-and-sandbox.md`；远期方向可略读 `02-full-duplex-architecture.md`（先看 0 节）

## 你应该如何阅读（建议顺序）

### A. 核心闭环（必读，最小链路）

- [00-overview.md](./00-overview.md)：SDD 平台闭环与角色分工（从 Spec 到 RunResult 再回流）。
- [08-alignment-lab-and-sandbox.md](./08-alignment-lab-and-sandbox.md)：Sandbox/Alignment 的边界与验证闭环（以 RunResult 为唯一 Grounding）。
- [11-spec-to-code-mvp.md](./11-spec-to-code-mvp.md)：最小竖切（Spec → Code → Sandbox Run → Alignment）。

### A.1 远期方向（可选）

- [02-full-duplex-architecture.md](./02-full-duplex-architecture.md)：Code ↔ Studio ↔ Runtime 的全双工架构（远期方向；MVP 不交付；建议先读 0 节现实约束）。

### B. 资产与契约（让闭环可被编译/可被对齐）

- [01-module-traits-integration.md](./01-module-traits-integration.md)：Module Traits 在平台闭环中的定位（Static IR 的 `C_T` 侧）。
- [14-intent-rule-schema.md](./14-intent-rule-schema.md)：IntentRule（连线协议，Design‑time/Visual ↔ Codegen/Runtime 的桥）。
- [15-module-runtime-reflection-loader.md](./15-module-runtime-reflection-loader.md)：Loader Pattern（运行时反射提取结构，免 AST 的另一条路）。

### C. 工具链与路线图（实现落点与演进顺序）

- [05-intent-pipeline.md](./05-intent-pipeline.md)：Spec/Blueprint/Contract → IR/Code 的流水线（面向 Agent 的 Context Pack）。
- [07-intent-compiler-and-json-definition.md](./07-intent-compiler-and-json-definition.md)：（长期方向）Definition‑First / Intent Compiler（边界见 05）。
- [16-unified-ir-value-chain.md](./16-unified-ir-value-chain.md)：Unified IR Value Chain（把试运行产物提炼为平台智能的燃料）。
- [17-project-governance-and-lean-context.md](./17-project-governance-and-lean-context.md)：治理层与 Lean Context（多 Track 并行的生存法则）。
- [13-agentic-reversibility.md](./13-agentic-reversibility.md)：（长期方向）语义可逆：Agent 作为 Semantic Codec（与 Loader/Compiler 协同）。

### D. 产品与交互（UI/UX）

- `ui-ux/`：Spec Studio、语义 UI、协作流程等交互草案（所有“运行结果”一律通过 RunResult 口径回流）。

### E. 研究与 Backlog（不进入最小闭环）

- [10-market-landscape.md](./10-market-landscape.md)：市场/竞品调研（支撑取舍）。
- [99-platform-shapes-and-interactions.backlog.md](./99-platform-shapes-and-interactions.backlog.md)：形态/交互 backlog（长期）。

## 文档职责边界（Owner Map）

> 原则：每篇文档只拥有一个“主叙事/主契约”；其余内容一律引用上游 SSoT 或同主题的 owner 文档，避免并行真相源。

| 文档 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| `00-overview.md` | 平台闭环与角色分工 | 具体协议/schema 细节 |
| `02-full-duplex-architecture.md` | 远期：Code↔Studio↔Runtime 全双工架构 | MVP 交付与排期承诺 |
| `05-intent-pipeline.md` | Context Supply Chain + Artifact/Pack 边界 | UI 交互稿与具体页面设计 |
| `08-alignment-lab-and-sandbox.md` | Verify 回路与 Sandbox 边界 | 重述 RunResult/Tape 细节（引用 `docs/ssot/platform/contracts/01-runresult-trace-tape.md` 与 `specs/075-workflow-codegen-ir/contracts/tape.md`） |
| `11-spec-to-code-mvp.md` | MVP 竖切与验收路径 | 长期平台形态讨论 |
| `01-module-traits-integration.md` | Traits（`C_T`）在平台闭环的位置与治理 | 动态控制律（`Π`）设计 |
| `14-intent-rule-schema.md` | IntentRule（wiring 协议）草案 | RunResult/证据链口径（引用 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`） |
| `15-module-runtime-reflection-loader.md` | Loader Pattern（免 AST 的结构提取） | Studio UX 细节 |
| `17-project-governance-and-lean-context.md` | 多 Track 治理与 Lean Context | 具体 IR/Runtime 协议细节 |

## UI/UX 子目录

- `ui-ux/`：Spec Studio 等交互草案（从平台侧 UX 回推协议与锚点）。
  - 语义绑定协议（UI↔Logic）：`docs/specs/sdd-platform/workbench/ui-ux/12-logic-ui-binding.md`

## Playground 工程落点（apps）

- `apps/logix-galaxy-fe/`：Galaxy 前端（Vite + Logix Sandbox 空壳），用于承载 Studio/Playground 的交互试验与对齐回路。
  - 启动：`pnpm -C apps/logix-galaxy-fe dev`
- `apps/logix-galaxy-api/`：Galaxy 后端（从 `examples/effect-api/` 抄骨架），用于验证“平台生成/编排的 Effect API”在真实网络边界下的契约与可测性。
  - 启动：`pnpm -C apps/logix-galaxy-api dev`
