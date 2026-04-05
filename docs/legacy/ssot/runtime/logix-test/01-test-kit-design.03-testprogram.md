# 2.2 `TestProgram`（场景级 DSL）

`TestProgram` 是业务开发的推荐入口：通过 **声明式配置** 描述一个 Logix 场景，再在场景上运行一个 Effect 测试程序。

```ts
import { TestProgram, Execution, runTest } from "@logixjs/test"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "@logixjs/core"

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
    module: Logix.ModuleTagType<any, Sh>
    initial: Logix.StateOf<Sh>
    logics?: ReadonlyArray<Logix.ModuleLogic<Sh, any, any>>
  }
  modules?: ReadonlyArray<{
    module: Logix.ModuleTagType<any, Logix.AnyModuleShape>
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

### 2.2.1 TestApi 能力

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

### 2.2.2 两种使用姿势

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
