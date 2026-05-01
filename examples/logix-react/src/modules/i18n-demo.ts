import { Effect, Schema, SubscriptionRef } from 'effect'
import * as Logix from '@logixjs/core'
import { I18nTag, token, type I18nMessageToken } from '@logixjs/i18n'

const I18nTokenParamsSchema = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Boolean, Schema.Number, Schema.Null]),
)

const I18nMessageTokenSchema = Schema.Struct({
  _tag: Schema.Literal('i18n'),
  key: Schema.String,
  params: Schema.optional(I18nTokenParamsSchema),
})

const I18nSnapshotStateSchema = Schema.Struct({
  language: Schema.String,
  init: Schema.Literals(['pending', 'ready', 'failed']),
  seq: Schema.Number,
})

const I18nDerivedSchema = Schema.Struct({
  snapshot: I18nSnapshotStateSchema,
  rendered: Schema.String,
})

const I18nDemoStateSchema = Schema.Struct({
  name: Schema.String,
  token: Schema.optional(I18nMessageTokenSchema),
  derived: I18nDerivedSchema,
})

const I18nDemoActionMap = {
  setName: Schema.String,
  setLanguage: Schema.Literals(['en', 'zh']),
}

export type I18nDemoShape = Logix.Module.Shape<typeof I18nDemoStateSchema, typeof I18nDemoActionMap>

export const I18nDemo = Logix.Module.make('I18nDemoModule', {
  state: I18nDemoStateSchema,
  actions: I18nDemoActionMap,
})

const GreetingKey = 'demo.greeting'

const greetingParams = (name: string) => ({
  name,
})

const greetingFallback = (name: string) => `Hello, ${name}!`

const makeToken = (name: string) => token(GreetingKey, greetingParams(name))

const renderGreeting = (
  name: string,
  i18n: {
    readonly render: (token: I18nMessageToken, hints?: { readonly fallback?: string }) => string
  },
) => i18n.render(makeToken(name), { fallback: greetingFallback(name) })

export const I18nDemoLogic = I18nDemo.logic('i18n-demo-logic', ($) =>
  Effect.gen(function* () {
    const i18n = yield* $.use(I18nTag)

    const snapshot0 = yield* SubscriptionRef.get(i18n.snapshot)

    // 初始 token（只表达“要翻译什么”）；同时派生一份“由 Logic 计算的最终文案”以演示语言变化同步。
    yield* $.state.mutate((draft) => {
      draft.token = makeToken(draft.name)
      draft.derived = {
        snapshot: snapshot0,
        rendered: renderGreeting(draft.name, i18n),
      }
    })

    const onName = $.onAction('setName').mutate((draft, action) => {
      const name = action.payload
      draft.name = name
      draft.token = makeToken(name)
      draft.derived.rendered = renderGreeting(name, i18n)
    })

    const onLanguage = $.onAction('setLanguage').runLatestTask({
      effect: (action) => i18n.changeLanguage(action.payload),
    })

    const onSnapshot = $.on(SubscriptionRef.changes(i18n.snapshot)).mutate((draft, snapshot) => {
      draft.derived.snapshot = snapshot
      draft.derived.rendered = renderGreeting(draft.name, i18n)
    })

    yield* Effect.all([onName, onLanguage, onSnapshot], { concurrency: 'unbounded' })
  }),
)

export const I18nDemoProgram = Logix.Program.make(I18nDemo, {
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
