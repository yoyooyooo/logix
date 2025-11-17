# 2.4 `TestRuntime`：Runtime as a Service

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
