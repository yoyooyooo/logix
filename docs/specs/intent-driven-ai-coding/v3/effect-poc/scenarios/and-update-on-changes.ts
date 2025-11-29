/**
 * @scenario Fluent Intent · State 联动示例
 * @description
 *   演示如何在单 Store 内使用 Fluent DSL（`$.onState + $.state.update`）
 *   表达典型的「State → State」派生规则：
 *     - 监听 results 字段的变化；
 *     - 自动维护 hasResults 派生标记。
 */

import { Effect, Schema } from 'effect'
import { Logix } from '../shared/logix-v3-core'

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

export type DerivedShape = Logix.Shape<typeof DerivedStateSchema, typeof DerivedActionMap>
export type DerivedState = Logix.StateOf<DerivedShape>
export type DerivedAction = Logix.ActionOf<DerivedShape>

// ---------------------------------------------------------------------------
// Module：使用 Logix.Module 定义派生场景模块
// ---------------------------------------------------------------------------

export const CounterModule = Logix.Module('CounterModule', {
  state: DerivedStateSchema,
  actions: DerivedActionMap,
})

// ---------------------------------------------------------------------------
// Logic：使用 Fluent DSL 维护派生字段（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const CounterLogic = CounterModule.logic(($) =>
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
// Live：组合初始 State 与 Logic
// ---------------------------------------------------------------------------

export const DerivedLive = CounterModule.live(
  {
    results: [],
    hasResults: false,
  },
  CounterLogic,
)
