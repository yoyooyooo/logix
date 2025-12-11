# Logix Test Kit Design (@logix/test)

> **Status**: Draft（下一代设计草案）
> **Purpose**: 为 Logix Module / Runtime 提供环境无关的、可时间旅行的测试基础设施，并与 `@effect/vitest` 协同工作。

## 1. 设计哲学：Pure Effect + Layer 友好

- **测试即 Effect**：不引入 Jest 风格命令式 API，测试场景本身是 `Effect` 程序，可以被 `@effect/vitest` / 自定义 runner 直接执行。
- **复用 Env / Layer 模型**：所有依赖一律通过 `Layer` 注入（Service Tag、Link Logic、外部服务），与业务代码保持同构。
- **Runtime 作为一等服务**：对 Logix 而言，测试的最小单元是 ModuleRuntime 或「场景」（主模块 + 协作模块 + Layer）。
- **与 runner 解耦**：`@logix/test` 不依赖 Vitest，本身只输出 `Effect` / `Layer` / 结构化结果；Effect 的执行交给 `@effect/vitest` 或 `Effect.runPromise`。

和官方的分工建议：

- 通用 Effect 逻辑 / Service 测试 → 使用 `@effect/vitest` 直接写 `it.effect` / `it.scoped`。
- Logix Module / Runtime 行为测试 → 使用 `@logix/test` 把场景封成 Effect 程序，再交给 `@effect/vitest`/Vitest 运行。

> `@logix/test` 依赖 `@logix/core`（以及未来的 runtime 包），但 **core/runtime 自身测试不反向依赖 `@logix/test`**，避免循环。core 层只使用 `@effect/vitest` + 少量本地 helper。

## 2. 对外 API 总览

对业务仓库暴露的主要能力：

- `runTest(effect)`：在 Effect 的 `TestContext` 中运行任意 `Effect`（便于入门或非 Vitest 环境）。
- `TestProgram`：场景级测试 DSL，面向「主模块 + 协作模块 + 自定义 Layer」的集成测试。
- `TestRuntime`：低层的 Runtime-as-a-Service 工具，用于需要直接操作 `ModuleRuntime` 的场景。
- `Execution`：围绕场景运行结果（最终 state / actions / trace）的结构化工具。

### 2.1 `runTest`（基础 runner）

`runTest` 是一个薄封装：提供 `TestContext` 后调用 `Effect.runPromise`。

```ts
import { runTest } from "@logix/test"
import { Effect, TestClock } from "effect"

const program = Effect.gen(function* () {
  // 带 TestClock / TestRandom 等 TestContext 能力
  yield* TestClock.adjust("1 seconds")
})

await runTest(program)
```

在引入 `@effect/vitest` 后，推荐优先用 `it.effect` / `it.scoped` 作为 runner，`runTest` 主要用于：

- 业务仓库刚接触 Effect 时的过渡期；
- 非 Vitest 环境下的简单测试或脚本；
- 在应用内嵌入「自检」场景（如 dev-only 自测命令），但依然复用 TestContext 能力。

### 2.2 `TestProgram`（场景级 DSL）

`TestProgram` 是业务开发的推荐入口：通过 **声明式配置** 描述一个 Logix 场景，再在场景上运行一个 Effect 测试程序。

```ts
import { TestProgram, Execution, runTest } from "@logix/test"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "@logix/core"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
})

const CounterLogic = Counter.logic(($) =>
  $.onAction("increment").run(() => $.state.update((s) => ({ ...s, count: s.count + 1 }))),
)

// 1. 声明场景：主模块 + 协作模块 + 自定义 Layer
const scenario = TestProgram.make({
  main: {
    module: Counter,
    initial: { count: 0 },
    logics: [CounterLogic],
  },
  // modules / layers 可选
})

// 2. 在场景上运行 Effect 测试程序
const program = scenario.run(($) =>
  Effect.gen(function* () {
    yield* $.dispatch({ _tag: "increment", payload: undefined })
    yield* $.assert.state((s) => s.count === 1)
  }),
)

// 3. 使用 runTest 或 @effect/vitest 运行
const result = await runTest(program)
Execution.expectActionTag(result, "increment")
Execution.expectNoError(result)
```

配置模型（简化版）：

```ts
interface ScenarioConfig<Sh extends Logix.AnyModuleShape> {
  main: {
    module: Logix.ModuleInstance<any, Sh>
    initial: Logix.StateOf<Sh>
    logics?: ReadonlyArray<Logix.ModuleLogic<Sh, any, any>>
  }
  modules?: ReadonlyArray<{
    module: Logix.ModuleInstance<any, Logix.AnyModuleShape>
    initial: any
    logics?: ReadonlyArray<Logix.ModuleLogic<Logix.AnyModuleShape, any, any>>
  }>
  layers?: ReadonlyArray<Layer.Layer<any, any, any>>
}

interface Scenario<Sh extends Logix.AnyModuleShape> {
  run(
    body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>,
  ): Effect.Effect<ExecutionResult<Sh>, unknown, Scope.Scope>
}
```

对外只暴露 `TestProgram.make(config)` + `scenario.run(...)`，内部的 builder/Scenario 细节视为实现细节，可以自由重构。

#### 2.2.1 TestApi 能力

`scenario.run` 提供的 `api` 对象（以主模块为视角）：

```ts
interface TestApi<Sh extends Logix.AnyModuleShape> {
  dispatch(action: Logix.ActionOf<Sh>): Effect.Effect<void>
  assert: {
    state(
      predicate: (s: Logix.StateOf<Sh>) => boolean,
      options?: WaitUntilOptions,
    ): Effect.Effect<void, Error, unknown>
    signal(
      expectedType: string,
      expectedPayload?: unknown,
      options?: WaitUntilOptions,
    ): Effect.Effect<void, Error, unknown>
  }
}

interface WaitUntilOptions {
  readonly maxAttempts?: number
  readonly step?: DurationInput
}
```

实现约定：

- `assert.state`：内部会自动重试（依赖 `TestClock` + `waitUntil`），直到条件满足或超时；
- `assert.signal`：在收集到的 actions/trace 中查找匹配的信号，同样支持自动重试；
- `WaitUntilOptions` 允许调用方微调重试策略（最大重试次数 / 每次推进的虚拟时间步长），默认使用较小步长和有限重试次数以保持测试快速且稳定。

#### 2.2.2 两种使用姿势

1. **简易版（适合刚接触 Effect 的团队）**

   - `describe` / `it` 从 `vitest` 引入，测试函数是 `async () => { ... }`，核心逻辑完全交给 `TestProgram` / `runTest`：

   ```ts
   it("simple counter", async () => {
     const scenario = TestProgram.make(/* ... */)
     const program = scenario.run(($) =>
       Effect.gen(function* () {
         yield* $.dispatch({ _tag: "increment", payload: undefined })
         yield* $.assert.state((s) => s.count === 1)
       }),
     )

     const result = await runTest(program)
     Execution.expectActionTag(result, "increment")
   })
   ```

2. **原生 Effect 版（推荐给熟悉 Effect 的团队 + Logix 自身测试）**

   - 配合 `@effect/vitest` 的 `it.effect` / `it.scoped`，完全以 Effect 视角书写，不再依赖 `runTest`：

   ```ts
   import { it, expect } from "@effect/vitest"

   it.effect("counter with TestProgram + Execution", () =>
     TestProgram.make(/* ... */)
       .run(($) =>
         Effect.gen(function* () {
           yield* $.dispatch({ _tag: "increment", payload: undefined })
           yield* $.assert.state((s) => s.count === 1)
         }),
       )
       .pipe(
         Effect.tap((result) =>
           Effect.sync(() => {
             Execution.expectActionTag(result, "increment")
             Execution.expectNoError(result)
             expect(result.state).toEqual({ count: 1 })
           }),
         ),
       ),
   )
   ```

原生 Effect 版是长期推荐姿势，简易版主要为业务团队平滑过渡和非 Effect-aware 生态提供入口。

### 2.3 `ExecutionResult` + `Execution` 工具

场景运行结果统一使用：

```ts
interface ExecutionResult<Sh extends Logix.AnyModuleShape> {
  readonly trace: ReadonlyArray<TraceEvent<Sh>>
  readonly state: Logix.StateOf<Sh>
  readonly actions: ReadonlyArray<Logix.ActionOf<Sh>>
}

type TraceEvent<Sh extends Logix.AnyModuleShape> =
  | { _tag: "Action"; action: Logix.ActionOf<Sh>; timestamp: number }
  | { _tag: "State"; state: Logix.StateOf<Sh>; timestamp: number }
  | { _tag: "Error"; cause: unknown; timestamp: number }
```

辅助工具（抛错式断言）：

- `Execution.expectActionTag(result, tag, { times? })`
- `Execution.expectNoError(result)`
- `Execution.expectNoActionTag(result, tag)`：断言某个 tag 的 Action 不存在；
- `Execution.expectActionSequence(result, [...tags])`：按顺序断言完整的 Action tag 序列；
- 以及一些布尔工具（如 `Execution.hasAction`、`Execution.getErrors`）供平台/AI 分析使用。

### 2.4 `TestRuntime`：Runtime as a Service

`TestRuntime` 面向需要直接操作 `ModuleRuntime` 的场景，例如：

- 精细验证 `actions$` / `changes` / 流水线行为；
- 结合 `TestClock` / `Stream` / `Fiber` 做复杂并发测试；
- 在开发新 Runtime 能力时做「Runtime-level 自测」。

核心类型（简化）：

```ts
interface TestRuntime<Sh extends Logix.AnyModuleShape> {
  readonly runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
  readonly state: Effect.Effect<Logix.StateOf<Sh>>
  readonly dispatch: (action: Logix.ActionOf<Sh>) => Effect.Effect<void>
  readonly actions: Effect.Effect<ReadonlyArray<Logix.ActionOf<Sh>>>
  readonly trace: Effect.Effect<ReadonlyArray<TraceEvent<Sh>>>
  readonly dispose: Effect.Effect<void>
  readonly advance: (duration: Duration.DurationInput) => Effect.Effect<void>
  readonly context: Context.Context<any>
}
```

构造函数：

- `TestRuntime.make(module, layer)`：
  - `module`：Logix Module 实例；
  - `layer`：提供该 ModuleRuntime 所需的全部 Layer（包含 `module.live(initial, ...logics)` 以及协作模块 / Link / Mock 等）。
  - 内部自动注入 `TestContext`、挂上 DebugSink、收集 actions 和 state 变化到 trace。

结合 `@effect/vitest` 的推荐用法示例（Runtime-level 测试）：

```ts
import { it, expect } from "@effect/vitest"
import { Effect, Schema, Layer, TestClock } from "effect"
import * as Logix from "@logix/core"
import * as LogixTest from "@logix/test"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterLogic = Counter.logic(($) =>
  $.onAction("inc").run(() => $.state.update((s) => ({ ...s, count: s.count + 1 }))),
)

const CounterLayer = Counter.live({ count: 0 }, CounterLogic)

it.effect("runtime as service + TestClock", () =>
  LogixTest.TestRuntime.make(Counter, CounterLayer).pipe(
    Effect.scoped, // 确保资源释放
    Effect.tap((rt) =>
      Effect.gen(function* () {
        yield* TestClock.adjust("10 millis")
        yield* rt.dispatch({ _tag: "inc", payload: undefined })
        yield* TestClock.adjust("10 millis")
        const state = yield* rt.state
        expect(state.count).toBe(1)
      }),
    ),
  ),
)
```

未来还可以提供 `TestRuntime.layer(…)` 这类 helper，把 Runtime 暴露为 Layer，配合 `@effect/vitest` 的 `layer(Foo.Live)(..., (it) => ...)` 使用。

## 3. 与 `@effect/vitest` 的协作边界

### 3.1 建议分工

- **`@effect/vitest`**
  - 提供 `it.effect` / `it.scoped` / `layer` / `expect` 等测试入口。
  - 内建 `TestContext`、`TestClock`、属性测试工具等。
  - 对任何 `Effect` 程序一视同仁，不关心 Logix 语义。

- **`@logix/test`**
  - 在 `Effect` 基础上提供 Logix 特化能力：
    - 场景级 DSL（`TestProgram` + `TestApi`）；
    - Runtime 级工具（`TestRuntime`）；
    - 结构化 ExecutionResult + trace。
  - 不直接导出 Vitest 相关 API，不感知测试 runner。

### 3.2 logix-core / logix-runtime 是否复用 `@logix/test`

当前原则：

- `@logix/test` 依赖 `@logix/core`（未来也可以依赖 `@logix/runtime`），定位在「上游应用/业务仓库」。
- `@logix-core` / `@logix-runtime` 自身的单元测试 **不反向依赖** `@logix/test`，只使用：
  - `@effect/vitest`（Effect 版 Vitest API）；
  - 本包内部的一些类型/构造 helper（如 `Module.make` + `Runtime.make`）。

如果未来发现 core/runtime 层也需要共同的测试基元，可以考虑拆出一个不依赖 `@logix/core` 的轻量包（例如「test-kernel」），只提供：

- `runWithTestContext`；
- 通用的 `waitUntil` / Effect 断言模式；
- 一些纯 Effect 小工具。

`@logix/test` 则在其上叠加 Logix 语义（Module/Runtime/Scenario），继续依赖 `@logix/core`。

## 4. 后续实现要点

- 代码结构（目标形态）：

  ```text
  packages/logix-test/
    src/
      index.ts              # 公共 API：runTest, TestProgram, TestRuntime, Execution, Assertions
      api/
        TestProgram.ts      # TestProgram.make + 场景实现（内部可使用 builder，但不导出）
        TestApi.ts          # TestApi 类型
        defineTest.ts       # runTest 实现（提供 TestContext）
      runtime/
        TestRuntime.ts      # TestRuntime.make + TestRuntimeTag
      ExecutionResult.ts    # ExecutionResult + 期望工具
      utils/
        assertions.ts       # assertState/assertSignal 等底层 Effect 断言
        waitUntil.ts        # 带 TestClock 的重试工具
  ```

- 现有 `Scenario.ts` 可以下沉为 `api/TestProgram` 的内部实现，不再单独作为公共概念暴露；后续可以根据需要调整实现细节，而不影响上层使用。

- 文档视角：
  - 本文件作为 `@logix/test` 的 SSoT 规格；
  - apps/docs 中则以「如何测试一个 Counter Module / 多模块联动场景」的教程形式出现，示例代码统一采用原生 Effect + `@effect/vitest` 写法，并在必要处引用本规格中的名词。 
