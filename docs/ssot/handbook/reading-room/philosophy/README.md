# Logix Design Philosophy

> "The code is just a side effect of the intent."

本目录存放 Logix 项目的核心设计哲学、非技术性决策背景以及对“意图驱动 AI 编程”的深度思考。
这里的内容不一定是具体的 API 规范（Specs），而是支撑这些规范背后的 **Why** 与 **Values**。

## Essays

- [01-safeguarding-ai-maintainability.md](./01-safeguarding-ai-maintainability.md): 为什么我们需要严苛的 Spec 007？——论确定性与可解释性如何为 AI 生成代码的可维护性护航。
- [02-intent-first-and-crystallization.md](./02-intent-first-and-crystallization.md): 意图优先与结晶过程——软件开发是从模糊到精确的结晶，而非单向的翻译。
- [03-logic-first-ui-agnostic.md](./03-logic-first-ui-agnostic.md): 逻辑优先与 UI 无关——信号驱动架构如何实现灵魂与躯壳的解耦，赋能 AI 分而治之。
- [04-developer-sovereignty.md](./04-developer-sovereignty.md): 开发者主权——零锁定、随时逃逸与人机协作的双向尊重契约。
- [05-architecture-as-view.md](./05-architecture-as-view.md): 架构即视图与全双工——如何通过静态分析提取架构骨架，实现图与码的无损双向同步。
- [06-brave-forward-compatibility.md](./06-brave-forward-compatibility.md): 勇敢向前兼容——在 AI 时代，利用 AI 杠杆消除重构成本，追求架构的持续完美。
- [07-runtime-trinity-and-effect-native.md](./07-runtime-trinity-and-effect-native.md): 运行时三位一体与 Effect 原生——Module 是定义，Logic 是程序，Live 是执行。拥抱 Effect 强类型的物理法则。

## 对齐入口

- 原则层 ↔ 证据层对照：`../reviews/08-philosophy-alignment.md`
- 实现评估与改造路线图：`../reviews/README.md`（以及 `../reviews/99-roadmap-and-breaking-changes.md`）
- 规格裁决（What/Contract）：`docs/ssot/platform/**`、`docs/ssot/runtime/**`、`docs/specs/**`、`specs/**`
