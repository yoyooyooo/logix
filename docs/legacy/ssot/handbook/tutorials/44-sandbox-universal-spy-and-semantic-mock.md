---
title: Sandbox 教程 · Universal Spy / Semantic UI Mock / Alignment（从 0 到 1）
status: draft
version: 1
---

# Sandbox 教程 · Universal Spy / Semantic UI Mock / Alignment（从 0 到 1）

> **定位**：本文讲清楚 `@logixjs/sandbox` 为什么不是“代码 Runner”，而是 Runtime Alignment Lab 的基础设施；并把两个关键概念落到当前实现：  
> - **Universal Spy**：用 `emitSpy` 把外部依赖/SDK 调用降维为可观测 trace；  
> - **Semantic UI Mock**：用 `emitUiIntent` 把 UI 行为降维为 UI_INTENT + trace，成为 UI 层的 Executable Spec 载体。  
> **裁决来源**：术语与边界以 `docs/ssot/platform/foundation/glossary/04-platform-terms.md` 为准；本文补充“现状实现锚点 + 剧本集”。

## 0. 最短阅读路径（10 分钟上手）

1. 读术语裁决：`docs/ssot/platform/foundation/glossary/04-platform-terms.md#44-universal-spy--semantic-ui-mock`。  
2. 看当前实现桥：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`（`installSandboxBridge`）。  
3. 看数据模型：`packages/logix-sandbox/src/Types.ts`（`UiIntentPacket` / `RunResult` / `TraceSpan` / `MockManifest`）。  
4. 读「2.3 HTTP Mock」：理解当前 PoC 已落地的“可控外部世界”子集。

如果你想先从整体理解 Sandbox/Alignment Lab 的定位：先读 `docs/ssot/handbook/tutorials/05-sandbox-runtime-alignment-lab.md`。

## 1. 心智模型（Sandbox 在平台闭环里的角色）

### 1.1 Sandbox 的目标输出不是“程序返回值”，而是 RunResult（grounding）

Sandbox 的产物是 `RunResult`：

- `logs[]`：可回放的日志切片（来源 console/effect/logix）  
- `traces[]`：结构化 trace spans（包含 spy/ui-intent/http/logix-debug 等）  
- `uiIntents[]`：语义 UI 组件树（Semantic UI Mock 的输出）  
- （可选）`stateSnapshot`：受控快照（PoC）  

这使得平台可以回答：

- 运行发生了什么（trace）  
- 为什么发生（锚点/标签）  
- UI 行为是否对齐（uiIntents + 回传交互）  

### 1.2 Universal Spy / Semantic UI Mock 的共同点：把不可控世界降维成可观测协议

两者都遵守同一条原则：

- Worker 内不做复杂 UI/SDK 真实实现；  
- 统一把行为降维成“可序列化事件 + trace span”；  
- Host/Playground 再做渲染/对齐/回放。

## 2. 核心链路（从 0 到 1：bridge → trace → runResult）

### 2.1 Worker Bridge：`globalThis.logixSandboxBridge`（未来双工协议入口）

事实源：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`

Worker 会安装一个隐藏桥对象（同时挂载到 Symbol 与字符串属性）：

- `Symbol.for('@logixjs/sandbox/bridge')`
- `globalThis.logixSandboxBridge`

它暴露两个入口：

- `emitSpy(payload)`  
- `emitUiIntent(packet)`

这两个入口是“未来双工协议”的最小落点：避免 `__*` 魔法字段，且可在 Semantic Mock/Universal Spy 的各类实现里复用。

### 2.2 Universal Spy（当前实现形态）：`emitSpy(payload)` → `TRACE(kind='spy')`

事实源：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts` → `recordSpyTrace`

行为：

- `emitSpy(payload)` 会生成一个 trace span：  
  - `attributes.kind = 'spy'`  
  - span name 默认 `payload.name ?? 'spy'`  

注意：

- 当前实现是“桥接钩子 + trace 记录”，并未实现完整的递归 Proxy/Mock 行为。  
- 但它已经足以作为 Alignment Lab 的最低能力：把“黑盒依赖调用”显式打点并可在 RunResult 中观测。

### 2.3 HTTP Mock（当前已落地子集）：MockManifest.http → fetch proxy

事实源：

- `packages/logix-sandbox/src/Types.ts`：`MockManifest`/`HttpMockRule`
- `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`：`setupHttpProxy`

行为：

- Worker 在 RUN 前调用 `setupHttpProxy(currentMockManifest)`  
- 若命中 rule：返回 mock Response（可选 delayMs/status/json），并记录 `TRACE(kind='http', mode='mock')`  
- 若不命中：走真实 fetch，并记录 `TRACE(kind='http', mode='real')`

这提供了一个很关键的闭环：

- 外部世界（HTTP）变成“可控输入 + 可观测 trace”；  
- RunResult 能用于对齐与回放（至少在受控 HTTP 子集上）。

### 2.4 Semantic UI Mock（当前实现形态）：`emitUiIntent(packet)` → UI_INTENT + trace

事实源：

- `packages/logix-sandbox/src/Types.ts`：`UiIntentPacket`
- `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`：`recordUiIntentTrace`

行为：

- `emitUiIntent(packet)` 会：
  - 向 Host 发送 UI_INTENT 事件（供线框渲染）  
  - 同时记录 `TRACE(kind='ui-intent')`，span name 类似 `ui:<component>:<intent>`

这让 UI 行为成为“可执行规范的一部分”：

- 你不需要真实 DOM，但可以验证“有哪些交互、这些交互如何影响状态/触发逻辑”。

## 3. 剧本集（用例驱动：如何使用这些能力）

### 3.1 剧本 A：我有一个第三方 SDK 依赖，想在 Sandbox 里观测它做了什么

做法（最低闭环）：

- 在你封装 SDK 的适配层里调用：`globalThis.logixSandboxBridge.emitSpy({ name: 'sdk:xxx', ... })`  
- 在 Host 的 traces 面板里按 `kind='spy'` 过滤查看调用序列

收益：

- 即使 SDK 仍是黑盒，至少它不再是“静默黑盒”；  
- 你可以在对齐报告里指出“哪一步发生了外部调用”。

### 3.2 剧本 B：我想用 Semantic UI Mock 把交互也纳入证据链

做法：

- Worker 内用语义组件描述 UI（输出 UiIntentPacket 树），并通过 `emitUiIntent` 发给 Host  
- Host 渲染线框 UI，并把用户点击/输入回传 Worker（UiCallbackPayload，协议见 Types/Protocol）

收益：

- UI 交互成为可观测/可回放的事件流；  
- 对齐不再依赖“肉眼看 UI”，而是基于 UI_INTENT+trace 的结构证据。

### 3.3 剧本 C：我想让 Logix Debug 事件也进入 Sandbox traces

事实源：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts` → `resolveLogixDebugSink`

关键点：

- Sandbox 会把 `@logixjs/core` 的 Debug sinks 注入到 FiberRef.initial（因为 `Effect.runPromise` 会创建新 root fiber）。  
- 结果是：`trace:*` 的 Logix Debug 事件会被记录为 trace spans（kind='logix-debug'）。

这让 Sandbox 成为“统一观测底座”：HTTP/spy/ui-intent/logix-debug 进入同一条 traces 时间线。

## 4. 代码锚点（Code Anchors）

1. `docs/ssot/platform/foundation/glossary/04-platform-terms.md`：Universal Spy / Semantic UI Mock 的术语裁决。  
2. `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`：bridge/spy/ui-intent/http mock/logix debug sink 集成。  
3. `packages/logix-sandbox/src/Types.ts`：RunResult/TraceSpan/UiIntentPacket/MockManifest 数据模型。  
4. `packages/logix-sandbox/src/Protocol.ts`：Worker↔Host command/event 协议（compile/run/ui-intent 等）。  

## 5. 验证方式（Evidence）

最小验收建议：

- `emitSpy/emitUiIntent` 的 payload 必须可序列化（至少可 JSON.stringify）。  
- HTTP mock 命中与未命中都能产生 trace（mode=mock/real 可区分）。  
- Logix trace:* 事件在 sandbox 下能进入 traces（Debug sink 注入生效）。  

## 6. 常见坑（Anti-patterns）

- 把 Sandbox 当成“真实线上环境”：它是受控实验室，不是生产运行时。  
- spy/ui-intent payload 混入不可序列化对象：会导致 host 侧丢事件或无法存档。  
- 让 mock 行为 silent：没有 trace 就无法对齐与回放。  
