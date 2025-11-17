---
title: SDD Platform · Topic Overview
status: draft
version: 2025-12-19
value: core
priority: next
related:
  - docs/specs/intent-driven-ai-coding/README.md
  - docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md
---

# SDD Platform · Topic Overview

> 定位：本 Topic 用于收敛“Spec-Driven Development（SDD）如何在 Logix 平台落地”的草案与路线图。
> 说明：平台/方法论的正式 SSoT 以 `docs/specs/intent-driven-ai-coding` 为准；本 Topic 更偏“可执行路线 + 产物形态 + 工程落点”。

## 文档列表（建议顺序）

- [00-overview.md](./00-overview.md): 总览与关键概念。
- [01-module-traits-integration.md](./01-module-traits-integration.md): Module/Trait 与 SDD 的主线整合点。
- [02-full-duplex-architecture.md](./02-full-duplex-architecture.md): Full‑Duplex（Studio ↔ Runtime）的端到端架构。
- [04-module-traits-sdd-roadmap.md](./04-module-traits-sdd-roadmap.md): 里程碑路线图与裁决点。
- [05-intent-pipeline.md](./05-intent-pipeline.md): Intent → IR/Code 的流水线草案。
- [06-dev-server-and-digital-twin.md](./06-dev-server-and-digital-twin.md): Dev Server 与 Digital Twin。
- [07-intent-compiler-and-json-definition.md](./07-intent-compiler-and-json-definition.md): Intent Compiler 与 JSON Definition。
- [08-alignment-lab-and-sandbox.md](./08-alignment-lab-and-sandbox.md): Alignment Lab / Sandbox 的角色与边界。
- [09-user-value-routes.md](./09-user-value-routes.md): 用户价值路线（从可用到可扩展）。
- [10-market-landscape.md](./10-market-landscape.md): 市场与竞品调研（支撑取舍）。
- [11-spec-to-code-mvp.md](./11-spec-to-code-mvp.md): Spec → Code 的 MVP 落地路径。
- [13-agentic-reversibility.md](./13-agentic-reversibility.md): 跨越 IR 与代码的语义鸿沟（Agent 作为编解码器）。
- [14-intent-rule-schema.md](./14-intent-rule-schema.md): Intent Rule 的 schema 形态草案。
- [15-module-runtime-reflection-loader.md](./15-module-runtime-reflection-loader.md): Module 等模块对象的运行时反射与 Loader Pattern（免 AST）。
- [16-unified-ir-value-chain.md](./16-unified-ir-value-chain.md): Unified IR Value Chain（从试运行到平台智能）。
- [17-project-governance-and-lean-context.md](./17-project-governance-and-lean-context.md): Project Governance & Lean Context Protocol（治理层与上下文工程）。
- [99-platform-shapes-and-interactions.backlog.md](./99-platform-shapes-and-interactions.backlog.md): 平台形态/交互 backlog（长期）。

## UI/UX 子目录

- `ui-ux/`：Spec Studio 等交互草案（从平台侧 UX 回推协议与锚点）。

## Playground 工程落点（apps）

- `apps/logix-galaxy-fe/`：Galaxy 前端（Vite + Logix Sandbox 空壳），用于承载 Studio/Playground 的交互试验与对齐回路。
  - 启动：`pnpm -C apps/logix-galaxy-fe dev`
- `apps/logix-galaxy-api/`：Galaxy 后端（从 `examples/effect-api/` 抄骨架），用于验证“平台生成/编排的 Effect API”在真实网络边界下的契约与可测性。
  - 启动：`pnpm -C apps/logix-galaxy-api dev`
