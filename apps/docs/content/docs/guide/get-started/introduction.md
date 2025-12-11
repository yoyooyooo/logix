---
title: "介绍"
description: 欢迎来到 Logix —— Effect-Native 的前端状态与业务逻辑运行时。
---


欢迎来到 Logix。

Logix 是一个专为现代前端应用设计的 **Effect-Native 状态与业务逻辑运行时**。它深度集成了 **Effect** 生态系统，旨在解决复杂业务逻辑中的**异步编排**、**状态联动**和**类型安全**问题。

### 适合谁

- 有 React / Vue / 前端工程经验，希望找到比 `useState + useEffect` 更适合复杂业务的方案；
- 从未接触过 Effect / 函数式编程，也不想一上来就被大量新名词劝退。

### 前置知识

- 基本的 TypeScript 使用经验；
- 理解组件、状态、事件处理等前端基础概念。

### 读完你将获得

- 知道 Logix 想解决什么问题，以及它与 Redux / MobX 等框架的区别；
- 对 “Module / Logic / Runtime / Bound API `$`” 有一个直观印象；
- 清晰的下一步学习路径（应该先读哪些文档、跑哪个示例）。

## 为什么选择 Logix？

### 1. 意图优先 (Intent-First)

UI 组件只负责渲染和派发意图（Action），不再包含复杂的业务逻辑。

### 2. 响应式流 (Reactive Flows)

使用声明式的 Flow API 处理异步竞态、防抖、节流和状态联动。告别 `useEffect` 瀑布流。

### 3. 类型安全 (Type-Safe)

基于 `effect/Schema` 的强类型定义，从 API 到 UI，享受极致的自动补全和类型检查。

### 4. 模块化 (Modular)

将业务逻辑封装在独立的 Module 中，易于测试、复用和维护。

## 下一步：从哪里开始？

如果你想**最快速度跑起来一个 Demo**，推荐按下面顺序阅读：

1. [快速开始：第一个应用](../get-started/quick-start) —— 用不到 30 分钟跑通一个计数器；
2. [教程：第一个 Logix 表单](../get-started/tutorial-first-app) —— 体验字段联动与异步校验；
3. [Modules & State](../essentials/modules-and-state) —— 系统地理解 Module / State / Action。

如果你对“为什么要这么设计”感兴趣，可以在完成上面三步后，继续阅读：

- [Thinking in Logix](../essentials/thinking-in-logix)
- [Flows & Effects](../essentials/flows-and-effects)
- [Effect 速成：只学你需要的 20%](../essentials/effect-basics)
