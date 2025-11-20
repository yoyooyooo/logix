---
title: intent-flow · 项目架构与 specs 导航
status: draft
version: 0
---

> 本 reference 提供比 SKILL.md 更细的“项目架构 & specs 导航”，在需要深入理解某一层设计、或为新场景确定落点时加载。

## 1. 意图驱动平台蓝图

- 核心目标：在 IMD 组件库与 best-practice 仓库之上，构建以“意图”为中心的前端出码与运行时系统，让开发者/产品能用“线稿级意图”驱动 LLM/平台完成 Pattern 选择、Plan 生成与 Flow/Effect 实现。
- LLM 定位：局部线稿润色器，而非黑盒生成整页代码。模型负责在 Layout/View/Interaction/Behavior/Data/CodeStructure 某一层补全/优化，所有变更可视、可 diff、可回滚。
- 低代码陷阱规避：避免到处堆配置表单，而是用少量高价值 Pattern/Recipe 覆盖 80% 高频场景，对复杂长尾需求保留“逃逸到代码”与从代码反向提炼 Intent 的能力。

## 2. 六层 Intent 模型速记

- Layout Intent：页面区域划分与相对布局结构；
- View & Component Intent：区域内使用的 UI/Pro Pattern 与组件树；
- Interaction Intent：用户事件到即时 UI 反馈（打开/关闭/切换/高亮等）；
- Behavior & Flow Intent：跨组件/跨步骤的业务流程与服务调用链；
- Data & State Intent：数据结构与校验规则，状态来源与生命周期；
- Code Structure Intent：模块/目录/文件结构，出码路径与命名；
- Constraint & Quality Intent（横切）：性能、安全、可观测性等约束，附着在上述各层资产上。

## 3. specs 目录的使用策略

- `README.md`：从“原始诉求”角度说明平台要解决的问题，适合作为新成员/新 Claude 实例的第一站。
- `v2/01-overview.md`：转向“意图分层”视角，定义六层 Intent 与整体平台蓝图，是一切设计决策的锚点。
- `v2/02-intent-layers.md`：给出每类 Intent 的字段草稿与例子，用于设计新的 IntentSchema 或校验逻辑时参考。
- `v2/03-assets-and-schemas.md`：当需要判断“某个信息应该放在 Intent / Pattern / Template / Plan / Flow / best-practice 的哪一层”时使用。
- `v2/04-intent-to-code-example.md`：在对“从需求到代码”的全链路缺乏直觉时，先对照订单示例再开工。
- `v2/05-platform-ux.md`：涉及 Studio/CLI/LSP 交互设计时使用，确保运行时引擎能力可以被 UI 清晰消费。
- `v2/06-*.md`：与 Intent 关联/回放/可追踪性相关的设计，都应以此为 SSoT。
- `v2/design/*.md`：当某一层意图需要细化时，优先在对应 design 文档补充示例与反例，再决定如何改 schema/运行时。
- `v2/97-effect-runtime-and-flow-execution.md`：Effect 运行时的职责、Env/Layer 组织方式、Flow 执行与可观测性，都应以此为准。
- `v2/98-intent-boundaries-and-open-questions.md`：记录 Intent 边界的讨论与未决问题，扩展某层功能前先查此处。
- `v2/99-long-term-blueprint.md`：中长期演进路线，避免做与长远目标冲突的短线实现。

## 4. effect-poc 与 effect-runtime-poc 的协同

- `v2/effect-poc` 用于快速验证“某种 Flow/Env/Layer 写法是否合理”；可以偏工程化，但语义上必须贴近 v2 文档中定义的角色与边界。
- `packages/effect-runtime-poc` 是“逐步收敛后的运行时实现”，只有在在 effect-poc 或真实业务验证过的写法才迁入这里。
- 演进顺序：先在 docs/specs 中讨论并记录 → 在 effect-poc 中做 PoC → 若稳定，再抽象成 effect-runtime-poc 里的公共能力。

## 5. 推荐问题模板

当 Claude 需要做决策时，优先沿以下问题自问：

1. 当前需求属于哪几类 Intent？（Layout/View/Interaction/Behavior/Data/CodeStructure/Constraint）
2. 我要修改的是“意图表达”还是“运行时实现”？对应 specs/代码目录在哪里？
3. 这次修改会不会影响 schema/契约？需要同步到哪些文档（特别是 SCHEMA_EVOLUTION）？
4. 是否可以先在 effect-poc 中用最小 PoC 验证，再抽象到 effect-runtime-poc？
5. 完成后，有没有值得回写到 specs 的新经验或反例？

