/**
 * @scenario Logic Traits · Pattern 复用版（导出）
 * @description
 *   与 traits-reuse.ts 使用相同的 Pattern，但只导出 Module/Logic/Impl，便于在其它场景组合使用。
 */

import * as Logix from '@logix/core'
import { TraitsReuseStateSchema, TraitsReuseActionMap, makeTraitsReuseLogicPattern } from '../patterns/traits-reuse.js'

export const TraitsReuseDefFromPattern = Logix.Module.make('TraitsReuseFromPattern', {
  state: TraitsReuseStateSchema,
  actions: TraitsReuseActionMap,
  reducers: {
    'base/set': Logix.Module.Reducer.mutate((draft: any, action: any) => {
      draft.base = action.payload
    }),
  },
})

export const TraitsReuseLogicFromPattern = TraitsReuseDefFromPattern.logic(makeTraitsReuseLogicPattern())

export const TraitsReuseModuleFromPattern = TraitsReuseDefFromPattern.implement({
  initial: { base: 0, derived: 0 },
  logics: [TraitsReuseLogicFromPattern],
})

export const TraitsReuseImplFromPattern = TraitsReuseModuleFromPattern.impl
export const TraitsReuseLiveFromPattern = TraitsReuseImplFromPattern.layer
