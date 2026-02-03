import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

import { SvcDyn } from './service.js'

export const ModDegrade = Logix.Module.make('modDegrade', {
  state: Schema.Struct({}),
  actions: {},
  dev: { source: { file: 'mod.ts', line: 1, column: 1 } },
})

export const Logic = ModDegrade.logic(($) =>
  Effect.gen(function* () {
    // Indirect/dynamic alias: should degrade (宁可漏不乱补), so no services autofill candidate should be produced.
    const Dyn = SvcDyn
    yield* $.use(Dyn)
  }),
)

