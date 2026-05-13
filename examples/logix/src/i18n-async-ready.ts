/**
 * @scenario I18n · Async Ready（render vs renderReady）
 * @description
 *   - 外部 i18n 可能异步初始化：初始 snapshot.init="pending"；
 *   - `render`：不等待，立即返回 fallback hint 或 key；
 *   - `renderReady`：等待 ready（默认 5s，可覆盖），timeout/failed 走 fallback hint。
 *   - 脚本末尾直接从当前 runtime scope 读取 `I18nTag`，验证 runtime 内的 async-ready 行为。
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/i18n-async-ready.ts
 */
import * as Logix from '@logixjs/core'
import { Effect, Schema, SubscriptionRef } from 'effect'
import { fileURLToPath } from 'node:url'
import { I18n, I18nTag, token } from '@logixjs/i18n'

type DriverEvent = 'initialized' | 'languageChanged'
type DriverHandler = (...args: ReadonlyArray<unknown>) => void
type LocalI18nDriver = Parameters<typeof I18n.layer>[0]

const I18nSnapshotStateSchema = Schema.Struct({
  language: Schema.String,
  init: Schema.Literals(['pending', 'ready', 'failed']),
  seq: Schema.Number,
})

const makeAsyncInitDriver = (initial: { readonly language: string; readonly initialized: boolean }) => {
  let language = initial.language
  let initialized = initial.initialized
  let rejectChangeLanguage = false

  const resources: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    en: {
      hello: 'Hello (ready)',
    },
    zh: {
      hello: '你好',
    },
  }

  const handlers: Record<DriverEvent, Set<DriverHandler>> = {
    initialized: new Set<DriverHandler>(),
    languageChanged: new Set<DriverHandler>(),
  }

  const emitInitialized = () => {
    initialized = true
    for (const h of handlers.initialized) {
      h()
    }
  }

  const driver: LocalI18nDriver = {
    get language() {
      return language
    },
    get isInitialized() {
      return initialized
    },
    t: (key: string) => resources[language]?.[key] ?? key,
    changeLanguage: async (next: string) => {
      if (rejectChangeLanguage) {
        throw new Error('changeLanguage rejected')
      }
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

  return {
    driver,
    emitInitialized,
    setRejectChangeLanguage: (value: boolean) => {
      rejectChangeLanguage = value
    },
  } as const
}

const Demo = Logix.Module.make('demo.I18nAsyncReady', {
  state: Schema.Struct({
    token: Schema.optional(Schema.Any),
    nowValue: Schema.String,
    readyValue: Schema.String,
    snapshot: I18nSnapshotStateSchema,
  }),
  actions: {},
})

const helloToken = token('hello')

const DemoLogic = Demo.logic('demo-logic', ($) => {
  return Effect.gen(function* () {
    const i18n = yield* $.use(I18nTag)
    const snap0 = yield* SubscriptionRef.get(i18n.snapshot)

    // 展示：snapshot 变化会触发订阅；这里用 state 承接，UI 侧可直接订阅 state。
    yield* $.on(SubscriptionRef.changes(i18n.snapshot)).runFork((snap) =>
      $.state.mutate((draft) => {
        ;(draft as any).token = helloToken
        ;(draft as any).snapshot = snap
        ;(draft as any).nowValue = i18n.render(helloToken, { fallback: 'Hello (fallback)' })
      }),
    )

    yield* $.state.mutate((draft) => {
      ;(draft as any).token = helloToken
      ;(draft as any).snapshot = snap0
      ;(draft as any).nowValue = i18n.render(helloToken, { fallback: 'Hello (fallback)' })
      ;(draft as any).readyValue = '(waiting...)'
    })

    const value = yield* i18n.renderReady(helloToken, { fallback: 'Hello (fallback)' }, 1000)
    yield* $.state.mutate((draft) => {
      ;(draft as any).readyValue = value
    })
  })
})

const DemoProgram = Logix.Program.make(Demo, {
  initial: {
    token: undefined,
    nowValue: '',
    readyValue: '',
    snapshot: { language: 'unknown', init: 'pending', seq: 0 },
  },
  logics: [DemoLogic],
})

const ctl = makeAsyncInitDriver({ language: 'en', initialized: false })
const runtime = Logix.Runtime.make(DemoProgram, {
  layer: I18n.layer(ctl.driver),
})

export const main = Effect.scoped(
  Effect.gen(function* () {
    const i18n = yield* Effect.service(I18nTag).pipe(Effect.orDie)
    const demo = yield* Effect.service(Demo.tag).pipe(Effect.orDie)

    yield* Effect.yieldNow
    const s0: any = yield* demo.getState
    console.log('[pending] snapshot:', s0.snapshot)
    console.log('[pending] token:', JSON.stringify(s0.token))
    console.log('[pending] state.nowValue:', s0.nowValue)
    console.log('[pending] state.readyValue:', s0.readyValue)
    console.log('[pending] render(now):', i18n.render(helloToken, { fallback: 'Hello (fallback)' }))

    yield* Effect.sleep('50 millis')
    ctl.emitInitialized()

    for (let i = 0; i < 20; i++) {
      yield* Effect.sleep('10 millis')
      const s: any = yield* demo.getState
      if (typeof s.readyValue === 'string' && s.readyValue !== '(waiting...)') break
    }

    const s1: any = yield* demo.getState
    console.log('[ready] snapshot:', s1.snapshot)
    console.log('[ready] token:', JSON.stringify(s1.token))
    console.log('[ready] state.nowValue:', s1.nowValue)
    console.log('[ready] state.readyValue:', s1.readyValue)
    console.log('[ready] render(now):', i18n.render(helloToken, { fallback: 'Hello (fallback)' }))

    ctl.setRejectChangeLanguage(true)
    yield* i18n.changeLanguage('ja')

    const s2: any = yield* demo.getState
    console.log('[failed] snapshot:', s2.snapshot)
    console.log('[failed] token:', JSON.stringify(s2.token))
    console.log('[failed] render(now):', i18n.render(helloToken, { fallback: 'Hello (fallback)' }))
    console.log('[failed] renderReady:', yield* i18n.renderReady(helloToken, { fallback: 'Hello (fallback)' }, 10))
  }),
)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runtime.runPromise(main as any).finally(() => runtime.dispose())
}
