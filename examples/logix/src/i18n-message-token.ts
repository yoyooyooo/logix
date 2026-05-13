/**
 * @scenario I18n · Message Token（可回放）+ 语言切换演示
 * @description
 *   - Module Logic 产出 message token 写入 state（可序列化/可回放）；
 *   - 展示边界通过 `service.render(...)` 生成最终字符串；
 *   - 切换语言后，token 不变，但展示结果随语言变化更新。
 *   - 脚本末尾直接从当前 runtime scope 读取 `I18nTag`，验证 runtime 内的 service 读取与渲染链路。
 */

import * as Logix from '@logixjs/core'
import { Effect, Schema, SubscriptionRef } from 'effect'
import { I18n, I18nTag, token, type I18nMessageToken } from '@logixjs/i18n'

type Resources = Readonly<Record<string, Readonly<Record<string, string>>>>
type DriverEvent = 'initialized' | 'languageChanged'
type DriverHandler = (...args: ReadonlyArray<unknown>) => void
type LocalI18nDriver = Parameters<typeof I18n.layer>[0]

const createDriver = (resources: Resources, initialLanguage: string): LocalI18nDriver => {
  let language = initialLanguage
  const handlers: Record<DriverEvent, Set<DriverHandler>> = {
    initialized: new Set<DriverHandler>(),
    languageChanged: new Set<DriverHandler>(),
  }

  return {
    get language() {
      return language
    },
    isInitialized: true,
    t: (key: string) => {
      const table = resources[language] ?? {}
      const hit = table[key]
      if (typeof hit === 'string') return hit
      return key
    },
    changeLanguage: (next: string) => {
      language = next
      for (const h of handlers.languageChanged) {
        h(next)
      }
    },
    on: (event: DriverEvent, handler: DriverHandler) => {
      handlers[event].add(handler)
    },
    off: (event: DriverEvent, handler: DriverHandler) => {
      handlers[event].delete(handler)
    },
  }
}

const Demo = Logix.Module.make('demo.I18nMessageToken', {
  state: Schema.Struct({
    token: Schema.optional(Schema.Any),
  }),
  actions: {
    setRequiredToken: Schema.Void,
  },
})

const DemoLogic = Demo.logic('demo-logic', ($) =>
  Effect.gen(function* () {
    const writeToken = () =>
      $.state.mutate((draft) => {
        ;(draft as any).token = token('form.required', { field: 'name' })
      })

    yield* $.onAction('setRequiredToken').runFork(writeToken)
    yield* writeToken()
  }),
)

const DemoProgram = Logix.Program.make(Demo, {
  initial: { token: undefined },
  logics: [DemoLogic],
})

const resources: Resources = {
  en: { 'form.required': 'Required' },
  zh: { 'form.required': '必填' },
}

const driver = createDriver(resources, 'en')
const runtime = Logix.Runtime.make(DemoProgram, {
  layer: I18n.layer(driver),
})

const program = Effect.scoped(
  Effect.gen(function* () {
    const svc = yield* Effect.service(I18nTag).pipe(Effect.orDie)
    const demo = yield* Effect.service(Demo.tag).pipe(Effect.orDie)

    const token0 = (yield* demo.getState as any).token as I18nMessageToken
    console.log('[en] token:', JSON.stringify(token0))
    console.log('[en] render:', svc.render(token0, { fallback: 'Required' }))

    yield* svc.changeLanguage('zh')

    const token1 = (yield* demo.getState as any).token as I18nMessageToken
    console.log('[zh] token:', JSON.stringify(token1))
    console.log('[zh] render:', svc.render(token1, { fallback: 'Required' }))
    console.log('[token-stable]', JSON.stringify(token0) === JSON.stringify(token1))

    // 展示边界也可以选择订阅快照变化来触发重渲染
    const latestSnap = yield* SubscriptionRef.get(svc.snapshot)
    console.log('[snapshot]', latestSnap)
  }),
)

void runtime.runPromise(program as Effect.Effect<void, never, never>).finally(() => runtime.dispose())
