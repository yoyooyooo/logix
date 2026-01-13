---
title: Process
description: 带触发器/并发/错误策略元数据的长期运行程序，由 Runtime 统一安装与管理生命周期。
---

**Process** 是一个长期运行的程序（`Effect`），它会附带元数据，让 Runtime 能“识别并结构化管理”它的安装、触发、并发与错误策略。

典型用途：

- 启动后的后台工作（刷新、预热、订阅），
- “模块外”的编排逻辑（不应归属某一个模块），
- 跨模块协作（Link 本质上也是 Process）。

## `Process.make(definition, effect)`

```ts
import * as Logix from '@logixjs/core'
import { Effect } from 'effect'

const BootRefresh = Logix.Process.make('boot:refresh', Effect.void)
```

`definition` 既可以是：

- 字符串形式的 `processId`（快捷写法），也可以是
- 带 `processId` / `triggers` / `concurrency` / `errorPolicy` 等字段的对象。

仅传字符串时会使用默认策略（`runtime:boot` 触发，`concurrency: latest`，`errorPolicy: failStop`，`diagnosticsLevel: off`）。

## 如何安装 processes

常见方式：

- 在 Root `ModuleImpl` 上挂 `processes`（应用级 Runtime processes）；
- 在 React 中用 `useProcesses` 为某个 UI 子树安装一组稳定的 processes（作为可诊断的边界）。

## 延伸阅读

- [Guide: 跨模块协作](../../guide/learn/cross-module-communication)
- [API: Link](./link)
- [API: useProcesses](../react/use-processes)
- [/api-reference](/api-reference)
