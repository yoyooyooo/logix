---
title: 07 · EffectOp Pipeline 与 Platform Bridge 架构解构
status: draft
date: 2025-12-21
tags: ['EffectOp', 'Middleware', 'Platform', 'Architecture', 'Runtime']
---

# EffectOp Pipeline 与 Platform Bridge 架构解构

> 本文填补了运行时架构中关于 **"Output & Side Effects"** 的最后一块拼图，阐述了 Logix 如何通过 **EffectOp Pipeline** 这一通用总线实现业务逻辑与平台能力的解耦。

![EffectOp Pipeline Architecture](./assets/effectop-pipeline-arch.png)

## 1. 核心概念与设计哲学

在 Logix 体系中，“逻辑计算 (Computing)”是纯粹的、无副作用的；而“与真实世界交互 (Interaction)”则通过 **Reified Effect (具象化副作用)** 模式来实现。

### 1.1 EffectOp (具象化副作用)

**定义**：一个描述“我想做什么”的纯数据对象 (DTO)。
**本质**：**Instruction as Data**。
**结构**：

```typescript
interface EffectOp<T = any> {
  _tag: string // e.g., "Toast", "Navigate", "Fetch"
  payload: any // e.g., { message: "Hello" }
  context?: Record<string, any> // Trace Context, SpanId
}
```

**哲学**：业务逻辑不应该直接调用 `window.alert()` 或 `fetch()`，而应该 **Yield 一个 'Alert' Op**。这使得逻辑变得**可测试、可拦截、可观察**。

### 1.2 The Pipeline (副作用流水线)

**定义**：EffectOp 从产生到最终执行的生命周期通道。
**职责**：

- **Routing**: 将 Op 分发给正确的 Handler。
- **Interception**: 允许 Middleware 修改、阻断或 Mock Op。
- **Observation**: 允许 DebugSink 监听流量以绘制 Timeline。

---

## 2. Execution Pipeline (执行流水线)

整个过程分为 Origin、Kernel、Bridge 三个阶段：

### Phase 1: Origin (起源 - The Logic)

- **位置**：User Flow / Logic code。
- **动作**：`yield* $.op('Toast', 'Hi')`。
- **状态**：此时 Op 仅仅是一个内存中的 JS 对象，没有任何副作用发生。

### Phase 2: Kernel (内核 - The Pipeline)

- **位置**：Logix Runtime Kernel。
- **核心机制**：**Middleware Chain (洋葱模型)**。
- **环节**：
  1.  **Trace Context Injection**: 自动注入当前 `ProcessId`, `SpanId`，确保副作用可被追踪回源头。
  2.  **Global Interceptors**: 例如 `PermissionCheck` 或 `MockServer`。在这里，测试框架可以拦截所有 `RemoteCall` 并直接返回 Mock 数据，而业务逻辑对此一无所知。
  3.  **DebugSink Tap**: 流量镜像。DebugSink 从这里复制一份 Op 副本，发送给 Devtools 用于绘制 **Timeline View**。

### Phase 3: Platform Bridge (桥接 - The Effect)

- **位置**：Platform Adapter (`@logixjs/react`, `@logixjs/cli`).
- **动作**：**Handler Registry Lookup**。
- **实现**：
  - 在浏览器中：`Toast` Op 映射为 `AntDesign.message.success()`。
  - 在 CLI 中：`Toast` Op 映射为 `console.log()`。
  - 在测试中：`Toast` Op 映射为 `expect(op.payload).toBe(...)`。

---

## 3. 对 SDD 平台的赋能

如果说 Static IR 支撑了 SDD 平台的 **"Graph View (空间)"**，那么 EffectOp 就支撑了 **"Timeline View (时间)"**。

| 赋能领域                                 | 痛点                                   | Solution (EffectOp)                                                                                                         |
| :--------------------------------------- | :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Timeline Visualization**<br>(Studio)   | 只知道结果，不知道中间发生了什么动作   | **Reified Stream**: 平台通过 DebugSink 监听 Op 流，像剪辑软件一样绘制出精确的时间轴 ("0.5s HTTP Req -> 0.8s Toast")。       |
| **Interactive Mocking**<br>(Development) | 修改 API Mock 必须改代码或配置代理     | **Runtime Interceptor**: Studio 可以动态注入 Middleware，实时拦截特定的 Op 并修改其 Payload 或返回值，实现“无代码 Mock”。   |
| **Universal Logic**<br>(Portability)     | 业务逻辑绑定了具体的 UI 库 (Antd/MUI)  | **Abstract Interface**: 业务逻辑只发射抽象的 `Toast` Op，平台层可以随意切换 UI 实现 (Antd -> Native)，逻辑代码无需改动。    |
| **AI Safety**<br>(Sandboxing)            | AI 生成的代码可能执行危险操作 (rm -rf) | **Op Whitelist**: Sandbox 可以配置 Middleware 阻断所有未授权的 `FileSystem` 或 `Network` Op，确保 AI 代码在安全沙箱内运行。 |

---

## 4. 总结

EffectOp Pipeline 是 Logix Runtime 的 **"Output Bus" (输出总线)**。它通过将副作用**数据化**，赋予了平台极强的管控能力（拦截、观察、重放、替换），是实现 **"Full-Duplex Digital Twin" (全双工数字孪生)** 不可或缺的一环。
