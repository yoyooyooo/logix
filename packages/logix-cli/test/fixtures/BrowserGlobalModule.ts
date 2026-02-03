declare const window: any

// Intentionally access `window` at module top-level to simulate browser-only code.
// - host=node should fail with a structured error
// - host=browser-mock should allow the module to load
const _window = window
void _window

import { Schema } from 'effect'
import * as Logix from '@logixjs/core'

const Counter = Logix.Module.make('CliFixture.BrowserGlobalCounter', {
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

