/**
 * @scenario Fluent Intent · State 联动示例
 * @description
 *   演示如何在单 Store 内使用 Fluent DSL（`$.onState + $.state.update`）
 *   表达典型的「State → State」派生规则：
 *     - 监听 results 字段的变化；
 *     - 自动维护 hasResults 派生标记。
 */

import { Effect, Schema, Stream } from 'effect'
import { fileURLToPath } from 'node:url'
import * as Logix from '@logixjs/core'
import { programLayer } from '../runtime/programLayer.js'

// ---------------------------------------------------------------------------
// Schema → Shape：包含派生标记的简单 State
// ---------------------------------------------------------------------------

const DerivedStateSchema = Schema.Struct({
  results: Schema.Array(Schema.String),
  hasResults: Schema.Boolean,
})

// Action 在本示例中仅作为占位，不参与逻辑
const DerivedActionMap = {
  noop: Schema.Void,
}

export type DerivedShape = Logix.Module.Shape<typeof DerivedStateSchema, typeof DerivedActionMap>
export type DerivedState = Logix.Module.StateOf<DerivedShape>
export type DerivedAction = Logix.Module.ActionOf<DerivedShape>

// ---------------------------------------------------------------------------
// Module：使用 Logix.Module 定义派生场景模块
// ---------------------------------------------------------------------------

export const Counter = Logix.Module.make('CounterModule', {
  state: DerivedStateSchema,
  actions: DerivedActionMap,
})

// ---------------------------------------------------------------------------
// Logic：使用 Fluent DSL 维护派生字段（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const CounterLogic = Counter.logic('counter-logic', ($) =>
  Effect.gen(function* () {
    // 监听 results.length 变化，并维护 hasResults
    yield* $.onState((s) => s.results.length).run(
      $.state.update((prev) => ({
        ...prev,
        hasResults: prev.results.length > 0,
      })),
    )
  }),
)

// ---------------------------------------------------------------------------
// Program / Layer：组合初始 State 与 Logic
// ---------------------------------------------------------------------------

export const DerivedProgram = Logix.Program.make(Counter, {
  initial: {
    results: [],
    hasResults: false,
  },
  logics: [CounterLogic],
})

export const DerivedLayer = programLayer(DerivedProgram)

// ---------------------------------------------------------------------------
// Demo: Simulation
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const program = Effect.gen(function* () {
    const runtime = yield* Effect.service(Counter.tag).pipe(Effect.orDie)

    // Log state changes
    yield* Effect.forkChild(runtime
      .changes((s: any) => s)
      .pipe(Stream.runForEach((s: any) => Effect.log(`[State] results=[${s.results}], hasResults=${s.hasResults}`))))

    yield* Effect.log('--- Start ---')

    // Simulate state updates via controlled runtime API.
    const setResults = (results: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const prev = yield* runtime.getState
        yield* runtime.setState({
          ...prev,
          results: Array.from(results),
        })
      })

    yield* Effect.log('Updating results to ["a"]...')
    yield* setResults(['a'])
    yield* Effect.sleep(10)

    yield* Effect.log('Updating results to []...')
    yield* setResults([])
    yield* Effect.sleep(10)

    yield* Effect.log('Updating results to ["a", "b"]...')
    yield* setResults(['a', 'b'])
    yield* Effect.sleep(10)

    yield* Effect.log('--- End ---')
  })

  void Effect.runPromise(program.pipe(Effect.provide(DerivedLayer)) as Effect.Effect<void, never, never>)
}
