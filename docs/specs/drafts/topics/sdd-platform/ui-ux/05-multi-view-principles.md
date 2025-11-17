---
title: 05 · Unified Platform & Multi-View Principles
status: draft
version: 1.0 (Extracted from Platform Shapes)
---

> **目标**：在不拆成“两套平台”的前提下，让产品和开发都能在同一平台内“只看到自己该看的东西”，但共享一套 Spec/Intent/Blueprint/Code/Runtime 资产。

## 1. 一套工件，多种投影

**原则**：平台围绕“工件类型”组织模块，而不是围绕“角色”分裂成两套系统。

- **工件层次（单一事实源）**：
  - L0：FeatureSpec / ScenarioSpec / Story（需求层）；
  - L1：Blueprint / Intent（屏幕–模块–服务与交互拓扑）；
  - L2：Implementation Contract（Schema / Traits / IntentRule / JSON Definition）；
  - L3：Code & Runtime（TS/Effect 源码、RunResult/Alignment）。
- **视图层次（按角色变化）**：
  - **Product View**：对同一工件做抽象/自然语言投影，只暴露与需求表达相关的部分；
  - **Dev View**：展示技术细节（Schema/Traits/IntentRule/运行结果），并保持与 Product View 的锚点。

结果是：**数据只有一份，视图按角色切换**，避免“产品需求系统”和“开发配置系统”各自漂移。

## 2. Feature 页：产品主场 + 开发侧边栏

- **产品模式（默认）**：
  - 中心是一份 FeatureSpec/ScenarioSpec 文档 + Scenario 列表；
  - 每条 Scenario 旁只显示“是否已规划/是否有 Demo/是否通过验收”，不出现 Module/Traits/IntentRule 等技术词汇。
- **开发模式（在同一页面开启）**：
  - 右侧出现 Tech Panel：
    - Scenario ↔ Blueprint/Modules/Traits/Tests 的映射表；
    - 一键跳转到 IDE/仓库文件；
    - 最近一次 Sandbox/Alignment Run 的结果。

产品只用中间那份文档和简单状态灯；开发则把这同一份文档当作“从业务跳到代码的入口”。

## 3. Blueprint 视图：同一张图，不同粒度

- **产品看到**：
  - Screen/Route + Module/Service 的大块图形（类似信息架构图）；
  - 能做的事情只有“勾选范围（本迭代做/不做）”、“标记关键路径”。
- **开发/架构看到**：
  - 在同一图上叠加 Schema/Trait/IntentRule Overlay；
  - 可以钻取到字段级数据流、TraitGraph、LogicGraph；
  - 从任一节点跳转到 Module/traits/Logic 代码或测试。

Blueprint 只有一份；产品把它当“功能地图”，开发把它当“架构与实现的索引”。

## 4. Spec Studio：同一文档，两种侧边栏

- 中心区域永远是一份 Spec 文档（Feature/Scenario/Step）。
- **产品模式**：右侧侧边栏是 AI 帮忙拆 Story/补 Scenario/标风险；
- **开发模式**：右侧侧边栏变成技术映射：
  - “这段 Story 关联系统里的哪些模块/字段/测试”；
  - “相关 Scenario 最近一次运行的状态”；
  - “未覆盖的逻辑/测试空洞提示”。

这样开发在看代码或 Traits 时，随时可以跳回 Spec 文档；产品则不会被迫操作任何技术控件。

## 5. 导航与权限：按角色裁剪，而不是按模块复制

- **导航层**：
  - PM 登录：默认只露出 Spec Studio / Blueprint / Scenarios / Reports；
  - Dev 登录：可以看到 Intent/Definition、DevTools、Sandbox/Alignment 等更多入口。
- **权限层**：
  - Product View 对 Schema/Traits/IntentRule 只读，且用自然语言摘要；
  - Dev View 可以编辑这些工件，并触发出码/运行/对齐；
  - 所有改动都记录在同一条 SDD 链路上（Spec/Blueprint/Contract/Code 变化可追溯）。

## 6. 决策标准

当我们设计新的平台能力或视图时，可以用这几条问题自检：

1. 这个能力创造/修改的是哪一类工件（Spec/Blueprint/Contract/Code/Runtime）？
2. 对产品来说，是否可以只通过高层视图（文字/图形/状态灯）完成工作，而不需要理解任何技术字段？
3. 对开发来说，是否可以在同一平台内，从业务视图一路 drill-down 到代码/运行时，再 drill-back 回 Spec？
4. 是否避免为产品和开发各建一套平行的“需求/配置系统”，从而让 Intent/Spec 真正成为单一事实源？
