/**
 * @scenario Logic Fields · Pattern 复用版（导出）
 * @description
 *   与 field-reuse.ts 使用相同的 Pattern，但只导出 Module/Logic/Program，便于在其它场景组合使用。
 */

import * as Logix from '@logixjs/core'
import { programLayer } from '../runtime/programLayer.js'
import { FieldReuseStateSchema, FieldReuseActionMap, makeFieldReuseLogicPattern } from '../patterns/field-reuse.js'

export const FieldReuseDefFromPattern = Logix.Module.make('FieldReuseFromPattern', {
  state: FieldReuseStateSchema,
  actions: FieldReuseActionMap,
  immerReducers: {
    'base/set': (draft, payload) => {
      draft.base = payload
    },
  },
})

export const FieldReuseLogicFromPattern = FieldReuseDefFromPattern.logic('field-reuse-logic-from-pattern', makeFieldReuseLogicPattern())

export const FieldReuseProgramFromPattern = Logix.Program.make(FieldReuseDefFromPattern, {
  initial: { base: 0, derived: 0 },
  logics: [FieldReuseLogicFromPattern],
})

export const FieldReuseLayerFromPattern = programLayer(FieldReuseProgramFromPattern)
