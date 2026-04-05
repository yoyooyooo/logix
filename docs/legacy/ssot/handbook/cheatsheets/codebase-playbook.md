---
title: 源码导航压缩包（project-guide）
status: draft
version: 1
---

# 源码导航压缩包（project-guide）

> 目标：让 LLM/维护者用最少 token，在**源码层**快速定位「入口 → 内核 → 回归（测试/示例）」；并知道该先看 SSoT 还是先看实现。

## 0. 使用方式（建议顺序）

1. **先定裁决层**：概念/术语 → `docs/ssot/platform`；Runtime 契约/口径 → `docs/ssot/runtime`；实现 → `packages/logix-*`。
2. **先看公共出口**：`packages/logix-core/src/index.ts`（导出即裁决点）。
3. **按“链路三跳”下钻**：入口（public）→ `src/internal/**`（实现）→ `test/**`（回归/语义边界）。
4. **优先用 auggie 命中文档/入口，再用 rg 补齐细节**：auggie 先给“路径+符号列表”，避免大段贴代码。
5. **遇到漂移先修索引**：本文件是“源码导航 SSoT”，当入口/内核迁移时，优先更新这里的落点与链路。

## 1. 一页入口清单（先开这几个文件）

### 1.1 `@logixjs/core`

- 公共导出裁决：`packages/logix-core/src/index.ts`
- Module/Logic/Bound/Runtime（入口）：`packages/logix-core/src/Module.ts`、`packages/logix-core/src/Logic.ts`、`packages/logix-core/src/Bound.ts`、`packages/logix-core/src/Runtime.ts`
- 实现内核（Runtime）：`packages/logix-core/src/internal/runtime/**`（深核：`packages/logix-core/src/internal/runtime/core/**`）
- 状态 Trait（Static IR + Converge）：`packages/logix-core/src/StateTrait.ts`、`packages/logix-core/src/internal/state-trait/**`
- EffectOp（可组合中间件）：`packages/logix-core/src/EffectOp.ts`、`packages/logix-core/src/internal/runtime/EffectOpCore.ts`、`packages/logix-core/src/Middleware.ts`
- Link/Replay/Resource：`packages/logix-core/src/Link.ts`、`packages/logix-core/src/Resource.ts`、`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
- Debug/Devtools：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

### 1.2 `@logixjs/react`

- Provider：`packages/logix-react/src/components/RuntimeProvider.tsx`
- hooks：`packages/logix-react/src/hooks/useModule.ts`、`packages/logix-react/src/hooks/useSelector.ts`、`packages/logix-react/src/hooks/useDispatch.ts`
- 内部实现：`packages/logix-react/src/internal/ModuleCache.ts`、`packages/logix-react/src/internal/ModuleRuntimeExternalStore.ts`

### 1.3 `@logixjs/devtools-react`

- UI 入口：`packages/logix-devtools-react/src/index.tsx`
- 快照/时间旅行：`packages/logix-devtools-react/src/snapshot.ts`、`packages/logix-devtools-react/src/state/runtime.ts`

### 1.4 `@logixjs/sandbox`

- 协议与 types：`packages/logix-sandbox/src/protocol.ts`、`packages/logix-sandbox/src/types.ts`
- Compiler/Client/Worker：`packages/logix-sandbox/src/compiler.ts`、`packages/logix-sandbox/src/client.ts`、`packages/logix-sandbox/src/worker/sandbox.worker.ts`

### 1.5 `@logixjs/test`

- API：`packages/logix-test/src/index.ts`、`packages/logix-test/src/api/TestProgram.ts`
- Runtime：`packages/logix-test/src/runtime/TestRuntime.ts`

### 1.6 Domain packages（非 Runtime SSoT）

> 这些是“用 Logix 写业务”的领域包；契约口径仍以 Runtime SSoT 为准，领域层只沉淀用法与可复用 Pattern。

- Form：`packages/form/src/index.ts`、`packages/form/src/form.ts`、`packages/form/src/logics/install.ts`
- Query：`packages/query/src/index.ts`、`packages/query/src/query.ts`、`packages/query/src/query-client.ts`

## 2. 核心链路索引（入口 → 内核 → 回归）

> 约定：每条链路都给出“最短三跳”。需要按维度建立广度脉络时，从 `docs/ssot/handbook/cheatsheets/long-chain/long-chain-index.md` 进入。

### 2.1 从定义到跑起来：ModuleDef → ModuleImpl → Runtime.make

- 入口：`packages/logix-core/src/Module.ts`（`Logix.Module.make` / `ModuleDef.logic` / `ModuleDef.implement`）、`packages/logix-core/src/Runtime.ts`（`Runtime.make`）
- 内核：`packages/logix-core/src/internal/runtime/AppRuntime.ts`（`makeApp` / `validateTags` / `TagCollisionError`）、`packages/logix-core/src/internal/runtime/ModuleFactory.ts`
- 回归：`packages/logix-core/test/Runtime.test.ts`、`packages/logix-core/test/AppRuntime.test.ts`、`packages/logix-core/test/ModuleImpl.test.ts`

### 2.2 Bound API `$` / Fluent DSL（写法 → 注入 → phase guard）

- 入口：`packages/logix-core/src/Bound.ts`
- 内核：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`、`packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`（`logic::invalid_phase`）
- 回归：`packages/logix-core/test/Bound.test.ts`、`packages/logix-core/test/BoundApi.MissingImport.test.ts`

### 2.3 事务窗口：dispatch → txn → commit（单次可见性）

- 入口：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（dispatch/队列/事务驱动）
- 内核：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（draft/commit）、`packages/logix-core/src/internal/state-trait/converge.ts`
- 回归：`packages/logix-core/test/Runtime.OperationSemantics.test.ts`、`packages/logix-core/test/StateTrait.RuntimeIntegration.test.ts`

### 2.4 StateTrait：Static IR → plan → converge（依赖/预算/降级）

- 入口：`packages/logix-core/src/StateTrait.ts`
- 内核：`packages/logix-core/src/internal/state-trait/ir.ts`、`packages/logix-core/src/internal/state-trait/plan.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`
- 回归：`packages/logix-core/test/StateTrait.StaticIr.test.ts`、`packages/logix-core/test/StateTrait.ConvergeBudgetConfig.test.ts`、`packages/logix-core/test/StateTrait.ConvergeDirtySet.test.ts`

### 2.5 EffectOp middleware：Operation → MiddlewareStack → trace

- 入口：`packages/logix-core/src/EffectOp.ts`（`EffectOp.run` / `composeMiddleware`）
- 内核：`packages/logix-core/src/internal/runtime/EffectOpCore.ts`（`OperationRejected` / `MiddlewareStack`）、`packages/logix-core/src/Middleware.ts`
- 回归：`packages/logix-core/test/EffectOp.Core.test.ts`、`packages/logix-core/test/StateTrait.EffectOpIntegration.test.ts`

### 2.6 Debug/Devtools：DebugSink → Hub → time travel

- 入口：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/Runtime.ts`（`applyTransactionSnapshot`）
- 内核：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`、`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（`__applyTransactionSnapshot`）
- 回归：`packages/logix-core/test/DebugTraceRuntime.test.ts`、`packages/logix-core/test/Runtime.Devtools.test.ts`、`packages/logix-devtools-react/test/TimeTravel.test.tsx`

### 2.7 Replay/Resource：证据链（录制/回放）与资源快照

- 入口：`packages/logix-core/src/Resource.ts`、`packages/logix-core/src/Link.ts`
- 内核：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
- 回归：`packages/logix-core/test/ReplayMode.Sequence.test.ts`、`packages/logix-core/test/ReplayMode.Resource.test.ts`、`packages/logix-core/test/ResourceQuery.Integration.test.ts`

### 2.8 React 订阅链路：runtime.changes → externalStore → hook

- 入口：`packages/logix-react/src/hooks/useModule.ts`、`packages/logix-react/src/hooks/useSelector.ts`
- 内核：`packages/logix-react/src/internal/ModuleRuntimeExternalStore.ts`、`packages/logix-react/src/internal/ModuleCache.ts`
- 回归：`packages/logix-react/test/hooks/useModuleSuspend.test.tsx`、`packages/logix-react/test/integration/strictModeSuspenseModuleRuntime.test.tsx`

### 2.9 Sandbox：client → worker → compiler（Alignment Lab 基础设施）

- 入口：`packages/logix-sandbox/src/client.ts`、`packages/logix-sandbox/src/worker/sandbox.worker.ts`
- 内核：`packages/logix-sandbox/src/protocol.ts`、`packages/logix-sandbox/src/compiler.ts`
- 回归：`packages/logix-sandbox/test/SandboxClientLayer.test.ts`、`packages/logix-sandbox/test/browser/sandbox-worker-smoke.test.ts`

## 3. auggie 查询模板（只取路径+符号）

> 更完整的“检索链路压缩包”见：`docs/ssot/handbook/cheatsheets/auggie-playbook.md`。

- `优先在 docs/ssot/handbook/cheatsheets/codebase-playbook.md 与 docs/ssot/runtime/** 中定位“Bound API $ / Fluent DSL”的入口与测试文件路径，并给出 5 个最相关的路径。`
- `Runtime.make / AppRuntime.makeApp / validateTags / TagCollisionError 的实现文件与对应测试文件分别在哪？只返回路径+符号。`
- `StateTransaction / StateTrait.converge 的调用链路是什么？请给出入口文件与深核文件列表（不贴代码）。`
