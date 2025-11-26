/**
 * @scenario Flow.andUpdateOnChanges 派生状态示例
 * @description 演示如何通过 andUpdateOnChanges 监听某个 State 视图，并自动维护派生字段。
 *
 * 场景：
 *   - State 中有 results 和 hasResults；
 *   - 其他逻辑负责更新 results；
 *   - 本 Logic 只关注「results 是否为空」这个派生意图，通过 andUpdateOnChanges 自动维护 hasResults。
 */

import { Effect, Schema } from 'effect'
import { Store, Logic, Intent } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：包含派生标记的简单 State
// ---------------------------------------------------------------------------

const DerivedStateSchema = Schema.Struct({
  results: Schema.Array(Schema.String),
  hasResults: Schema.Boolean,
})

// Action 在本示例中仅作为占位，不参与逻辑
const DerivedActionSchema = Schema.Union(Schema.Struct({ _tag: Schema.Literal('noop') }))

export type DerivedShape = Store.Shape<typeof DerivedStateSchema, typeof DerivedActionSchema>
export type DerivedState = Store.StateOf<DerivedShape>
export type DerivedAction = Store.ActionOf<DerivedShape>

// ---------------------------------------------------------------------------
// Logic：使用 Intent.andUpdateOnChanges 维护派生字段
// ---------------------------------------------------------------------------

export const DerivedLogic = Logic.make<DerivedShape>(() =>
  Intent.andUpdateOnChanges<DerivedShape>(
    (s) => s.results,
    (results, prev) => ({
      ...prev,
      hasResults: results.length > 0,
    }),
  ),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic
// ---------------------------------------------------------------------------

const DerivedStateLayer = Store.State.make(DerivedStateSchema, {
  results: [],
  hasResults: false,
})

const DerivedActionLayer = Store.Actions.make(DerivedActionSchema)

export const DerivedStore = Store.make<DerivedShape>(DerivedStateLayer, DerivedActionLayer, DerivedLogic)
