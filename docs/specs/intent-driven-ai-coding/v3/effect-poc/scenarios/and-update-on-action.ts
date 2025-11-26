/**
 * @scenario Flow.andUpdateOnAction 表单脏标记示例
 * @description 演示如何通过 andUpdateOnAction 监听某类 Action 并更新 State。
 *
 * 场景：
 *   - State 中有表单值 value 与 isDirty 标记；
 *   - input/change 带 payload 更新 value，并标记 isDirty = true；
 *   - input/reset 将表单重置为初始状态，并清空 isDirty。
 */

import { Effect, Schema } from 'effect'
import { Store, Logic, Intent } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：带脏标记的简单表单 State / Action
// ---------------------------------------------------------------------------

const DirtyFormStateSchema = Schema.Struct({
  value: Schema.String,
  isDirty: Schema.Boolean,
})

const DirtyFormActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('input/change'), payload: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('input/reset') }),
)

export type DirtyFormShape = Store.Shape<typeof DirtyFormStateSchema, typeof DirtyFormActionSchema>
export type DirtyFormState = Store.StateOf<DirtyFormShape>
export type DirtyFormAction = Store.ActionOf<DirtyFormShape>

// ---------------------------------------------------------------------------
// Logic：使用 Intent.andUpdateOnAction 直接表达「事件 → 状态更新」意图
// ---------------------------------------------------------------------------

export const DirtyFormLogic = Logic.make<DirtyFormShape>(() =>
  Effect.all([
    // 监听 input/change，更新 value 并标记为脏
    Intent.andUpdateOnAction<DirtyFormShape, never, { _tag: 'input/change'; payload: string }>(
      (a): a is { _tag: 'input/change'; payload: string } => a._tag === 'input/change',
      (action, prev) => ({
        ...prev,
        value: action.payload,
        isDirty: true,
      }),
    ),

    // 监听 input/reset，重置 value 和 isDirty
    Intent.andUpdateOnAction<DirtyFormShape, never, { _tag: 'input/reset' }>(
      (a): a is { _tag: 'input/reset' } => a._tag === 'input/reset',
      (_action, _prev) => ({
        value: '',
        isDirty: false,
      }),
    ),
  ]),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic
// ---------------------------------------------------------------------------

const DirtyFormStateLayer = Store.State.make(DirtyFormStateSchema, {
  value: '',
  isDirty: false,
})

const DirtyFormActionLayer = Store.Actions.make(DirtyFormActionSchema)

export const DirtyFormStore = Store.make<DirtyFormShape>(
  DirtyFormStateLayer,
  DirtyFormActionLayer,
  DirtyFormLogic,
)
