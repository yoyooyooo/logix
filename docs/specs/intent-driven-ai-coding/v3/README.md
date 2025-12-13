---
title: v3 · 导航（SSoT 入口）
status: draft
version: 1
---

> 本目录是 intent-driven-ai-coding 的当前主线。遇到冲突时，优先以本目录与 runtime-logix 规范裁决。

## 最短阅读路径（新会话）

1. `01-overview.md`：总览 + SSoT 优先级
2. `99-glossary-and-ssot.md`：术语与概念裁决（Conceptual SSoT）
3. `02-intent-layers.md`：UI/Logic/Module 三位一体模型
4. `03-assets-and-schemas.md`：资产结构与映射（Intent/Pattern/IntentRule/Module）
5. `docs/specs/runtime-logix/core/02-module-and-logic-api.md`：Module-first 编程模型（对外 API）
6. `docs/specs/runtime-logix/core/03-logic-and-flow.md`：Bound API `$` + Fluent DSL（业务写法）

## 演进规则

- `EVOLUTION_POLICY.md`：允许 breaking，要求同步修正 SSoT 与用户文档。

## 其它常用入口

- `04-intent-to-code-example.md`：端到端示例（从需求到 Logix 代码）
- `06-codegen-and-parser.md`：Parser/Codegen 与白盒子集约束
- `97-effect-runtime-and-flow-execution.md`：运行时与 Flow 执行视角
- `roadmap-logix-platform.md`：阶段性路线图
- `implementation-status.md`：实施进度快照

## 裁决矩阵（遇到分歧先查哪里）

| 你在争论/寻找什么 | 先查（SSoT） | 最终裁决/落点 |
| --- | --- | --- |
| 术语、边界、命名（UI/Logic/Module、Pattern、IntentRule 等） | `99-glossary-and-ssot.md` | 先修概念层，再改其它文档/代码 |
| 三位一体模型与 Intent 归属 | `02-intent-layers.md` | 与 `99-glossary-and-ssot.md` 对齐 |
| 资产结构与映射（Intent/Pattern/IntentRule/Module） | `03-assets-and-schemas.md`、`03-module-assets.md` | 规范收敛后再落代码 |
| Logix 编程模型（Module-first、`Module.logic(($)=>...)`、`$`） | `docs/specs/runtime-logix/core/02-module-and-logic-api.md`、`docs/specs/runtime-logix/core/03-logic-and-flow.md` | `@logix/core` 类型与实现（`packages/logix-core/src`） |
| 运行时行为实现细节（Runtime 组装、middleware、debug） | `docs/specs/runtime-logix/core/*` + `docs/specs/runtime-logix/impl/*` | `packages/logix-core/src/internal/**`（必要时回写 core/ 规范） |
| 可复制的业务写法/场景范式 | `examples/logix/src/scenarios/*` | 若写法稳定则回写到 runtime-logix/core/examples 或 apps/docs |
| 用户文档叙事/API 教程 | `apps/docs/content/docs/*` | 发现歧义回流修正 specs 与代码 |
