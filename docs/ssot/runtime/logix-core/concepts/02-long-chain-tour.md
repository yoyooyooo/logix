# 运行时长链路导览（从业务写法到实现落点）

> **Status**: Draft
> **Audience**: 维护者/LLM（希望用最短路径建立“广度脉络”，再按需深挖）
> **Goal**: 不通读所有文档，也能快速回答“链路是什么、约束是什么、去哪看细节”。

## 0. 渐进式披露：这篇文档怎么用

- 只想写业务代码：直接从 `api/README.md` 开始即可，本篇只在“需要知道引擎如何工作/怎么定位”时阅读。
- 只想深挖实现：本篇先给出“入口文件/内核目录”，再把细节交给 `runtime/*`、`observability/*` 与 `impl/*`。

## 1. 四条最关键的长链路（SSoT 视角）

### 1.1 从定义到跑起来：`Module` → `Logic` → `Live` → `Runtime.make`

- **你会写到的 API**：`Logix.Module.make` / `ModuleDef.logic(($)=>...)` / `ModuleDef.live(...)` / `Runtime.make(...)`
- **看契约**：`../api/02-module-and-logic-api.md`
- **看实现**：`packages/logix-core/src/Module.ts`、`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/AppRuntime.ts`

### 1.2 一次触发的写入主链路：`dispatch` → `StateTransaction` → `commit` → Debug 聚合

- **你需要记住的约束**：事务窗口禁止 IO；一次逻辑入口对应一次提交（对外原子可见）
- **看契约**：`../api/03-logic-and-flow.md`（事务边界直觉）+ `../runtime/05-runtime-implementation.md`（实现不变量）
- **看实现**：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`、`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`

### 1.3 Logic 两阶段：`setup/run` + Phase Guard

- **你需要记住的约束**：setup 段只做同步注册（禁止 IO）；run 段才能长期 fork/订阅/调用服务
- **看契约**：`../api/03-logic-and-flow.md`
- **看实现**：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`、`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`

### 1.4 可观测链路：Effect Tracing / DebugSink / DevtoolsHub

- **你需要记住的约束**：诊断事件必须 slim 且可序列化；默认低成本（dev-only 冷路径）
- **看契约**：`../observability/09-debugging.md`
- **看实现**：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

## 2. 常见“下一跳”：我该往哪深挖？

- 想搞清楚 `$.onState/$.onAction/$.on` 的白盒边界：读 `../api/03-logic-and-flow.md`，然后搜 `BoundApi` / `Flow.Api`（`packages/logix-core/src/internal/runtime/**`）
- 想搞清楚 middleware：先读 `../api/04-logic-middleware.md`，再看 `specs/001-module-traits-runtime/references/effectop-and-middleware.md`
- 想搞清楚 React 行为：从 `../../logix-react/01-react-integration.md` 进入（再看 `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`）
- 想搞清楚平台 IR：从 `../platform/06-platform-integration.md` 进入（IntentRule / Gray Box 边界）

## 3. 实现视角小抄（可选，不是 SSoT）

- 长链路正交分解（A–K）：`references/long-chain-index.md`
