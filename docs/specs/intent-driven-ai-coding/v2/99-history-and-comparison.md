---
title: v1 / v2 / v3 简史与对照
status: archived
version: v2
supersededBy: ../v3
---

> 目的：帮助阅读者快速理解 intent-driven-ai-coding 在 v1 → v2 → v3 过程中的关键演进，哪些概念已经废弃、哪些被继承，哪些仍在等待融合进 v3。  
> 事实源：当前一切正式规范以 `../v3` 为准；本文件和 `v1/`、`v2/` 其他文档只作为对照材料。

## 1. 三个版本的大致角色

- **v1**：  
  - 关注「意图 → 模式 → 模板」这一条主线；  
  - 更偏向“用结构化文档约束人类/LLM”的规划，运行时与执行引擎着墨较少；  
  - 对 Pattern/Intent 的分层和术语比较丰富，但与具体 Runtime 的连接较松散。

- **v2**：  
  - 引入「六层意图模型」与更完整的 Runtime 家族视角；  
  - 尝试把 Layout / View / Interaction / Behavior & Flow / Data & State / Code Structure 全部拆开管理；  
  - 提出了双运行时（Effect / 前端运行时）的整体蓝图，但在实际使用上暴露出“概念过多、落地成本高”的问题。

- **v3**：  
  - 以 `Logix Engine` + Effect Runtime 为统一逻辑内核，收敛前端 Runtime 形态；  
  - 认为 Intent / Flow / Runtime 应该尽量落在同一套 DSL / Engine 上，而不是在“层”上横向扩展；  
  - 更强调端到端的“双工同步”（Intent ↔ Code）与对真实业务仓库的可落地性。

## 2. 典型差异一览（简化版）

| 维度 | v1 | v2 | v3 |
| --- | --- | --- | --- |
| 核心关注 | 意图 + 模式 + 模板 | 六层 Intent 全景图 | Intent + Flow DSL + Logix Engine |
| Runtime 角色 | 松散提及 Effect/状态库 | 双 Runtime：Effect / frontend-kernel | 以 Logix + Effect 为 Runtime 家族中心 |
| 复杂度控制 | 主要依赖文档与 Pattern 约束 | 通过层级拆分控制概念，但有过度工程风险 | 通过 DSL/Engine 统一收敛，实现上简化、语义上增强 |

更细的差异在 `v2/02-intent-layers.md` 与 `../v3/01-overview.md` 中都有体现，本文件不重复展开。

## 3. 如何使用 v1/v2 文档

- 当你在思考「某个概念到底是 v3 新引入的，还是早期版本沿袭的？」时，可以：  
  - 去看 `v1/01-overview.md` / `v1/02-patterns-and-intents.md` 里的原始说法；  
  - 对比 `v2/02-intent-layers.md` 如何把这些概念拆得更细；  
  - 再回到 `../v3` 下的对应章节，看最终收敛到了哪些名词和边界。

- 当你想为 v3 引入新能力时，如果在 v1/v2 中找到类似思路：  
  - 优先在 `../v3` 中补充设计与契约；  
  - 然后在这里标注该能力“已在 v3 合并”，避免 v1/v2 再长出第二套规范。

## 4. 后续约定

- 不再向 v1/v2 补充新的规范性内容，只允许增加少量“对照/批注”性质的段落；  
- 任何对 Intent 模型、Flow DSL、Runtime 契约的调整，必须先在 `../v3` 目录下达成共识，再视情况在本文件中补一行“从 v1/v2 沿袭而来/已被取代”的说明。

