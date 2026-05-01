import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  count: Schema.Number,
})

export const Counter = Logix.Module.make('CliPlaygroundCounter', {
  state: State,
  actions: {
    noop: Schema.Void,
  },
  reducers: {
    noop: (s: { readonly count: number }) => s,
  },
})

export const CounterLogic = Counter.logic('noop', () => Effect.void)

export const AppRoot = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
