/**
 * @pattern Logic Traits · 复用示例 (Traits Reuse Pattern)
 * @description
 *   演示 `$.traits.declare` 的最小可复用形态：
 *   - 将一组可组合的 traits（这里复用 StateTraitSpec 结构）封装为共享常量；
 *   - 在 Logic.setup 中声明 traits，使 Logic 成为“携带 traits 能力”的复用单元；
 *   - 同一套 Logic Pattern 可在多个 Module 上复用（前提：Shape 兼容）。
 */

import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

export const TraitsReuseStateSchema = Schema.Struct({
  base: Schema.Number,
  derived: Schema.Number,
})

export const TraitsReuseActionMap = {
  'base/set': Schema.Number,
}

export type TraitsReuseShape = Logix.Shape<typeof TraitsReuseStateSchema, typeof TraitsReuseActionMap>

/**
 * makeTraitsReuseModule：
 * - 便捷工厂：为示例场景生成一个可运行的 Module（包含 primary reducer）。
 */
export const makeTraitsReuseModule = (id: string) =>
  Logix.Module.make(id, {
    state: TraitsReuseStateSchema,
    actions: TraitsReuseActionMap,
    immerReducers: {
      'base/set': (draft, payload) => {
        draft.base = payload
      },
    },
  })

/**
 * sharedTraits：
 * - 这里复用 `StateTraitSpec` 结构，作为 023 的“最小 TraitSpec”落点；
 * - 通过 computed 把 derived 绑定为 base+1，便于在示例中观测 traits 的效果。
 */
export const sharedTraits = Logix.StateTrait.from(TraitsReuseStateSchema)({
  derived: Logix.StateTrait.computed({
    deps: ['base'],
    get: (base) => base + 1,
  }),
})

/**
 * makeTraitsReuseLogicPattern：
 * - 在 setup 阶段声明 sharedTraits；
 * - run 段不做任何事（traits 行为由 Program 安装后接管）。
 */
export const makeTraitsReuseLogicPattern = () => ($: any) => ({
  setup: Effect.sync(() => {
    $.traits.declare(sharedTraits)
  }),
  run: Effect.void,
})
