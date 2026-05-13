---
title: Deep dive
description: 把 Runtime、middleware、lifecycle 和领域 programs 读成同一个装配后的执行模型。
---

更深的 runtime 阅读可以从一个装配单元开始：

- module definitions
- logic declarations
- programs
- runtime construction
- lifecycle 和 middleware

## Runtime 视角

在运行时，一个装配切片通常可以读成：

- 一个 `Program`
- 一个 runtime 作用域环境
- 一组已安装的 logics 与 runtime 持有的职责

## Lifecycle 视角

初始化、后台工作和销毁继续属于 runtime 拥有的关注点。

## Middleware 视角

日志、diagnostics、effect interception 这类横切关注点继续留在 middleware 或 runtime 层。

## 领域 program

Form 和 Query 这类领域包仍然进入同一套 runtime 模型：

- 它们返回 programs
- 由 runtime 挂载
- 通过同一条 host route 被消费

## 说明

- Runtime 是执行容器
- Program 是装配单元
- middleware 和 lifecycle 挂在执行边界上，而不是组件树上

## 相关页面

- [Runtime](../../api/core/runtime)
- [Lifecycle and watchers](./lifecycle-and-watchers)
