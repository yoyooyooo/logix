/**
 * @scenario I18n · Message Token（可回放）+ 语言切换演示
 * @description
 *   - Module Logic 通过 `$.root.resolve(I18nTag)` 拿到 tree-scoped I18n service；
 *   - 产出 message token 写入 state（可序列化/可回放）；展示边界再翻译成最终字符串；
 *   - 切换语言后，token 不变，但展示结果随语言变化更新。
 */

import * as Logix from '@logix/core'
import { Effect, Layer, Schema, SubscriptionRef } from 'effect'
import { I18n, I18nTag, type I18nDriver, type I18nMessageToken } from '@logix/i18n'

type Resources = Readonly<Record<string, Readonly<Record<string, string>>>>

const createDriver = (resources: Resources, initialLanguage: string): I18nDriver => {
  let language = initialLanguage
  const handlers = {
    initialized: new Set<(...args: any[]) => void>(),
    languageChanged: new Set<(...args: any[]) => void>(),
  }

  return {
    get language() {
      return language
    },
    isInitialized: true,
    t: (key: string, options?: unknown) => {
      const table = resources[language] ?? {}
      const hit = table[key]

      const defaultValue = options && typeof options === 'object' ? (options as any).defaultValue : undefined

      if (typeof hit === 'string') return hit
      if (typeof defaultValue === 'string') return defaultValue
      return key
    },
    changeLanguage: (next: string) => {
      language = next
      for (const h of handlers.languageChanged) {
        h(next)
      }
    },
    on: (event, handler) => {
      handlers[event].add(handler)
    },
    off: (event, handler) => {
      handlers[event].delete(handler)
    },
  }
}

const renderToken = (driver: I18nDriver, token: I18nMessageToken): string => driver.t(token.key, token.options)

const DemoDef = Logix.Module.make('demo.I18nMessageToken', {
  state: Schema.Struct({
    token: Schema.optional(Schema.Any),
  }),
  actions: {
    setRequiredToken: Schema.Void,
  },
})

const DemoLogic = DemoDef.logic(($) =>
  Effect.gen(function* () {
    const i18n = yield* $.root.resolve(I18nTag)

    const writeToken = () =>
      $.state.mutate((draft) => {
        ;(draft as any).token = i18n.token('form.required', {
          field: 'name',
          defaultValue: 'Required',
        })
      })

    yield* $.onAction('setRequiredToken').runFork(writeToken)
    yield* writeToken()
  }),
)

const DemoImpl = DemoDef.implement({
  initial: { token: undefined },
  logics: [DemoLogic],
}).impl

const resources: Resources = {
  en: { 'form.required': 'Required' },
  zh: { 'form.required': '必填' },
}

const driver = createDriver(resources, 'en')
const runtime = Logix.Runtime.make(DemoImpl, {
  layer: I18n.layer(driver),
})

const program = Effect.scoped(
  Effect.gen(function* () {
    const svc = yield* Logix.Root.resolve(I18nTag)
    const demo = yield* DemoDef.tag

    const token0 = (yield* demo.getState as any).token as I18nMessageToken
    console.log('[en] token:', JSON.stringify(token0))
    console.log('[en] render:', renderToken(svc.instance, token0))

    yield* svc.changeLanguage('zh')

    const token1 = (yield* demo.getState as any).token as I18nMessageToken
    console.log('[zh] token:', JSON.stringify(token1))
    console.log('[zh] render:', renderToken(svc.instance, token1))

    // 展示边界也可以选择订阅快照变化来触发重渲染
    const latestSnap = yield* SubscriptionRef.get(svc.snapshot)
    console.log('[snapshot]', latestSnap)
  }),
)

void runtime.runPromise(program as Effect.Effect<void, never, never>).finally(() => runtime.dispose())
