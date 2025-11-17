# 1. 分层视角：我们在谈哪些「层」？

从上到下，可以粗略分为四层：

1. **概念层 (Conceptual Layer)**
   - 讨论的是「世界观」：
     - 什么是 Intent？什么是 UI / Logic / Module 三位一体？
     - 什么算“需求意图”、“开发意图”、“实现”？
   - 本文档属于这一层，是平台侧概念术语的最终解释权（SSoT）；运行时术语以 runtime SSoT 为准。

2. **模型与协议层 (Model & Protocol Layer)**
   - 讨论的是「结构化表达」：
     - IntentSpec / IntentRule / Asset Schema 长什么样？
     - Pattern、Blueprint、Module/Logic/Flow/结构化控制流在类型上的契约是什么？
  - 主要由下列文档承载：
     - `02-intent-layers.md` / `03-assets-and-schemas.md`
     - `.codex/skills/project-guide/references/runtime-logix/logix-core/*`（Module / Logic / Flow / 结构化控制流 / IntentRule）
     - `platform/README.md`（L0–L3 资产链路、平台视图）。

3. **实现层 (Implementation Layer)**
   - 讨论的是「具体代码」：
     - Effect-native 的 Logix Runtime；
     - 平台的 Parser / Codegen / Studio 交互；
     - 示例场景与 Pattern 示例。
   - 主要由：`packages/logix-*`（运行时实现）、`examples/logix`（场景与 Pattern）、`docs/specs/intent-driven-ai-coding/platform`（平台侧规划）承载。

4. **应用层 (Application Layer)**
   - 讨论的是「在真实项目里如何使用」：
     - 某个业务仓库如何接入 Logix；
     - 某条产品线如何沉淀 Pattern / IntentRule；
     - 团队如何运营资产。

后面所有术语，如果出现歧义，应优先以 **概念层 → 模型与协议层** 的定义为准，再回看实现与应用。
