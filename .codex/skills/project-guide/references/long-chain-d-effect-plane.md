---
title: 长链路实现笔记 · D｜副作用总线（Effect Plane / EffectOp Pipeline）
status: draft
version: 1
---

# 长链路实现笔记 · D｜副作用总线（Effect Plane / EffectOp Pipeline）

> **主产物**：EffectOp（副作用指令的纯数据化）+ middleware stack（拦截/观测/替换）+ platform bridge（落地执行）。
>
> **一句话**：业务逻辑不直接碰 IO；它发射 Op，平台层决定怎么执行。

## 目录

- 1. 三跳入口（public → internal → tests）
- 2. EffectOp 的契约（为什么要“指令即数据”）
- 3. middleware stack（洋葱模型：注入/拦截/观测）
- 4. platform bridge（浏览器/React/CLI/测试）
- 5. 与观测/证据的关系（Slim 事件、可序列化）
- 6. auggie 查询模板

## 1) 三跳入口（public → internal → tests）

- **public**
  - `packages/logix-core/src/EffectOp.ts`
  - `packages/logix-core/src/Middleware.ts`（withDebug 等公共中间件装配）
- **internal**
  - `packages/logix-core/src/internal/runtime/EffectOpCore.ts`
  - `packages/logix-core/src/internal/runtime/core/Platform.ts`
  - devtools 自动注入 observer：`packages/logix-core/src/Runtime.ts`
- **tests**
  - 核心语义：`packages/logix-core/test/EffectOp.Core.test.ts`
  - trait 集成：`packages/logix-core/test/StateTrait.EffectOpIntegration.test.ts`
  - 观测中间件：`packages/logix-core/test/Middleware.DebugObserver.test.ts`

## 2) EffectOp 的契约（为什么要“指令即数据”）

EffectOp 的核心价值是“把副作用变成可治理对象”：

- 可测试：业务逻辑产出 Op，测试断言 Op（而不是断言 DOM/网络副作用发生没发生）。
- 可拦截：在 runtime 层统一做权限/Mock/Sandbox 白名单。
- 可观测：把 Op 流量喂给 DebugSink，形成 Timeline（时间轴）视图。
- 可移植：平台只需要实现 handler mapping（React/CLI/测试各一套），业务逻辑不改。

## 3) middleware stack（洋葱模型：注入/拦截/观测）

读 middleware 时保持一个最小心智模型：

- **输入**：Op（纯数据）+ 当前运行上下文（moduleId/instanceId/txn/span 等）
- **中间层**：可以拒绝/改写/短路/Mock，也可以“旁路复制一份”做观测
- **输出**：最终交给 platform handler 的“可执行 Op”

关键入口：

- `packages/logix-core/src/internal/runtime/EffectOpCore.ts`
- `packages/logix-core/src/Middleware.ts`（公共组装 helpers）

## 4) platform bridge（浏览器/React/CLI/测试）

platform bridge 的职责边界：

- 只负责把 Op 映射为真实世界 IO（UI/HTTP/导航/文件系统等）。
- 不应掺入业务语义（否则 Op 的可移植性失效）。

入口：

- `packages/logix-core/src/internal/runtime/core/Platform.ts`

## 5) 与观测/证据的关系（Slim 事件、可序列化）

EffectOp 非常容易把“不该进入证据/事件系统”的东西带进去（例如闭包、DOM 对象、循环引用）。

因此把两条当硬约束：

- 进入 Debug/Devtools 的 payload 必须 Slim 且可序列化（必要时投影/截断）。
- production 默认走 `off/light`，避免把 Op timeline 变成热路径负担。

观测面详解见：`long-chain-efg-observability-evidence-replay.md`。

## 6) auggie 查询模板

- “`EffectOpCore` 如何运行 middleware stack？拒绝/短路的错误语义是什么？”
- “devtools=true 时，`Runtime.make` 如何自动注入 DebugObserver？注入点在哪？”
- “platform handler registry 存在哪里？如何从 Op.kind 找到具体 handler？”
- “DebugObserver/DebugSink 如何把 Op 变成 timeline 事件？Slim 投影/截断在哪做？”
