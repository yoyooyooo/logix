/**
 * @scenario Fluent Intent · 本地 Store 示例
 * @description
 *   演示使用 Universal Bound API (`$`) + Fluent DSL（`$.onAction`）
 *   在单个 Store 内编排典型逻辑：
 *   - 基于 Action 更新 State；
 *   - 基于 State 派生字段。
 */

import { Effect, Schema } from 'effect'
import { Logix } from '../shared/logix-v3-core'

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
// Live：组合 State 与 Logic，生成运行时 Layer
// ---------------------------------------------------------------------------

export const CounterLiveFluent = CounterModule.live(
  {
    count: 0,
    hasValue: false,
  },
  CounterLogic,
)
