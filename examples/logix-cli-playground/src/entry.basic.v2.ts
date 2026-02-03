import { Schema } from 'effect'
import * as Logix from '@logixjs/core'

export const Counter = Logix.Module.make('CliPlayground.BasicV2', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
    set: Schema.Number,
    reset: Schema.Void,
  },
  immerReducers: {
    inc: (draft) => {
      draft.count += 1
    },
    set: (draft, n) => {
      draft.count = n
    },
    reset: (draft) => {
      draft.count = 0
    },
  },
})

export const AppRoot = Counter.implement({
  initial: { count: 0 },
  logics: [],
})
