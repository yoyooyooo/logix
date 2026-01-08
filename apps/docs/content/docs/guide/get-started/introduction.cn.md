---
title: '介绍'
description: 欢迎来到 Logix —— Effect-Native 的前端状态与业务逻辑运行时。
---

欢迎来到 Logix。

Logix 是一个专为现代前端应用设计的 **Effect-Native 状态与业务逻辑运行时**。它深度集成了 **Effect** 生态系统，旨在解决复杂业务逻辑中的**异步编排**、**状态联动**和**类型安全**问题。

## 这些场景让你头疼吗？

> [!TIP]
> 如果以下任意一条击中你，Logix 可能正是你需要的。

1. **useEffect 竞态地狱**：快速切换 Tab，请求 A 的结果覆盖了请求 B，UI 闪烁混乱
2. **状态同步噩梦**：跨组件传递状态，prop drilling 层层嵌套，Context 一改全 re-render
3. **异步逻辑散落**：取消、重试、loading 状态分散在各处，bug 此起彼伏
4. **表单联动调试**：字段 A 变化触发 B 校验再触发 C 禁用...链条断在哪？DevTools 看不见

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
2. [教程：第一个业务流（可取消搜索）](../get-started/tutorial-first-app) —— 体验防抖、自动取消与错误收敛；
3. [教程：复杂列表查询](../get-started/tutorial-complex-list) —— 体验“多触发源合流 + 自动重置 + 竞态处理”的生产级写法；
4. [Modules & State](../essentials/modules-and-state) —— 系统地理解 Module / State / Action。

> [!TIP]
> 如果你做的是“多字段 + 校验 + 动态数组”等表单场景，不建议在 Get Started 里手写表单状态：
> 直接走 `@logixjs/form` 主线更快也更稳（从模型到性能边界都已固化）。
>
> - [Form 什么时候用](../../form/when-to-use)
> - [Form 快速开始](../../form/quick-start)

如果你对“为什么要这么设计”感兴趣，可以在完成上面三步后，继续阅读：

- [Thinking in Logix](../essentials/thinking-in-logix)
- [Flows & Effects](../essentials/flows-and-effects)
- [Effect 速成：只学你需要的 20%](../essentials/effect-basics)
