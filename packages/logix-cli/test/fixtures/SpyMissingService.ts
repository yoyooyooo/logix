import { Context, Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

export const SpyMissingServiceTag = Context.GenericTag<{ readonly n: number }>('@logixjs/test/SpyMissingService')

const Mod = Logix.Module.make('CliFixture.SpyMissingService', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: {},
})

const logic = Mod.logic(($) =>
  Effect.gen(function* () {
    // Intentionally trigger a missing service read so `logix spy evidence` can surface the gap.
    yield* $.use(SpyMissingServiceTag)
  }),
)

export const Root = Mod.implement({
  initial: { ok: true },
  logics: [logic],
})

