---
title: intent-driven-ai-coding · 总览
status: draft
version: 2
---

> 本目录记录“面向意图的 AI Coding 平台”的规划与演化：
> - 目标是在 IMD 组件库与 best-practice 仓库之上，构建一套以“意图”为中心的前端出码与运行时系统；
> - 让开发者/产品可以用线稿级的方式表达界面/交互/行为/数据/工程结构意图，由平台与 LLM 一起完成模式选择、Plan 生成、Flow/Effect 实现与代码落地。

## 原始诉求（梳理）

在本次讨论中，平台的核心诉求可以概括为：

1. **从“需求文本/口头沟通”到“可执行意图”**  
   - 面向未知需求，开发者/产品只需将需求转化为结构化的“意图线稿”，而不是立刻手写代码或调 UI 构建器。  
   - 这些意图线稿应覆盖前端开发的关键维度：布局、视图/组件、交互、行为流程、数据/状态、工程结构，以及横切的约束/质量。

2. **意图优先，模式/模板/代码退居其后**  
   - Intent/Pattern/Template/Plan/Flow 都只是承载意图的“载体”，而不是概念堆砌的目的本身；  
   - 平台先把意图层表达清楚，再用模式/模板/Plan 来实现这些意图；  
   - LLM 扮演“润色和补全线稿”的角色，而不是黑盒生成整页代码。

3. **避免历史低代码/无代码的陷阱**  
   - 不追求在平台里配置所有细节，而是：
     - 用少量高价值的交互/数据/行为“配方”（Pattern/Recipe）覆盖 80% 高频场景；
     - 对于复杂或边缘需求，允许随时“逃逸到代码”，并支持从代码反向提取意图；
   - 不再用一堆表单配置 event/data/state，而是优先用线稿 + 模式 + LLM 组合表达；
   - 平台要有“上限”：当开发者有清晰的工程结构意图时，仍能把这种复杂意图表达清楚并落地。

4. **以预览为中心的双视角原型工作台**  
   - 平台工作区以真实预览为中心：
     - 中间跑的是 React + Query + Store + Flow 的真实页面；
     - 左侧是 Intent/Use Case Outline；
     - 右侧是按意图层划分的编辑面板。  
   - 产品视角：通过拖区域、选模式、写自然语言、录交互等方式表达线稿意图；  
   - 技术视角：架构与前端可以从同一预览切换到 Pattern/Flow/Code Structure 视图，看到每个 UI/行为在代码/模式中的落点。

5. **Effect 驱动的行为层 + 录制/回放作为自证手段**  
   - 行为/流程意图通过 Flow DSL 与 `.flow.ts`（Effect 程序）落地：
     - FlowIntent 描述步骤链；
     - Flow DSL/AST 结构化表达；
     - Effect 负责运行时执行与质量约束（重试/超时/审计/日志/追踪）。  
   - Interaction 层的录制/回放不仅用于“看交互”，更是对整条 Flow/Effect 运行时的真实集成测试与压力测试：
     - 录制语义事件 + 状态快照 + Flow 执行轨迹；
     - 在受控沙箱中，用相同组件树 + 状态适配器 + Effect Env 重放；
     - 把这些脚本固化为 scenario，用于 CI 回归和运行时调试。

6. **与 IMD / best-practice 仓库深度结合**  
   - IMD 仓库提供 UI/Pro Pattern 与生成器能力；
   - best-practice 仓库提供 Code Structure、状态管理、service/adapter 等规范；
   - intent-driven 平台在这两者之上：
     - 将 Intent/Pattern/Template/Plan 与实际代码规范绑定；
     - 保证出码结构与团队既有规范一致；
     - 允许随着实践反馈迭代 Pattern/Template/Flow，而不推翻意图层资产。

7. **LLM 的定位：局部线稿润色器**  
   - 不期待 LLM 一次性生成完整应用，而是：
     - 读取 Intent/Use Case 的线稿；
     - 在特定意图层（Layout/View/Interaction/Behavior/Data/CodeStructure）提供“补全/建议/优化”；
     - 所有变更都要可视、可 diff、可回滚；
   - 这让平台可以“向 AI 借力”，但不丢失对意图和代码的掌控。

8. **Intent 的边界：表达“脑子里的意图”，不是换种格式写代码**  
   - Intent 要回答的是“我想达成什么业务/交互/信息结构”，而不是“具体调用哪个组件/API/放在哪个文件里写什么函数”；  
   - 每个字段都应偏向业务/产品决策（布局区域、用例、字段含义、流程步骤），工程实现细节（组件实现、Hook 名、文件路径）交给 Pattern/Template/Plan/代码层；  
   - Intent 更像需求/线稿的结构化载体，可以不完备，只要足以驱动模式选择和出码；实现细节随代码重构而变化时，Intent 不应频繁抖动。

## 目录结构与说明

目前规划按版本分为两个子目录：

- `v1/`：最初版本的规划与示例，偏资产视角（Intent/Pattern/Plan）与 PoC 探索；
- `v2/`：基于“六层意图模型”的重构版本，建议以后以 v2 为主阅读与演进。

`v2/` 主要文件：

- `01-overview.md`：意图分层与平台蓝图总览；
- `02-intent-layers.md`：六类意图（布局/视图/交互/行为/数据/工程结构 + 约束）的定义与 Schema 草图；
- `03-assets-and-schemas.md`：Intent/Pattern/Template/Plan/Flow/best-practice 与意图层的映射；
- `04-intent-to-code-example.md`：以订单管理列表为例的“从需求文本→意图线稿→IntentSpec→Pattern/Plan/Flow/Effect→代码骨架”的完整链路；
- `05-platform-ux.md`：平台界面与交互蓝图（Intent/Pattern/Flow/Code Studio，预览为中心，多角色多视图）；
- `06-intent-linking-and-replay.md`：意图层之间的关联模型与 Interaction 录制/回放机制。

`v2/design/` 下为各意图层的细化设计：

- `layout.md`：布局意图与网格线稿；
- `view-and-component.md`：视图/组件意图，与 UI Pattern 的关系；
- `interaction.md`：交互意图（事件与即时 UI 反馈）；
- `behavior-and-flow.md`：行为/流程意图，Flow DSL 与 Effect 运行时；
- `data-and-state.md`：数据/状态意图，与数据契约和状态管理规范的关系；
- `code-structure.md`：工程结构意图，模块/目录/文件出码规则；
- `constraints-and-quality.md`：约束与质量意图（性能/安全/兼容性/可观测性）。

这些文档共同构成了一个“意图优先、预览为中心、LLM 辅助、Effect 驱动行为层”的新一代前端出码平台蓝图。
