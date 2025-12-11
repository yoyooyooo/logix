---
title: 07 · Intent Compiler 与 JSON Definition 分离
status: draft
version: 2025-12-12
value: vision
priority: later
related:
  - ../platform-vision/json-runtime-separation.md
---

# Intent Compiler 与 JSON Definition 分离

> 本文在 `sdd-platform` 视角下，吸收 `topics/platform-vision/json-runtime-separation.md` 的核心结论，作为平台终局形态的一部分：Intent 以 JSON Definition 为主事实源，代码作为 Effect Runtime 投影。

## 1. 双态分离：Design-Time JSON vs Run-Time Effect

- 设计态（Design-Time）：  
  - Studio 操作的是 JSON Blueprint：`module.def.json`，描述 Module id、state/intents、Trait/中间件等结构。  
  - 这一层与 SDD 的 Spec/Intent 资产直接对应，可以由 LLM 生成/编辑，也可以人手工维护。  
- 运行态（Run-Time）：  
  - 浏览器/服务器实际执行的是 TypeScript + Effect Program；  
  - 这些代码由 Intent Compiler（Logix CLI + LLM + Template）从 JSON 定义“注水”（Hydration）生成。

SDD 平台的长远目标是：**用户/Agent 主要操作 JSON/Intent 层，代码层可以随技术栈进化而再生。**

## 2. Intent Compiler 的职责

Intent Compiler 不只是“代码生成脚本”，而是平台中的一等公民：

- 输入：JSON Definition（Visual/Intent）、Pattern/Template 库、必要的 Prompt/Skill Pack；  
- 输出：Effect Runtime Code（Module/Logic/Flow 等），并自动挂上溯源元数据（来源 JSON 节点、Spec 段落等）；  
- 行为：支持静态模板（标准中间件等）与 AI 插槽（非标逻辑由 LLM 生成）混用。

这与 `00-overview.md` 中的 SDD Phase4（IMPLEMENT/Codegen Agent）对齐，只是把“Spec→Code”的映射进一步结构化为 JSON→Effect。

## 3. 渐进式增强与多层受众

基于 JSON Definition 的架构，自然支持三层使用模式：

- L0（No Code）：完全靠预设模板 + 画布拖拽生成 JSON；  
- L1（Low Code）：简单逻辑由 LLM 在 JSON 中补充 `ai.generate` 等描述，再由 Compiler 生成代码；  
- L2（Pro Code）：复杂逻辑由工程师手写 Effect 代码，挂载到 JSON 定义的插槽上（例如 Graph 节点对应的 handler）。

这三层对应平台不同受众：PM/配置工程师/高级开发者，但共享同一条 SDD 链路与 Intent 资产。

## 4. 与现有 SDD 主题的关系

- 与 `05-intent-pipeline.md`：Intent Pipeline 描述的是 “从 Requirement 到 Schema/Module” 的过程，本节描述的是 “从 JSON Definition 到 Effect Runtime”的编译过程；两者衔接处是 Module/Intent 的 JSON 表示。  
- 与 `02-full-duplex-architecture.md`：Full-Duplex 架构约束 Runtime/Studio 的双向锚点，本节补充的是“第三个端点”：JSON/Intent 层；平台最终需要在三者之间维护一致性。  
- 与 `topics/platform-vision/json-runtime-separation.md`：后者保留更多探索性细节和 thought experiment，本节只收录对当前 SDD 平台规划有直接约束的部分。

