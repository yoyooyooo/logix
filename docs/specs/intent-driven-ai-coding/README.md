# Intent-Driven AI Coding（SSoT）

本目录是 **Intent‑Driven AI Coding** 的核心规范与规划文档集合：用统一的 Intent 模型，把「业务需求 → 可执行逻辑 → 代码与运行时」串成可回放、可解释、可演进的链路。

> 裁决口径：概念与平台规范以本目录为准；运行时与类型语义以 `.codex/skills/project-guide/references/runtime-logix/**` 与 `packages/logix-*` 的真实导出为准。

## 最短阅读路径（新会话）

1. `01-overview.md`：总览 + 单一事实源（SSoT）优先级
2. `99-glossary-and-ssot.md`：平台概念与术语裁决（Platform Glossary SSoT）
3. `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md`：运行时术语裁决（Runtime Glossary SSoT）
4. `02-intent-layers.md`：UI / Logic / Module 三位一体模型
5. `03-assets-and-schemas.md`：核心资产（Intent/Pattern/IntentRule/Module）与映射
6. `06-codegen-and-parser.md`：可解析子集、锚点系统、IntentRule IR
7. `platform/README.md`：平台视角的 Universe / Galaxy / Studio / Playground 规划

## 文档组织（结构约定）

- **主规格（概念/协议/裁决）**：`00-*` / `01-*` / `02-*` / `03-*` / `04-*` / `06-*` / `97-*` / `98-*` / `99-*`
- `concepts/README.md`：方法论映射与概念补篇（例如 SDD 映射）
- `design/README.md`：关键子系统设计（Pattern、Playground 等）
- `logix-best-practices/README.md`：Logix 工程最佳实践（面向 examples dogfooding；未来可迁移到用户文档）
- `platform/README.md`：平台交互规划与实现备忘（含 `platform/impl/`）
- `examples/README.md`：示例/演练文档（对齐真实代码）
- `decisions/README.md`：决策记录、历史提炼、长期蓝图（不再维护版本分叉）

## 裁决矩阵（遇到分歧先查哪里）

| 你在争论/寻找什么 | 先查（SSoT） | 最终裁决/落点 |
| --- | --- | --- |
| 术语、边界、命名（平台/概念） | `99-glossary-and-ssot.md` | 先修概念层，再改其它文档/代码 |
| 术语、边界、命名（运行时） | `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md` | 先修 runtime SSoT，再改其它文档/代码 |
| 三位一体模型与 Intent 归属 | `02-intent-layers.md` | 与 `99-glossary-and-ssot.md` 对齐 |
| 资产结构与映射（Intent/Pattern/IntentRule/Module） | `03-assets-and-schemas.md`、`03-module-assets.md` | 规范收敛后再落代码 |
| Code ↔ IR ↔ 图（可解析子集、锚点、Parser/Codegen） | `06-codegen-and-parser.md` | 平台实现落点：`platform/impl/*` |
| 平台交互与视图体系（Universe/Galaxy/Studio/Playground） | `platform/README.md` | 需要实现细节时看 `platform/impl/*` |
| Runtime 编程模型（Module/Logic/`$`/Flow/事务与诊断） | `.codex/skills/project-guide/references/runtime-logix/logix-core/*` | 真实类型裁决：`packages/logix-core/src/index.ts` |
| 用户文档叙事/API 教程 | `apps/docs/content/docs/*` | 发现歧义回流修正 specs 与代码 |

## 放置规则（避免并行真相源）

- **未定稿探索**：放 `docs/specs/drafts/**`（Topic / Tiered 系统）
- **可交付特性**：放 `specs/<id>/*`（`spec.md` / `plan.md` / `tasks.md`）
- **历史与反思**：集中在 `decisions/`，以“提炼后的结论”形式保留（不再维护版本快照目录）
