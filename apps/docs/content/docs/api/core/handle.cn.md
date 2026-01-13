---
title: Handle（消费面）
description: 在 `.logic()` 内消费依赖的统一概念：ModuleHandle 与 ServiceHandle，以及封装取舍指南。
---

`Handle` 指的是：**在 `.logic()` 内消费一个依赖时拿到的“可用视图”**。它的目标不是“把所有东西统一成同一个接口”，而是提供一套稳定语言，指导你把能力沉淀成两种形态之一，并让消费方式尽量趋同。

在代码层，`@logixjs/core` 提供 `Logix.Handle` 子模块（也可用子路径 `@logixjs/core/Handle`）来承载这套概念与少量工具函数。

## 1) 两种 Handle（两种封装方向）

### 1.1 ModuleHandle（自定义 Module 的句柄）

当你写成自定义 Module（例如 `@logixjs/query` / `@logixjs/form` 的主线形态）时：

- 业务逻辑通过 `yield* $.use(OtherModule)` 拿到对方的 `ModuleHandle`；
- 基础能力固定为：`read/changes/dispatch/actions`；
- 领域模块通常会通过 handle extension（例如 `.controller.*`）提供更贴合业务的命令面。

适用场景（经验法则）：

- 你希望状态进入 Logix 的 state plane：可订阅、可调试、可回放、可被 imports/link 驱动；
- 你需要与事务/提交 meta（txnSeq 等）、selector/ReadQuery 生态紧密集成；
- 你希望把“外部数据源”变成 Logix 内的**第一等状态**（例如查询快照、表单快照）。

### 1.2 ServiceHandle（可注入 Service 的句柄）

当你写成可注入 Service（Tag + Layer）时：

- 业务逻辑通过 `yield* $.use(ServiceTag)` 拿到一个 Service 实例（这里把它视为 `ServiceHandle`）；
- 该实例的状态真理源通常在外部系统/三方库里，Logix 负责**读取/订阅/发出意图**，而不是把状态镜像进 module state；
- 推荐提供 `.controller` 作为命令面，使消费方式与 ModuleHandle 的“controller 心智”趋同。

适用场景（经验法则）：

- 外部系统本身就是真理源（router、websocket、native bridge 等），镜像进 Logix 会引入 tear/常驻订阅成本/双真相源；
- 你希望做到 “未消费时近零成本”（例如只有订阅时才启动监听）；
- 你想把“第三方库实例”通过 Layer 注入，保证多实例隔离与可 mock。

## 2) `.controller`：推荐的命令面收口

无论是 ModuleHandle 还是 ServiceHandle，都建议遵循同一条约定：

- **读/订阅**放在顶层（如 `read/getSnapshot/changes` 等）；
- **写/命令/意图**收口到 `handle.controller.*`（例如 `refresh()`、`submit()`、`push('/next')`）。

这样做的好处是：业务作者的调用心智更稳定；库作者也更容易把“动作语义（Action/Intent）”固化为可诊断/可回放的协议。

## 3) 如何选择：Module 还是 Service？

一句话决策树：

- 你要把它变成 Logix 内的“状态资产”（可回放、可 imports 驱动、能被 Devtools 解释）→ **做成 Module**；
- 你要把外部系统当作真理源，只希望 Logix 能读/订阅/发意图，并保持低成本与可替换 → **做成 Service（Tag + Layer）**；
- 你同时需要两者 → **Module + 可注入 Engine**（Module 负责状态面，Engine 负责外部接管点；参考 Query 的 `Engine.layer(...)` 模式）。
