/**
 * @scenario I18n · Async Ready（t vs tReady）
 * @description
 *   - 外部 i18n 可能异步初始化：初始 snapshot.init="pending"；
 *   - `t`：不等待，立即返回 fallback（defaultValue 或 key）；
 *   - `tReady`：等待 ready（默认 5s，可覆盖），timeout/failed 走 fallback。
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/i18n-async-ready.ts
 */
import * as Logix from '@logixjs/core'
import { Effect, Schema, SubscriptionRef } from 'effect'
import { fileURLToPath } from 'node:url'
import { I18n, I18nSnapshotSchema, I18nTag, type I18nDriver } from '@logixjs/i18n'

const makeAsyncInitDriver = (initial: { readonly language: string; readonly initialized: boolean }) => {
  let language = initial.language
  let initialized = initial.initialized

  const handlers = {
    initialized: new Set<(...args: any[]) => void>(),
    languageChanged: new Set<(...args: any[]) => void>(),
  }

  const emitInitialized = () => {
    initialized = true
    for (const h of handlers.initialized) {
      h()
    }
  }

  const driver: I18nDriver = {
    get language() {
      return language
    },
    get isInitialized() {
      return initialized
    },
    t: (key: string) => `${language}:${key}`,
    changeLanguage: async (next: string) => {
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

  return { driver, emitInitialized } as const
}

const DemoDef = Logix.Module.make('demo.I18nAsyncReady', {
  state: Schema.Struct({
    nowValue: Schema.String,
    readyValue: Schema.String,
    snapshot: I18nSnapshotSchema,
  }),
  actions: {},
})

const DemoLogic = DemoDef.logic(($) => ({
  setup: Effect.sync(() => {
    // 等待 ready：作为 start task fork 运行，不阻塞实例可用性。
    $.lifecycle.onStart(
      Effect.gen(function* () {
        const i18n = yield* $.root.resolve(I18nTag)
        const value = yield* i18n.tReady('hello', { defaultValue: 'Hello' }, 1000)
        yield* $.state.mutate((draft) => {
          ;(draft as any).readyValue = value
        })
      }),
    )
  }),
  run: Effect.gen(function* () {
    const i18n = yield* $.root.resolve(I18nTag)
    const snap0 = yield* SubscriptionRef.get(i18n.snapshot)

    // 展示：snapshot 变化会触发订阅；这里用 state 承接，UI 侧可直接订阅 state。
    yield* $.on(i18n.snapshot.changes).runFork((snap) =>
      $.state.mutate((draft) => {
        ;(draft as any).snapshot = snap
      }),
    )

    // 初始：pending 时 `t` 会立即回退（不等待）。
    yield* $.state.mutate((draft) => {
      ;(draft as any).snapshot = snap0
      ;(draft as any).nowValue = i18n.t('hello', { defaultValue: 'Hello' })
      ;(draft as any).readyValue = '(waiting...)'
    })
  }),
}))

const DemoImpl = DemoDef.implement({
  initial: {
    nowValue: '',
    readyValue: '',
    snapshot: { language: 'unknown', init: 'pending', seq: 0 },
  },
  logics: [DemoLogic],
}).impl

const ctl = makeAsyncInitDriver({ language: 'en', initialized: false })
const runtime = Logix.Runtime.make(DemoImpl, {
  layer: I18n.layer(ctl.driver),
})

export const main = Effect.scoped(
  Effect.gen(function* () {
    const i18n = yield* Logix.Root.resolve(I18nTag)
    const demo = yield* DemoDef.tag

    yield* Effect.yieldNow()
    const s0: any = yield* demo.getState
    console.log('[pending] snapshot:', s0.snapshot)
    console.log('[pending] state.nowValue:', s0.nowValue)
    console.log('[pending] state.readyValue:', s0.readyValue)
    console.log('[pending] t(now):', i18n.t('hello', { defaultValue: 'Hello' }))

    // 外部实例异步初始化完成：触发 initialized 事件
    yield* Effect.sleep('50 millis')
    ctl.emitInitialized()

    // 等待 readyValue 回填（最多 ~200ms）
    for (let i = 0; i < 20; i++) {
      yield* Effect.sleep('10 millis')
      const s: any = yield* demo.getState
      if (typeof s.readyValue === 'string' && s.readyValue !== '(waiting...)') break
    }

    const s1: any = yield* demo.getState
    console.log('[ready] snapshot:', s1.snapshot)
    console.log('[ready] state.nowValue:', s1.nowValue)
    console.log('[ready] state.readyValue:', s1.readyValue)
    console.log('[ready] t(now):', i18n.t('hello', { defaultValue: 'Hello' }))
  }),
)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runtime.runPromise(main as any).finally(() => runtime.dispose())
}
