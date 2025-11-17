---
title: 08 · Alignment Lab 与 Sandbox Runtime
status: draft
version: 2025-12-12
value: core
priority: next
related:
  - ../sandbox-runtime/mvp/README.md
---

# Alignment Lab 与 Sandbox Runtime

> 本文在 `sdd-platform` 视角下，吸收 `topics/sandbox-runtime/mvp/README.md` 中的 MVP 思路，解释 Sandbox/Playground 在 SDD 平台中的位置：它是 Runtime Alignment Lab 的前端实现之一。

## 1. 在 SDD 链路中的位置

从 SDD 的角度看，Sandbox Runtime 主要承载的是 “验证与回流” 段：

- 上游：SPECIFY/PLAN 阶段产生的 Spec/IntentRule/Module 图纸，经过 IMPLEMENT 阶段的 Codegen/实现，落地为可执行的 Logix/Effect 程序；  
- 中层：Sandbox 在浏览器 Worker 内运行这些程序，基于 Mock Env/Service 执行场景；  
- 下游：输出结构化的 RunResult（日志/Trace/StateSnapshot），为 Alignment Lab / AI Self-Correction 提供 Grounding。

`mvp/README.md` 中的省市区联动场景，就是这一链路的最小闭环样例。

## 2. Alignment Lab 的契约

为了让 Sandbox 成为 SDD 平台的一部分，而不是孤立的 Playground，需要对输出物做约束：

- RunResult 至少包含：  
  - EffectOp Timeline（Action/State/Service/Lifecycle 事件）；  
  - 每个 Step 后的 State Snapshot（按 Module 或 Page 聚合）；  
  - 错误/告警信息（包括 Phase Guard/Env 注入问题）。  
- Alignment Lab 消费 RunResult 时，需要能：  
  - 将 EffectOp 事件回溯到 IntentRule/LogicGraph 节点；  
  - 将 StateSnapshot 与 ScenarioSpec.Then / TraitGraph 预期对比；  
  - 输出 AlignmentReport（结构/行为/状态三维评分与差异）。

Sandbox 只负责 “如何在前端环境里稳定地产生 RunResult”，验证逻辑由 Alignment Lab/平台来承接。

## 3. 与 Module Traits / Devtools 的联动

- Module Traits：基于 `04-module-traits-sdd-roadmap.md` 中的约定，Sandbox 应当在 RunResult 中携带 StateTraitGraph/Program 或至少引用，以便 Alignment Lab/Devtools 可以在 Studio 中高亮字段能力拓扑。  
- Devtools & Studio：`devtools-and-studio` 主题中定义的 Runtime Tree/TagIndex/时间旅行能力，都可以复用 Sandbox 的事件流作为数据源，在 Alignment Lab 中叠加 “回放某次场景的完整运行”。

## 4. 实施落点

具体实现仍以 `topics/sandbox-runtime/mvp/README.md` 为事实源，本节只收敛平台级约束：  

- Sandbox API 必须暴露结构化 RunResult 与事件流，而不是只渲染 UI；  
- 对“模拟 Env / Mock 服务”的约定需与 SDD 平台共享（例如 MockManifest / ServiceTag Layer），避免测试与生产语义偏移；  
- Alignment Lab 需要把 RunResult 与上游 Spec/Intent/Traits/Code 统一编织，才能形成真正的 “Executable Spec” 体验。

