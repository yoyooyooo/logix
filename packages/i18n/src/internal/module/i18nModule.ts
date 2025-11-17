import * as Logix from '@logix/core'
import { Effect, Schema, SubscriptionRef } from 'effect'

import { I18nSnapshotSchema, I18nTag } from '../driver/i18n.js'

const I18nModuleDef = Logix.Module.make('@logix/i18n/I18nModule', {
  state: Schema.Struct({ snapshot: I18nSnapshotSchema }),
  actions: {
    changeLanguage: Schema.String,
  },
})

const I18nModuleLogic = I18nModuleDef.logic(($) => ({
  setup: $.lifecycle.onStart(
    Effect.gen(function* () {
      const i18n = yield* $.root.resolve(I18nTag)
      const snap = yield* SubscriptionRef.get(i18n.snapshot)
      yield* $.state.mutate((draft) => {
        ;(draft as any).snapshot = snap
      })
    }),
  ),
  run: Effect.gen(function* () {
    const i18n = yield* $.root.resolve(I18nTag)

    yield* $.on(i18n.snapshot.changes).runFork((snap) =>
      $.state.mutate((draft) => {
        ;(draft as any).snapshot = snap
      }),
    )

    yield* $.onAction('changeLanguage').runFork((action) => i18n.changeLanguage(action.payload))
  }),
}))

export const I18nModule: Logix.AnyModule = I18nModuleDef.implement({
  initial: { snapshot: { language: 'unknown', init: 'pending', seq: 0 } },
  logics: [I18nModuleLogic],
})
