/**
 * @pattern Logic Fields · 复用示例 (Field Reuse Pattern)
 * @description
 *   演示 `$.fields(...)` 的最小可复用形态：
 *   - 将一组可组合的字段声明封装为共享常量；
 *   - 在 Logic builder 的同步声明区声明字段行为，使 Logic 成为“携带字段行为能力”的复用单元；
 *   - 同一套 Logic Pattern 可在多个 Module 上复用（前提：Shape 兼容）。
 */

import { Effect, Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '@logixjs/core'

export const FieldReuseStateSchema = Schema.Struct({
  base: Schema.Number,
  derived: Schema.Number,
})

export const FieldReuseActionMap = {
  'base/set': Schema.Number,
}

export type FieldReuseShape = Logix.Module.Shape<typeof FieldReuseStateSchema, typeof FieldReuseActionMap>

/**
 * makeFieldReuseModule：
 * - 便捷工厂：为示例场景生成一个可运行的 Module（包含 primary reducer）。
 */
export const makeFieldReuseModule = (id: string) =>
  Logix.Module.make(id, {
    state: FieldReuseStateSchema,
    actions: FieldReuseActionMap,
    immerReducers: {
      'base/set': (draft, payload) => {
        draft.base = payload
      },
    },
  })

/**
 * sharedFields：
 * - 这里复用 `FieldSpec` 结构，作为 023 的最小字段声明落点；
 * - 通过 computed 把 derived 绑定为 base+1，便于在示例中观测字段行为的效果。
 */
export const sharedFields = FieldContracts.fieldFrom(FieldReuseStateSchema)({
  derived: FieldContracts.fieldComputed({
    deps: ['base'],
    get: (base) => base + 1,
  }),
})

/**
 * makeFieldReuseLogicPattern：
 * - 在 builder 的同步声明区声明 sharedFields；
 * - 返回的 run effect 不做任何事（字段行为由 Program 安装后接管）。
 */
export const makeFieldReuseLogicPattern = () => ($: any) => {
  $.fields(sharedFields)
  return Effect.void
}
