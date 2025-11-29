/**
 * @scenario Fluent Intent · Action → State 表单脏标记示例
 * @description
 *   演示如何通过 Fluent DSL（`$.onAction + $.state.update`）
 *   表达典型的「Action → State」规则：
 *     - input/change 带 payload 更新 value，并标记 isDirty = true；
 *     - input/reset 将表单重置为初始状态，并清空 isDirty。
 */

import { Effect, Schema } from 'effect'
import { Logix } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：带脏标记的简单表单 State / Action
// ---------------------------------------------------------------------------

const DirtyFormStateSchema = Schema.Struct({
  value: Schema.String,
  isDirty: Schema.Boolean,
})

const DirtyFormActionMap = {
  'input/change': Schema.String,
  'input/reset': Schema.Void,
}

export type DirtyFormShape = Logix.Shape<typeof DirtyFormStateSchema, typeof DirtyFormActionMap>
export type DirtyFormState = Logix.StateOf<DirtyFormShape>
export type DirtyFormAction = Logix.ActionOf<DirtyFormShape>

// ---------------------------------------------------------------------------
// Module：使用 Logix.Module 定义表单模块
// ---------------------------------------------------------------------------

export const FormModule = Logix.Module('FormModule', {
  state: DirtyFormStateSchema,
  actions: DirtyFormActionMap,
})

// ---------------------------------------------------------------------------
// Logic：使用 Fluent DSL 表达「事件 → 状态更新」意图（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const FormLogic = FormModule.logic(($) =>
  Effect.all([
    // 监听 input/change，更新 value 并标记为脏
    $.onAction("input/change")
      .run((action) =>
        $.state.update((prev) => ({
          ...prev,
          value: action.payload,
          isDirty: true,
        })),
      ),

    // 监听 input/reset，重置 value 和 isDirty
    $.onAction('input/reset')
      .run(() =>
        $.state.update(() => ({
          value: '',
          isDirty: false,
          })),
      ),
  ]),
)

// ---------------------------------------------------------------------------
// Live：组合初始 State 与 Logic，生成可注入的运行时 Layer
// ---------------------------------------------------------------------------

export const DirtyFormLive = FormModule.live(
  {
    value: '',
    isDirty: false,
  },
  FormLogic,
)
