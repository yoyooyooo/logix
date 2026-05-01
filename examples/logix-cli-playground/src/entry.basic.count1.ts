import * as Logix from '@logixjs/core'

import { Counter, CounterLogic } from './entry.basic.js'

export const AppRoot = Logix.Program.make(Counter, {
  initial: { count: 1 },
  logics: [CounterLogic],
})
