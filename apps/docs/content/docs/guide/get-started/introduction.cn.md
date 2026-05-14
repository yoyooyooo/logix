---
title: 介绍
description: 在 React 应用中使用 Logix 的最小模型。
---

Logix 把应用逻辑移到 Effect-native runtime。UI 组件不再承载长链路 workflow、依赖注入、重试和运行时诊断；组件只负责获取实例、读取窄切片、派发动作。

## 运行时形状

```text
Module       state schema、action schema、reducer、logic builder
Logic        绑定到一个 module 的 Effect 程序
Program      module 加 initial state、logics、imports、services 后的装配单元
Runtime      执行容器与控制面
React host   provider、实例获取、selector、dispatch
```

一个 Logix 应用通常有一个 root `Program`。React 挂载这个 program 的 `Runtime`。组件用 module tag 或 program 获取实例。

## 第一条边界

当逻辑包含持久状态、Effect、依赖注入、并发或诊断时，放进 Logix。只影响局部 UI 的状态，例如折叠开关、焦点、临时布局状态，继续留在 React。

## 下一步

读 [快速开始](/cn/docs/guide/get-started/quick-start)，再读 [Canonical spine](/cn/docs/guide/essentials/canonical-spine)。
