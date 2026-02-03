import { Schema } from 'effect'
import * as Logix from '@logixjs/core'

const Counter = Logix.Module.make('CliFixture.Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  immerReducers: {
    inc: (draft) => {
      draft.count += 1
    },
  },
})

export const AppRoot = Counter.implement({
  initial: { count: 0 },
  logics: [],
})

