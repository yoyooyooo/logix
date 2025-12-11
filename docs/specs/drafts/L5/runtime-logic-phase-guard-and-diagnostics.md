---
title: Runtime Logic Phase Guard & Diagnostics · v3 最终形态草案
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ../L5/runtime-core-evolution.md
  - ../L6/runtime-logix-debug-logger-diagnostics.md
  - ../../runtime-logix/core/02-module-and-logic-api.md
  - ../../runtime-logix/core/03-logic-and-flow.md
  - ../../runtime-logix/core/05-runtime-implementation.md
---

# Runtime Logic Phase Guard & Diagnostics · 规范级终极形态草案

> 定位：L5 对比/收敛草案，目标是把「Logic 两阶段 bootstrap + Phase Guard + 诊断链路」定型为 v3 的长期不变量，为后续 runtime-logix 核心规范与实现提供单一参考。

## 0. 关联文档与实现入口

- **SSoT 文档落点（目标状态）**
  - `docs/specs/runtime-logix/core/02-module-and-logic-api.md`
    - 补充 LogicPlan / setup/run 段的概念定义与对 Module.logic 的解释；
  - `docs/specs/runtime-logix/core/03-logic-and-flow.md`
    - 承载 Bound API `$` + Phase Guard 的行为矩阵（哪些 API 属于 run-only、在 setup 中如何诊断）；
  - `docs/specs/runtime-logix/core/05-runtime-implementation.md`
    - 描述 ModuleRuntime.make / AppRuntime 对 Logic bootstrap 的责任边界；
  - `docs/specs/runtime-logix/core/09-debugging.md`
    - 整体列举 `logic::*` / `reducer::*` / `lifecycle::*` 诊断 code 及其触发条件；
  - `docs/specs/runtime-logix/react/README.md`
    - 从 React 视角说明 runSync / Suspense / StrictMode 下的 Runtime 行为约束。

- **当前 PoC 实现入口（本草案直接约束的代码）**
  - Phase Guard：
    - `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
      - `guardRunOnly` + `$.use / $.onAction / $.onState` 等入口；
    - `packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts`
      - `IntentBuilder` 与（长期）`IntentContext` / `runWithContext` 的类型与实现集中入口。
    - `packages/logix-core/src/internal/runtime/core/module.ts`
      - `ModuleLogic` / `LogicPlan` / `ModuleInstance.logic` 的类型定义。
  - Runtime bootstrap：
    - `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
      - `ModuleRuntime.make` 中 `isLogicPlan` / `returnsLogicPlan` 分支与 `handleLogicFailure`；
    - `packages/logix-core/src/internal/runtime/ModuleFactory.ts`
      - `ModuleFactory.Module.make(...).logic`：将 Logic builder 封装为 `__logicPlan` Effect，并注入 `__phaseRef`。
  - Diagnostics：
    - `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`
      - `LogicPhaseError` / `emitInvalidPhaseDiagnosticIfNeeded` / `emitEnvServiceNotFoundDiagnosticIfNeeded`；
    - `packages/logix-core/src/internal/runtime/core/ReducerDiagnostics.ts`
      - Reducer 相关诊断；
    - `packages/logix-core/src/internal/runtime/core/LifecycleDiagnostics.ts`
      - lifecycle.onError 缺失诊断；
    - `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
      - Debug 事件的对外输出形态。
  - React 集成侧验证：
    - `packages/logix-react/src/hooks/useModule.ts`
      - `useModule(Impl, { suspend })` 对 `ModuleCache.readSync/read` 的调用；
    - `packages/logix-react/src/internal/ModuleCache.ts`
      - `readSync` / `read` 对 `ManagedRuntime.runSync/runPromise` 的使用；
    - 相关测试：
      - `packages/logix-core/test/ModuleRuntime.test.ts`
      - `packages/logix-react/test/hooks/useModuleSuspend.test.tsx`
      - `packages/logix-react/test/integration/strictModeSuspenseModuleRuntime.test.tsx`

> 实施本草案时，建议：先以本节列出的实现入口为“coverage 清单”，在代码与测试中逐个对齐预期行为，再回写 runtime-logix/core 文档。

## 1. 目标与约束

- **核心目标**
  - 明确 Logic 在 Runtime 内的两阶段心智（`setup` / `run`），以及它与 ModuleRuntime/AppRuntime/React Adapter 的关系；
  - 定义一套完整的 **Phase Guard + Diagnostics** 方案，用于约束：
    - 在 `setup` 段调用仅允许在 `run` 段使用的能力（如 `$.use / $.onAction / $.onState`）；
    - 在 Env 未完全就绪时的 Service 访问（`Service not found`）；
    - Reducer 注册、Lifecycle 错配等运行时错误；
  - 保证所有这些错误在 v3 中都被 **本地化为诊断与生命周期错误事件**，不会破坏上层 `runSync` / React `useModule` 的同步构造路径。

- **硬约束**
  - 任意以 `Logix.Module.logic(($)=>Effect)` 或 `LogicPlan` 形式定义的 Logic，在被组装进 `ModuleRuntime.make` 后：
    - 对外表现为：`Effect<E = never, R = Scope | Env>` —— 即使内部存在长生命周期 Fiber 或诊断；
    - 不允许在同步构造路径上引发 `AsyncFiberException` 类错误；
    - 错误必须通过 DebugSink / lifecycle.onError / Diagnostics 暴露，而不是泄露到底层 run API。
  - Phase Guard 必须具备 **可解析性**：
    - 错误类型统一使用 `LogicPhaseError`；
    - 通过 `kind` / `api` / `phase` / `moduleId` 等字段，支持 Runtime / DevTools / 平台对齐。

## 2. 两阶段 Logic Bootstrap（setup / run）

### 2.1 统一模型：LogicPlan（代数数据类型）

- 对外书写形式：
  - 推荐范式：`Module.logic(($)=>Effect.gen(...))`；
  - 高级范式：`Module.logic(($)=>LogicPlan)` 或 `Module.logic(($)=>Effect.succeed(LogicPlan))`。
- 内部统一抽象为显式的代数数据类型，而不是挂魔法字段：

```ts
type PhaseRef = { current: 'setup' | 'run' }

interface ActivePlan<Sh, R, E> {
  readonly _tag: 'Active'
  readonly setup: Effect.Effect<void, E, Logic.Env<Sh, R>>
  readonly run: Effect.Effect<void, E, Logic.Env<Sh, R>>
  readonly phaseRef: PhaseRef
}

interface DisabledPlan {
  readonly _tag: 'Disabled'
  readonly reason: LogicFailure
  readonly phaseRef?: PhaseRef
}

type LogicPlan<Sh, R, E> = ActivePlan<Sh, R, E> | DisabledPlan
```

- `Active`：表示 Logic 正常参与运行时生命周期，具备 `setup` / `run` 两段；
- `Disabled`：表示 Logic 在解析阶段即被判定为不可运行（例如 Phase Guard 触发、Env 缺失），仅保留失败原因与可选的 phaseRef，用于诊断与 DevTools 展示。

### 2.2 执行时序（ModuleRuntime 视角）

对于携带 `logics` 的 `ModuleRuntime.make(initial, { tag, moduleId, logics, reducers })`：

1. **Logic 解析阶段（Resolve LogicPlan）**
   - 对每个传入的 Logic：
     - `isLogicPlan(raw)`：直接按 plan 处理；
     - `returnsLogicPlan(raw)`：在带 Runtime/生命周期上下文的环境中运行一次，解析出 plan；
     - 默认：视为单阶段 Logic，运行结束若返回 plan，再进入后续阶段。
   - Runtime 负责将上述结果统一提升为 `LogicPlan<Sh,R,E>`：
     - 解析成功 → 包装为 `ActivePlan`，同时注入 `phaseRef`；
     - 解析失败 → 基于错误构造 `DisabledPlan`（见 3.3 / 4.1），并发出诊断事件。
   - 此阶段 **不得**：
     - 让任何错误“穿透”出 `ModuleRuntime.make` —— 所有错误都必须先归一到 `LogicFailure`，再由 Diagnostics 模块处理。

2. **setup 段执行（纯同步 bootstrap）**
   - 对每个 plan：
     - 若为 `DisabledPlan`：跳过 `setup` 执行，仅保留其诊断信息；
     - 若为 `ActivePlan`：
       - 将 `phaseRef.current` 设置为 `"setup"`；
       - 在 `withRuntimeAndLifecycle` 环境中运行 `plan.setup`；
       - 所有错误先归一为 `LogicFailure`，再走 Diagnostics（不会向上抛出原始 Cause）。
   - 约束：
     - `setup` 必须幂等、短平快，只承担注册类操作；
     - 不允许在 `setup` 内部直接运行长生命周期 Flow（流式 watch / fork）。

3. **run 段启动（显式启动长生命周期 Fiber）**
   - 对每个 plan：
     - 仅对 `ActivePlan` 启动 run 段：
       - 将 `phaseRef.current` 切换为 `"run"`；
       - 在同一 Runtime/生命周期环境中 `Effect.forkScoped(plan.run)`；
       - 错误同样先归一为 `LogicFailure`，再走 Diagnostics。
   - 约束：
     - run 段负责 watcher / Flow / 长生命周期逻辑；
     - 所有跨 Module / Env 的访问都在 run 段完成；
     - run 段启动由 Runtime 显式控制，不再隐式发生在 `ModuleRuntime.make` 的同步 bootstrap 流程中。

## 3. Phase Guard：约束 setup 中的非法调用

### 3.1 错误类型：LogicFailure（Phase Guard 分支）

本草案不再依赖语言级异常来表达 Phase Guard 与 Env 相关错误，而是统一建模为结构化的 `LogicFailure`，并始终通过 `Effect.fail` 暴露：

- Phase Guard 错误：

```ts
interface LogicPhaseError {
  readonly _tag: 'LogicPhaseError'
  readonly kind: string // 如 "use_in_setup" 等
  readonly api: string // 触发错误的 API 标识（如 "$.use"）
  readonly phase: 'setup' | 'run'
  readonly moduleId?: string
}
```

- Env Service 错误：

```ts
interface EnvServiceError {
  readonly _tag: 'EnvServiceError'
  readonly service: string // Env Service Tag 或描述
  readonly api?: string // 访问该 Service 的 API（如 "$.use"）
  readonly phase?: 'setup' | 'run'
  readonly moduleId?: string
}
```

- 统一失败类型：

```ts
type LogicFailure =
  | LogicPhaseError
  | EnvServiceError
  | { _tag: 'LogicUnknownError'; cause: Cause.Cause<unknown>; moduleId?: string }
```

Runtime / DevTools / 平台仅依赖 `_tag` / `kind` / `api` / `phase` / `moduleId` 等结构化字段，不再依赖字符串匹配。

### 3.2 Bound API 内的 Phase Guard（Env 驱动）

- 对 run-only 能力（例如 `$.use` / `$.onAction` / `$.onState` 以及基于 `IntentBuilder` 的 `.run*` / `.runWithContext` 链的执行入口）：
  - 在 `BoundApiRuntime.make` 内统一通过 `guardRunOnly(kind, api)` 检查当前 phase；
  - phase 信息不再依赖全局可变引用，而是由 Env 内的 Phase Service 提供：

```ts
interface LogicPhaseService {
  readonly current: 'setup' | 'run'
}
```

Phase Guard 逻辑示意：

```ts
guardRunOnly(kind: string, api: string): Effect.Effect<void, LogicPhaseError> {
  return Effect.flatMap(LogicPhaseServiceTag, (phase) =>
    phase.current === "run"
      ? Effect.unit
      : Effect.fail({
          _tag: "LogicPhaseError",
          kind,
          api,
          phase: phase.current,
        }),
  )
}
```

- 调用点（如 `$.use` / `$.onAction`）在构建 DSL 时组合 `guardRunOnly`，从而在 **setup 段** 就将非法调用转化为 `Effect.fail(LogicPhaseError)`。

### 3.3 Runtime 侧的错误本地化（LogicPlan 生成）

- 在 Logic 解析阶段，Runtime 负责将 `Effect` 层面的失败归一为 `LogicPlan` 的 `Disabled` 变体：
  - 若解析 Logic 时返回 `Effect.fail(LogicFailure)`：
    - 将该错误保存为 `DisabledPlan.reason`；
    - 调用 Diagnostics 模块发出对应的 `logic::invalid_phase` / `logic::env_service_not_found` 等诊断；
    - 返回 `DisabledPlan`，保证 bootstrap 不会因 Phase Guard/Env 错误中断。
- 后续执行时：
  - `DisabledPlan` 永远不会进入 `setup` / `run` 执行路径，只作为诊断与 DevTools 展示的载体；
  - `ActivePlan` 在 `setup` / `run` 中出现的错误，同样被归一为 `LogicFailure` 后交由 Diagnostics 处理，不再穿透到 `ModuleRuntime.make` 的调用方。

## 4. Env 错误与 Diagnostics 组合

### 4.1 Env Service 缺失：logic::env_service_not_found

- 当 Logic 在访问 Env Service 时收到 `EnvServiceError`：
  - 通过 `emitEnvServiceNotFoundDiagnostic` 发出：
    - `code: logic::env_service_not_found`；
    - `severity: warning`；
    - `message`: 带有 Service 标识与 ModuleId 的结构化说明；
    - `hint`: 解释这是 Env 初始化时序问题或缺失配置，并指向 Runtime/React 集成排查。

### 4.2 Phase 相关诊断：logic::invalid_phase

- 对于 Phase Guard 相关的 `LogicPhaseError`：
  - 通过 `emitInvalidPhaseDiagnostic` 发出：
    - `code: logic::invalid_phase`；
    - `kind`: 来源于 `LogicPhaseError.kind`（如 `use_in_setup`）；
    - `api` / `phase` / `moduleId`：直接来自错误对象，便于平台/DevTools 还原上下文。

- 不再依赖 `Cause.pretty` 或字符串启发式，将 phase/Env 信息视为一等结构化字段。

### 4.3 生命周期与 Reducer 诊断

- 通过 `LifecycleDiagnostics.emitMissingOnErrorDiagnosticIfNeeded` 兜底：
  - 无注册 `$.lifecycle.onError` 时，对 lifecycle:error 发出 warning 级诊断；
- 通过 `ReducerDiagnostics.emitDiagnosticsFromCause` 处理：
  - Reducer 重复注册（`reducer::duplicate`）；
  - 迟到注册（`reducer::late_registration`）；
  - 在 dispatch 流程中保持 state 一致性与错误可观测性。

## 5. Watcher Handler & IntentBuilder 上下文（长期规范）

> 本节给出围绕 `IntentBuilder` 的长期 API 形态，用于稳定“Watcher handler 到上下文”的映射，减少 ad‑hoc 写法，让 Phase Guard 与 Diagnostics 在 DSL 层有清晰锚点。

### 5.1 基础不变量：Payload 优先

- 现有约定保留：
  - `$.onAction("tag").run((payload) => ...)` 中的 `payload` 始终表示 **触发源本身**：
    - 对 Action watcher：`payload = ActionOf<Sh>`（如 `{ _tag: "inc"; payload: void }`）；
    - 对 State watcher：`payload = 派生 State 视图值`。
  - 这一形态不携带额外上下文（如 `state`、`env`），旨在保持 `IntentBuilder` 本身的简单性，并便于与 IntentRule 的 “source → pipeline → sink(handler)” 映射对齐。

### 5.2 上下文变体：IntentContext<Sh, Payload>

- 为了在 handler 中稳定访问当前 State（以及未来可能的 Env/Actions），引入标准上下文类型：

```ts
interface IntentContext<Sh extends Logix.AnyModuleShape, Payload> {
  readonly payload: Payload
  readonly state: Logix.StateOf<Sh>
  // 预留：后续可扩展 actions / env / trace 等字段
}
```

- 长期 API 目标是在 DSL 层提供显式入口，将 `Stream<Payload>` 提升为 `Stream<IntentContext<Sh,Payload>>`，而不是让调用者在 handler 内手写 `yield* $.state.read` 或依赖非标准 ctx 形状。

### 5.3 长期 API 形态（建议）

在保持 `.run(payload => ...)` 不变的前提下，引入一个**核心变体** `runWithContext`，并（可选地）提供链式语法糖 `withContext().run`，统一表达“带上下文的 handler”：

1. **核心变体：`runWithContext`**

```ts
$.onAction('inc').runWithContext((ctx) => $.state.update(() => ctx.state))
```

- 语义等价于：

```ts
runWithContext(f) = run((payload) => Effect.flatMap(runtime.getState, (state) => f({ payload, state })))
```

- 该写法更接近当前 `.run` 的心智，只是把“取 state”这步变为一等 API，避免重复样板代码，也是后续实现时的**最低必需集**。

2. **链式语法糖：`withContext().run`（可选）**

```ts
$.onAction('inc')
  .withContext() // :: IntentBuilder<IntentContext<Sh, Action>, Sh, R>
  .run((ctx) => $.state.update((s) => ({ ...s, value: s.value + 1 })))
```

- 语义：`withContext()` 将内部流从 `Stream<Action>` 映射为 `Stream<IntentContext<Sh,Action>>`；
- 若实现该语法糖，其行为必须与 `runWithContext` 等价，不得引入额外语义或性能差异。

> 规范建议：**DSL 层在 `IntentBuilder` 接口上至少增加 `runWithContext` 这一变体，不改动现有 `.run` 的签名；`withContext().run` 视为语法糖，可根据实际需求选择是否实现。** 这样既保持现有写法的简单性，又为 Phase Guard / IntentRule / DevTools 提供标准化的“上下文 handler”入口。

### 5.4 与 Phase Guard / Diagnostics 的关系

- Phase Guard：
  - 对 `.withContext()` / `.runWithContext()` 的调用仍然遵循 3.2 小节的 Phase Guard 规则（属于 run‑only 能力）；
  - 在 setup 段触发时会产生 `LogicPhaseError(kind="use_in_setup", api="$.onAction.withContext/runWithContext")`，并转为 `logic::invalid_phase` 诊断。
- Diagnostics：
  - DevTools / 平台在展示 Watcher 列表或构建 IntentRule 时，可以把带上下文的 handler 识别为 `sink.type = "mutate"` 或 `sink.type = "service"`，而不是不透明的 “Effect lambda”；
  - IntentContext 形状有助于在 Trace 中还原 “当时的 state + payload”，提升调试稳定性。

## 6. runSync / React Adapter 兼容性约束

### 6.1 `ManagedRuntime.runSync` 不变量

- 对于任何通过 `Runtime.make`/`Module.live` 构造出来的 Runtime：
  - `runSync(effect)` 默认假定 `effect` 在 **逻辑上是同步可结束** 的；
  - Runtime 有责任保证：
    - 初始化路径上的 Logic bootstrap（含 phase guard / diagnostics）不会引入“未决 Async Fiber”；
    - 任何启动的长期 Fiber 都应由 Runtime 自行管理（通过 Scope），而不是让驱动方感知。

### 6.2 React Adapter：useModule / ModuleCache

- 在 React 侧，`useModule` 分为：
  - sync 模式：`cache.readSync(key, factory, gcTime, ownerId)` → `runtime.runSync(factory(scope))`；
  - Suspense 模式：`cache.read(key, factory, ...)` → `runtime.runPromise(...)` + Promise 挂起；
- 规范要求：
  - 对所有 “仅因 phase guard / Env 初始化噪音” 导致的错误：
    - Runtime 必须通过 `ModuleRuntime.make` 的本地化逻辑，将其转化为同步完成的 bootstrap（带诊断但不 fail）；
    - React sync 模式只感知“模块构造成功 + 有 Debug 事件/诊断”，不会看到 `AsyncFiberException` 或类似错误。

## 7. 演进与落地计划

### 7.1 短期（v3.x 内）：实现落点与收尾事项

> 状态提示：本小节将“已经完成的事项”与“仍需落地的尾巴”拆开，方便 Review 与后续排期。

**A. logix-core 引擎侧（Phase Guard / Diagnostics）**

- [x] Phase Guard 接入运行时相位服务
  - 在 `ModuleFactory.logic` 中为每段 Logic 构造 `phaseRef`，并通过 `BoundApiRuntime.make(shape, runtime, { phaseService, moduleId })` 注入到 `$`：
    - 代码：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`；
  - 在 `ModuleRuntime.make` 中，通过 `withRuntimeAndLifecycle(effect, phaseRef)` 把 `LogicPhaseServiceTag` 注入执行环境，确保解析 LogicPlan、执行 setup/run 以及单阶段 Logic 时 `$` 都能感知当前 phase：
    - 代码：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`。
- [x] Bound API run-only 能力的 Phase Guard
  - 在 `BoundApiRuntime.make` 内统一通过 `guardRunOnly(kind, api)` 保护以下入口：
    - `$.use`；
    - `$.onAction*`（包含函数谓词 / tag / Schema 等形态）与 `$.onState` / `$.on`；
  - 违规时抛出结构化 `LogicPhaseError(kind=\"use_in_setup\", api, phase=\"setup\", moduleId)`，由 `ModuleRuntime.make` 的 `handleLogicFailure` + `LogicDiagnostics.emitInvalidPhaseDiagnosticIfNeeded` 收敛为 `logic::invalid_phase` 诊断而非抛出到 `runSync`。
  - 代码：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`、`core/LogicDiagnostics.ts`、`runtime/ModuleRuntime.ts`。
- [x] 运行时环境判断与生产降噪
  - 新增 `core/internal/runtime/core/env.ts` 的 `getNodeEnv/isDevEnv` 帮助函数，并通过 `@logix/core/env` 进行 re-export，统一所有包（含 React 绑定）读取 NODE_ENV 的方式；
  - env helper 通过 `globalThis.process.env.NODE_ENV` 读取调用方环境，避免 tsup 在构建库时内联，保证 Phase 诊断与 Dev-only 开关在最终业务运行环境生效；
  - `LogicDiagnostics.emitInvalidPhaseDiagnosticIfNeeded` 在 `isDevEnv()` 为 false（生产）时直接 no-op，仅保留守卫行为，不输出诊断日志。
- [x] 单测覆盖（logix-core 范围）
  - `ModuleRuntime.test.ts` 覆盖：
    - `setup` 段直接 `yield* $.use(Service)` 触发 `logic::invalid_phase`；
    - `setup` 使用 `$.onAction` watcher 触发 `logic::invalid_phase`；
    - Env 缺失时的 `logic::env_service_not_found` 诊断；
    - 返回 LogicPlan 的场景中，Phase Guard 仍通过 `__phaseRef` / Phase 服务生效，并保持 runSync 构造路径不会被 `AsyncFiberException` 打断。

**B. 文档与规范侧（runtime-logix/core + react）**

- [x] 核心 API 文档对齐 Phase Guard 行为
  - `core/02-module-and-logic-api.md`：
    - 增补 Logic 两阶段与 `LogicPlan` 统一模型描述；
    - 新增 “Phase Guard 与诊断（API 行为矩阵）” 小节，明确哪些 `$` API 属于 run-only、在 setup 违规时如何被转换为 `LogicPhaseError` 与 `logic::invalid_phase`。
  - `core/03-logic-and-flow.md`：
    - 在“两阶段 Logic Bootstrap”后补充 Phase Guard 行为矩阵表格；
    - 完成 `IntentContext` / `runWithContext` 的 handler 上下文规范，并声明这些也为 run-only 能力。
  - `core/05-runtime-implementation.md`：
    - 明确 `ModuleRuntime.make` 的逻辑解析顺序与错误收敛策略（LogicPlan 解析、`__skipRun` noop plan、LogicFailure 概念）；
    - 强调 runSync 不变量：任何 Phase Guard 违规只会变成诊断 + noop plan，不会破坏同步构造路径。
  - `core/09-debugging.md`：
    - 列出 `logic::invalid_phase` / `logic::env_service_not_found` / `reducer::*` / `lifecycle::missing_on_error` 等诊断代码与触发条件。
  - `react/README.md`：
    - 对 React `useModule` / ModuleCache 的 runSync 假设与 Phase Guard 联动给出明确约束说明。

**C. React 运行时环境判断与 Dev-only 守卫**

- [x] 统一 React 层 NODE_ENV 读取方式
  - 新增 `packages/logix-react/src/internal/env.ts` 并作为唯一事实源：通过 `@logix/core/env` re-export `getNodeEnv/isDevEnv`，避免在 React 包中重复实现环境检测逻辑；
  - 移除 `ModuleCache` 内部重复实现的 `getNodeEnv`，避免后续两套实现发生漂移。
- [x] React Runtime / Hooks 使用统一 env 开关
  - `RuntimeProvider` 中关于 Layer 引用变化与 `useRuntime` 的 warnings 统一改用 `isDevEnv()` 控制，仅在 DEV 下提示；
  - `ModuleCache` 的 debug 日志、资源 key ownership 校验以及 `stableHash` 的非原始 deps 警告统一走 `isDevEnv()`，并通过顶层常量 `IS_DEV = isDevEnv()` 控制开关；
  - `useModule` 中 `suspend:true` 但缺少 `options.key` 的校验改为使用 `isDevEnv()`，保证这是“开发时必须发现的问题”：在本地/测试环境直接抛出可读错误，生产环境则不再额外制造噪音，仅保留运行时行为上的 Phase Guard/超时等保护。
- [ ] 后续新增的 React Dev 诊断或 Guard（例如更多 Suspense / StrictMode 的误用提示），一律通过 `internal/env.ts` 的 `isDevEnv()` 控制开关，避免再出现直接 `process.env.NODE_ENV` 或各自实现环境判断的情况。
- [x] React hooks / 示例与 Phase Guard 约束的系统性对齐
  - 已对 `@logix/react` 的主要测试与示例进行集中迁移：包括 `hooks.test.tsx`、`useModule.test.tsx`、`useDispatch.test.tsx`、`watcherPatterns.test.tsx`、`useModuleSuspend.test.tsx` 等，所有正常路径的 Logic 现在都以 `Module.logic(($) => Effect.gen(function* () { ... }))` 的形式在 **run 段** 挂载 watcher 与 Env 访问；
  - 同期修正了 examples 下若干场景代码（如 `counterMulti.ts`、`debugsink-error-demo.ts`、`and-update-on-action.ts`），避免在 builder 内直接调用 `$.onAction/...run*`；
  - apps/docs 中的入门与进阶文档（`Modules & State`、`Thinking in Logix`、并发与 Suspense 等章节）也已更新为一致的“安全默认写法”，显式标注 `Module.logic(($) => $.onAction(...).run(...))` 等旧写法会在 setup 阶段触发 Phase Guard，仅保留在「错误示例」上下文中使用。

### 7.2 中长期（v4+ 方向）

- 结构化提升：
  - 将 `LogicPlan` 的禁用 run 语义从 `__skipRun` 提升为正式 Variant（例如 `DisabledPlan`），避免魔法字段；
  - 将当前 `handleLogicFailure(cause)` + 多个 `emit*DiagnosticIfNeeded` 提炼为显式的 `LogicFailure` 代数类型（`LogicPhaseError | EnvServiceError | LogicUnknownError`），在 Runtime 内部统一解析失败原因，再根据类型映射到 Debug 事件与 lifecycle 错误；
  - 为 Env 缺失错误补充结构化 metadata（phase / api / tag / serviceTag），彻底摆脱对 `Cause.pretty` 文本解析的依赖。
- DevTools 与平台：
  - 以本草案定义的诊断事件为基础，梳理统一的 “Phase & Env 错误视图”，让平台能跨 Runtime 一致地展示“错误阶段矩阵”；
  - 将 `logic::invalid_phase` / `logic::env_service_not_found` 等 code 纳入平台级 lint / 规则引擎。

---

> 本草案与 `runtime-core-evolution.md` 共同构成 runtime-logix v3 在「核心引擎约束 + Phase Guard + Diagnostics」上的终局形态提案。
> 后续当相关实现稳定后，应优先生成为 `docs/specs/runtime-logix/core/` 与 `impl/` 下的正式章节，并将本草案标记为 `status: merged`。
