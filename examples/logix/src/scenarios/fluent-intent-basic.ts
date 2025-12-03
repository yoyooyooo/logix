/**
 * @scenario Fluent Intent · 本地 Store 示例
 * @description
 *   演示使用 Universal Bound API (`$`) + Fluent DSL（`$.onAction`）
 *   在单个 Store 内编排典型逻辑：
 *   - 基于 Action 更新 State；
 *   - 基于 State 派生字段。
 */

import { Effect, Schema, Stream } from 'effect'
import { fileURLToPath } from 'node:url'
import { Logix } from '@logix/core'

// ---------------------------------------------------------------------------
// Schema → Shape：计数器带派生字段
// ---------------------------------------------------------------------------

const CounterStateSchema = Schema.Struct({
  count: Schema.Number,
  hasValue: Schema.Boolean,
})

const CounterActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

type CounterShape = Logix.Shape<typeof CounterStateSchema, typeof CounterActionMap>

// ---------------------------------------------------------------------------
// Module：使用 Logix.Module 定义模块身份与契约
// ---------------------------------------------------------------------------

export const CounterModule = Logix.Module('CounterModule', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

// ---------------------------------------------------------------------------
// Logic：使用 $.onAction 编排逻辑（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    // 1. 监听 inc / dec Action，更新 count
    yield* $.onAction('inc').run(
      $.state.update((prev) => ({
        ...prev,
        count: prev.count + 1,
      })),
    )

    yield* $.onAction('dec').run(
      $.state.update((prev) => ({
        ...prev,
        count: prev.count - 1,
      })),
    )

    // 2. 监听 count 派生 hasValue 字段
    yield* $.onState((s) => s.count).run(
      $.state.update((prev) => ({
        ...prev,
        hasValue: prev.count !== 0,
      })),
    )
  }),
)

// ---------------------------------------------------------------------------
// Impl / Live：组合 State 与 Logic，生成运行时实现
// ---------------------------------------------------------------------------

export const CounterFluentImpl = CounterModule.make({
  initial: {
    count: 0,
    hasValue: false,
  },
  logics: [CounterLogic],
})

export const CounterLiveFluent = CounterFluentImpl.layer

// ---------------------------------------------------------------------------
// Demo: Simulation
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const program = Effect.gen(function* () {
    const runtime = yield* CounterModule

    // Log state changes
    yield* Effect.fork(
      runtime.changes((s) => s).pipe(
        Stream.runForEach((s) => Effect.log(`[State] count=${s.count}, hasValue=${s.hasValue}`))
      )
    )

    yield* Effect.log('--- Start ---')

    yield* Effect.log('Dispatching inc...')
    yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
    yield* Effect.sleep(10) // Yield to allow state update

    yield* Effect.log('Dispatching inc...')
    yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
    yield* Effect.sleep(10)

    yield* Effect.log('Dispatching dec...')
    yield* runtime.dispatch({ _tag: 'dec', payload: undefined })
    yield* Effect.sleep(10)

    yield* Effect.log('Dispatching dec...')
    yield* runtime.dispatch({ _tag: 'dec', payload: undefined })
    yield* Effect.sleep(10)

    yield* Effect.log('--- End ---')
  })

  void Effect.runPromise(
    program.pipe(Effect.provide(CounterLiveFluent)) as Effect.Effect<void, never, never>
  )
}
