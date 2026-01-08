import { Effect, Schema, SubscriptionRef } from 'effect'
import * as Logix from '@logixjs/core'
import { I18nSnapshotSchema, I18nTag, type I18nMessageToken } from '@logixjs/i18n'

const I18nTokenOptionsSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Union(Schema.String, Schema.Boolean, Schema.Number, Schema.Null),
})

const I18nMessageTokenSchema = Schema.Struct({
  _tag: Schema.Literal('i18n'),
  key: Schema.String,
  options: Schema.optional(I18nTokenOptionsSchema),
})

const I18nDerivedSchema = Schema.Struct({
  snapshot: I18nSnapshotSchema,
  rendered: Schema.String,
})

const I18nDemoStateSchema = Schema.Struct({
  name: Schema.String,
  token: Schema.optional(I18nMessageTokenSchema),
  derived: I18nDerivedSchema,
})

const I18nDemoActionMap = {
  setName: Schema.String,
  setLanguage: Schema.Literal('en', 'zh'),
}

export type I18nDemoShape = Logix.Shape<typeof I18nDemoStateSchema, typeof I18nDemoActionMap>

export const I18nDemoDef = Logix.Module.make('I18nDemoModule', {
  state: I18nDemoStateSchema,
  actions: I18nDemoActionMap,
})

const GreetingKey = 'demo.greeting'

const greetingOptions = (name: string) => ({
  name,
  defaultValue: 'Hello, {{name}}!',
})

const makeToken = (
  name: string,
  i18n: {
    readonly token: (key: string, options?: any) => I18nMessageToken
    readonly t: (key: string, options?: any) => string
  },
) => i18n.token(GreetingKey, greetingOptions(name))

const renderGreeting = (
  name: string,
  i18n: {
    readonly token: (key: string, options?: any) => I18nMessageToken
    readonly t: (key: string, options?: any) => string
  },
) => i18n.t(GreetingKey, greetingOptions(name))

export const I18nDemoLogic = I18nDemoDef.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const i18n = yield* $.root.resolve(I18nTag)

    const snapshot0 = yield* SubscriptionRef.get(i18n.snapshot)

    // 初始 token（只表达“要翻译什么”）；同时派生一份“由 Logic 计算的最终文案”以演示语言变化同步。
    yield* $.state.mutate((draft) => {
      draft.token = makeToken(draft.name, i18n)
      draft.derived = {
        snapshot: snapshot0,
        rendered: renderGreeting(draft.name, i18n),
      }
    })

    const onName = $.onAction('setName').mutate((draft, action) => {
      const name = action.payload
      draft.name = name
      draft.token = makeToken(name, i18n)
      draft.derived.rendered = renderGreeting(name, i18n)
    })

    const onLanguage = $.onAction('setLanguage').runLatestTask({
      effect: (action) => i18n.changeLanguage(action.payload),
    })

    const onSnapshot = $.on(i18n.snapshot.changes).mutate((draft, snapshot) => {
      draft.derived.snapshot = snapshot
      draft.derived.rendered = renderGreeting(draft.name, i18n)
    })

    yield* Effect.all([onName, onLanguage, onSnapshot], { concurrency: 'unbounded' })
  }),
}))

export const I18nDemoModule = I18nDemoDef.implement({
  initial: {
    name: 'Logix',
    token: undefined,
    derived: {
      snapshot: { language: '', init: 'pending', seq: 0 },
      rendered: '',
    },
  },
  logics: [I18nDemoLogic],
})
