import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  count: Schema.Number,
})

const BasicModule = Logix.Module.make('CliBasicProgram', {
  state: State,
  actions: {
    noop: Schema.Void,
  },
  reducers: {
    noop: (s: { readonly count: number }) => s,
  },
})

const BasicLogic = BasicModule.logic('noop', () => Effect.void)

export const BasicProgram = Logix.Program.make(BasicModule, {
  initial: { count: 0 },
  logics: [BasicLogic],
})

export const BasicModuleOnly = BasicModule
export const BasicLogicOnly = BasicLogic
