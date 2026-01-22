---
title: EffectOp Pipeline 与 Platform Bridge 教程 · 剧本集（从 0 到 1）
status: draft
version: 1
---

# EffectOp Pipeline 与 Platform Bridge 教程 · 剧本集（从 0 到 1）

> **定位**：本文是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 **EffectOp（指令即数据）**、**MiddlewareStack（洋葱模型）**、**Platform Bridge（依赖注入 + 运行边界）** 这条核心链路讲清楚，并给出“怎么加能力/怎么排障/怎么证明不漂移”的剧本。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/runtime/**`、`docs/ssot/platform/**`）。

## 0. 最短阅读路径（10–20 分钟先把 pipeline 看懂）

1. 长链路实现笔记（D 面）：`docs/ssot/handbook/reading-room/long-chain/long-chain-d-effect-plane.md`
2. 架构解构图文（impl-notes）：`docs/ssot/handbook/reading-room/impl-notes/07-effectop-pipeline-and-platform-bridge.md`
3. Runtime 侧 AOP/中间件契约：`docs/ssot/runtime/logix-core/impl/02-logic-middleware-and-aop.md`
4. 最短“可复现实证”（直接读测试）：
   - 核心语义：`packages/logix-core/test/EffectOp.Core.test.ts`
   - 观测中间件：`packages/logix-core/test/Middleware.DebugObserver.test.ts`
   - trait 集成：`packages/logix-core/test/StateTrait.EffectOpIntegration.test.ts`

## 1. 心智模型：EffectOp 是“可观测边界”，不是“另一套副作用系统”

### 1.1 EffectOp 的定义（当前实现口径）

EffectOp 是一次 Effect 执行的“边界包装”（observable boundary）：

- 它是 **纯数据 + Effect 本体** 的组合；
- Middleware 可以在边界处 **观测 / 包装 / 拒绝**；
- Debug/Devtools 只拿到 **Slim 投影**（不能携带闭包/DOM/循环引用）。

权威定义（实现事实源）：

- `packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`
- public re-export：`packages/logix-core/src/EffectOp.ts`

关键字段（你写平台/Devtools/测试时必须记住）：

- `id`：默认由 `instanceId + opSeq` 稳定派生（禁止时间/随机默认）
- `kind`：`action|flow|state|service|lifecycle|trait-*|devtools`（用于 UI 分类与策略门控）
- `name`：人类可读 label（例如 `action:dispatch`）
- `payload`：可选（**必须可被 Slim 投影**，否则会被裁剪/降级）
- `meta`：结构化上下文（`moduleId/instanceId/txnSeq/txnId/opSeq/linkId/...`）
- `effect`：真正执行的 Effect

### 1.2 两条硬约束：稳定标识 + Slim 可序列化

这条链路触及 Devtools/对比/回放，必须坚持：

1. **稳定标识去随机化**：`id/opSeq/linkId` 不得依赖 `Math.random/Date.now` 默认；
2. **Slim 可序列化**：进入 DebugSink/Evidence 的数据必须可序列化、可裁剪、可降级（不能把“运行时对象”当 payload 直接塞进去）。

相关实现锚点：

- id/opSeq：`packages/logix-core/src/internal/effect-op.ts`
- Slim 投影与降级：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`trace:effectop` 分支）

## 2. 从 0 到 1：EffectOp pipeline 的真实执行链路

把这条链路读成四段（每段职责互斥）：

1. **边界创建**：Runtime 把“关键操作”包装成 EffectOp（补齐 meta）。
2. **中间件组合**：MiddlewareStack 以洋葱模型包裹 Effect（outer→inner）。
3. **观测投影**：DebugObserver 把 EffectOp 投影为 `trace:effectop`（Slim）。
4. **最终执行**：运行 `op.effect`（或被 middleware 拒绝/短路）。

### 2.1 边界创建：`runOperation` 统一入口

Runtime 对关键边界（action dispatch、service call、trait converge、flow 等）都通过统一入口运行：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`（`makeRunOperation`）

它做的关键事（你排障时就盯这几条）：

- 从 Env 取 middlewareStack（`EffectOpMiddlewareTag`）；
- 自动补齐 meta：`moduleId/instanceId/runtimeLabel/txnSeq/txnId/opSeq`；
- 传播/生成 `linkId`（FiberRef 单一事实源）；
- 执行 `EffectOp.run(op, stack)`（空栈则直接跑 effect）。

### 2.2 一个具体例子：Action dispatch 如何进入 EffectOp

Action dispatch 并不是“直接 setState”，它会被包进一个 `kind='action'` 的 EffectOp：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`（`runDispatch` → `runOperation('action', 'action:dispatch', ...)`）

这也是为什么 Devtools 能拿到稳定的 `txnSeq/txnId/opSeq/linkId` 锚点：它们都在这个统一入口被补齐。

### 2.3 middleware stack：组合规则与 `linkId` 传播

组合规则（outer→inner）实现于：

- `packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`（`composeMiddleware` / `runWithMiddleware`）

关键机制：

- `currentLinkId` 是 FiberRef：链路内的多次边界操作共享同一个 `linkId`；
- `runWithMiddleware` 会确保最终运行时 `currentLinkId` 与 `op.meta.linkId` 一致（并且不允许隐式随机）。

### 2.4 DebugObserver：把 EffectOp 变成 Timeline 事件（且必须 Slim）

DebugObserver 不是“把 EffectOp 整个塞进事件流”，而是做 Slim 投影：

- `packages/logix-core/src/Middleware.ts`：`makeDebugObserver`（记录 `trace:effectop`）
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：按诊断档位投影/裁剪（light 不带 payload）

这也是为什么你在生产默认档位下看不到“巨量 payload”：它会被主动裁剪成可诊断的最小集合。

### 2.5 Platform Bridge：平台能力通过 Env 注入，不通过“硬编码 import”

当前实现里，Platform Bridge 的最小统一入口是一个服务 Tag：

- `packages/logix-core/src/internal/runtime/core/Platform.ts`（`Platform.Tag`）

Logix 的原则是：

- Runtime/业务逻辑不直接 import 某个平台实现；
- 平台能力（生命周期信号、宿主桥接等）通过 Layer 注入到 Env；
- EffectOp 只负责边界包装与观测，不承担“平台具体怎么做 IO”的决定（那是 platform/service 的职责）。

## 3. 剧本集（你要做什么 → 该怎么做）

### A1. 给 Runtime 加一条“守卫 middleware”（拒绝某类 op）

你要解决的典型问题：

- Sandbox/测试环境禁止某些 op（例如 file/network）；
- 生产环境禁止某些危险流程；
- 或者做“白名单 + 可解释拒绝”。

做法（口径）：

- 写一个 `EffectOp.Middleware`：对命中的 op 返回 `Effect.fail(EffectOp.makeOperationRejected(...))`（拒绝必须发生在 user code 执行前）
- 把它注入到 Runtime：`Runtime.make(root, { middleware: [guard, ...] })`

代码锚点：

- middleware 类型：`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`（`Middleware`/`OperationRejected`）
- Runtime 注入点：`packages/logix-core/src/Runtime.ts`（`options.middleware` → `EffectOpMiddlewareTag`）

### A2. 开启 Devtools 的 effectop timeline（零侵入）

你要解决的典型问题：

- “为什么触发了服务调用？是谁触发的？链路上有哪些边界 op？”

做法（口径）：

- `Runtime.make(...,{ devtools: true })` 会自动：\n  1) 把 DebugObserver append 到 middlewareStack；\n  2) 挂载 DevtoolsHub sink（聚合事件）。

代码锚点：

- 自动注入：`packages/logix-core/src/Runtime.ts`（`Middleware.withDebug(... observer ...)`）
- DebugObserver：`packages/logix-core/src/Middleware.ts`（`makeDebugObserver`）

### A3. 控制观测成本：对某些 op 禁用 observer（不禁用 guard）

你要解决的典型问题：

- 大 payload 的 op 不想进 timeline（或会触发大量裁剪/降级噪声）。

口径：

- 只能禁用“观测型能力”（observer/logger），不能禁用全局 guard；
- 使用 `op.meta.policy.disableObservers=true`（或在构造 op 时带上 policy）；
- DebugObserver 会 respect 这个 policy 直接跳过。

代码锚点：

- policy：`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`（`OperationPolicy`）
- respect：`packages/logix-core/src/Middleware.ts`（`if (op.meta?.policy?.disableObservers) ...`）

### A4. 我改了 meta 字段/diagnostics 档位，怎么证明没有把 payload 塞进热路径？

最短证据思路：

- DebugSink 对 `trace:effectop` 有专门的投影逻辑：light 档位默认丢 payload；
- 你要保证：diagnostics=off 时，middleware 不应引入额外开销；diagnostics=light 时也不应把 payload 塞满。

代码锚点：

- `trace:effectop` 投影/降级：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- diagnostics gating：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/Runtime.ts`

## 4. 代码锚点（Code Anchors）

- EffectOp public：`packages/logix-core/src/EffectOp.ts`
- EffectOp id/opSeq：`packages/logix-core/src/internal/effect-op.ts`
- Middleware helpers：`packages/logix-core/src/Middleware.ts`
- EffectOpCore（模型+组合）：`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`
- runOperation：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`
- action dispatch 示例：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- Platform 服务：`packages/logix-core/src/internal/runtime/core/Platform.ts`
- DebugSink 投影：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- Runtime 注入点：`packages/logix-core/src/Runtime.ts`

## 5. 验证方式（Evidence）

改动触及 EffectOp/Middleware/Platform 时，最短的“不会自欺”的证据路径：

- core 语义：`packages/logix-core/test/EffectOp.Core.test.ts`
- DebugObserver：`packages/logix-core/test/Middleware.DebugObserver.test.ts`
- runOperation 行为：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts` 的相关测试（通常会被 action/trait/service 流经覆盖）

## 6. 常见坑（Anti-patterns）

- 把闭包/DOM/循环引用对象塞进 `payload/meta` 并期待 Devtools “全量展示” → 正确做法是投影为 JsonValue 或在 DebugSink 侧做可控摘要。
- 用随机/时间生成 `id/linkId/opSeq` → 会破坏对比/回放与性能证据可比性。
- 把“业务语义”塞进 Platform Bridge（把平台实现当业务层）→ 会破坏可移植性与测试隔离。
- 以为 `disableObservers` 能禁用所有策略/守卫 → 它只能禁用观测型能力（observer/logger），不能绕过全局 guard。

