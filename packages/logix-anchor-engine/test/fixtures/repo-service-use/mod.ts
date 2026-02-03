import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

import { UserApi } from './service.js'

export const ModUse = Logix.Module.make('modUse', {
  state: Schema.Struct({}),
  actions: {},
})

export const Logic = ModUse.logic(($) =>
  Effect.gen(function* () {
    yield* $.use(UserApi)

    const Dyn = UserApi
    yield* $.use(Dyn)
  }),
)

