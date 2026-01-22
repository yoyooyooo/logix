---
title: auggie 检索加速器（project-guide）
status: draft
version: 1
---

# auggie 检索加速器（project-guide）

> 目标：让 LLM 用最少 token，通过 auggie 快速命中 **project-guide 的 Runtime SSoT（`docs/ssot/runtime/**`）\*\*，并在需要时最短跳转到实现与测试落点。

## 0. 使用法则（先读这 7 条就够）

1. **先命中文档，再下钻代码**：先让 auggie 找到 `docs/ssot/runtime/**` 的相关 SSoT 文档，再让它给出对应的实现文件/符号/测试文件。
2. **需要源码入口/回归索引时先读压缩包**：先读 `docs/ssot/handbook/cheatsheets/codebase-playbook.md`，再让 auggie 去命中其中列出的入口/内核/测试落点。
3. **显式写“优先在 .agent 下找”**：在 query 里直接写“优先在 `docs/ssot/runtime/**` 中定位”。
4. **一次只问一个问题**：避免并行批量查询；若遇到 `fetch failed`，缩小问题并串行重试。
5. **把输出格式约束成“路径 + 符号”**：让 auggie 返回路径/符号列表即可，不要大段贴代码。
6. **先走“黄金链路”**：拿不到时，先回到 `docs/ssot/runtime/README.md` 的三条读法（架构/维护者/业务）再选入口。
7. **发现路径漂移时用映射表纠偏**：如果 auggie 返回了旧路径（见 §4），按映射表替换到当前结构再继续。

## 1. Smoke Test（6 条，一分钟确认“能检索到 project-guide SSoT”）

> 目的：在新会话里快速验证 auggie 能稳定命中 `.agent` 下的 Runtime SSoT 文档。

- `请检索并返回 docs/ssot/handbook/cheatsheets/codebase-playbook.md 的标题与“核心链路索引”目录（确认源码导航压缩包可命中）。`
- `请检索并返回 docs/ssot/runtime/README.md 的标题与开头要点。`
- `请检索并返回 docs/ssot/runtime/logix-core/api/03-logic-and-flow.md 的标题（确认 $/Fluent DSL 文档可命中）。`
- `请检索并返回 docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md 的标题（确认 Runtime.make/AppRuntime 文档可命中）。`
- `请检索并返回 docs/ssot/runtime/logix-react/01-react-integration.md 中 useModule/suspend/ModuleCache 的相关段落。`
- `请检索并返回 docs/ssot/runtime/logix-core/api/04-logic-middleware.md 的标题（确认中间件总线文档可命中）。`

## 2. 五条“黄金链路”（每条都是：SSoT → 实现 → 测试）

### 2.1 Bound API `$` / Fluent DSL（业务写法 → 运行时注入）

**Step A（SSoT）**

- `优先在 docs/ssot/runtime/logix-core/api 下定位 $/onState/onAction/use/Flow 的规范文档，并给出最相关的 3 个路径。`

**Step B（实现）**

- `Bound API $ 的 public export 与实现分别在哪？请给出 packages/logix-core 的路径与关键符号：Bound.ts、internal/runtime/BoundApiRuntime.ts。`

**Step C（与 Runtime 的交互点）**

- `BoundApiRuntime 依赖 ModuleRuntime 的哪些内部 hook（例如 __registerReducer）？请给出 ModuleRuntime.ts 对应位置与相关符号名。`

### 2.2 Runtime.make → AppRuntime.makeApp（组合根 + TagIndex/冲突检测）

**Step A（SSoT）**

- `优先在 docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md 与 logix-core/impl/01-app-runtime-and-modules.md 中定位 Runtime.make/AppRuntime/makeApp/TagIndex 的说明片段。`

**Step B（实现）**

- `Runtime.make 的实现落点与调用链路是什么？请给出 packages/logix-core/src/Runtime.ts 与 packages/logix-core/src/internal/runtime/AppRuntime.ts 的关键函数/类型（make、makeApp、TagCollisionError、validateTags）。`

**Step C（测试）**

- `TagCollisionError（ServiceTag 冲突、重复 ModuleId）有哪些回归测试？请返回 packages/logix-core/test 下相关测试文件路径。`

### 2.3 React：useModule/suspend → ModuleCache.readSync/read（同步构造 vs Suspense）

**Step A（SSoT）**

- `优先在 docs/ssot/runtime/logix-react/01-react-integration.md 中定位 useModule/suspend/key/gcTime/ModuleCache 的说明段落。`

**Step B（实现）**

- `useModule 如何选择 readSync/read？ModuleCache 的 readSync/read 内部如何用 ManagedRuntime.runSync/runPromise？请给出 packages/logix-react/src/hooks/useModule.ts 与 packages/logix-react/src/internal/ModuleCache.ts 的关键符号。`

**Step C（测试）**

- `suspend:true 必须提供 key 的行为与 StrictMode/Suspense 的集成测试在哪？请返回 packages/logix-react/test 下相关测试文件路径。`

### 2.4 诊断/可观测：DebugSink / diagnostic codes（从错误到可解释链路）

**Step A（SSoT）**

- `优先在 docs/ssot/runtime/logix-core/observability/09-debugging.md 中定位 diagnostic codes（logic::invalid_phase 等）与 DebugSink 的说明。`

**Step B（实现）**

- `DebugSink/LogicDiagnostics/LifecycleDiagnostics/ReducerDiagnostics 的实现文件与关键符号分别在哪？请返回 packages/logix-core/src/internal/runtime/core 下相关文件列表。`

**Step C（测试）**

- `phase guard / env_service_not_found / reducer::* 诊断由哪些测试覆盖？请给出 packages/logix-core/test 的相关文件路径。`

### 2.5 中间件：Logic Middleware vs EffectOp MiddlewareStack（显式组合 + 总线）

**Step A（SSoT）**

- `优先在 docs/ssot/runtime/logix-core/api/04-logic-middleware.md 中定位：Logic Middleware 与 EffectOp MiddlewareStack 的职责边界。`

**Step B（实现）**

- `EffectOp/MiddlewareStack 的实现落点在哪？请给出 packages/logix-core/src/EffectOp.ts、packages/logix-core/src/internal/runtime/EffectOpCore.ts、packages/logix-core/src/Middleware.ts 以及关键符号（EffectOp.run/composeMiddleware/OperationRejected）。`

## 3. “只在 project-guide 里找”的最短入口（不需要 auggie 也能直达）

- Runtime 总览：`docs/ssot/runtime/README.md`
- Core：`docs/ssot/runtime/logix-core/README.md`
- API：`docs/ssot/runtime/logix-core/api/README.md`
- 长链路导览（广度脉络）：`docs/ssot/runtime/logix-core/concepts/02-long-chain-tour.md`

## 4. 路径规范（统一口径）

- Runtime SSoT 统一以 `docs/ssot/runtime/**` 为根路径。
- 任何非该结构的引用一律视为过时，直接纠正为当前结构。
