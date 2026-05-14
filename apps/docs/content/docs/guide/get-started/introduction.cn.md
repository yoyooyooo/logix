---
title: 介绍
description: Logix 是什么，以及它适合放在哪里。
---

Logix 是应用逻辑运行时。它用一个小对象模型组织 state、effects、services、React projection 与 evidence。

```text
React 负责 UI / host / render。
Logix 负责 declaration / composition / execution / evidence。
```

默认路线是：

1. 定义 `Module`。
2. 用 `Module.logic(id, ...)` 添加行为。
3. 装配 `Program`。
4. 创建 `Runtime`。
5. 用 `RuntimeProvider` 投影到 React。
6. 用 `useSelector(...)` 读取，用 dispatch 或领域 handle 写入。

## 为什么使用它

当一个功能有业务状态和副作用，并且需要稳定执行、可测试性与诊断时，使用 Logix。短生命周期、纯 UI 的 view state 仍可直接使用 React state。

## 第一组概念

| 概念 | 含义 |
| --- | --- |
| Module | Definition object：state schema、action map、reducers、logic builder。 |
| Logic | 挂在 Module 上的 Effect-based behavior。 |
| Program | 带 initial state、logics、services、imports 的装配后业务单元。 |
| Runtime | 执行容器。 |
| React host | 把 runtime 实例暴露给组件的 Provider + hooks。 |
| Evidence | check/trial/compare 产生的结构化报告。 |

## 下一步

- [快速开始](./quick-start)
- [Canonical spine](/cn/docs/guide/essentials/canonical-spine)
