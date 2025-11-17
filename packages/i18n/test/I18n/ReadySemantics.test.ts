import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Fiber, SubscriptionRef, TestClock } from 'effect'
import { I18n, I18nTag, type I18nDriver } from '../../src/index.js'

const makeControlledDriver = (initial: { readonly language: string; readonly initialized: boolean }) => {
  let language = initial.language
  let initialized = initial.initialized
  let rejectChangeLanguage = false

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
      if (rejectChangeLanguage) {
        throw new Error('changeLanguage rejected')
      }
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

  return {
    driver,
    emitInitialized,
    setRejectChangeLanguage: (value: boolean) => {
      rejectChangeLanguage = value
    },
    handlerCount: {
      initialized: () => handlers.initialized.size,
      languageChanged: () => handlers.languageChanged.size,
    },
  } as const
}

describe('I18n ready semantics', () => {
  it.scoped('t is non-blocking; tReady waits for initialized', () => {
    const ctl = makeControlledDriver({ language: 'en', initialized: false })
    return Effect.gen(function* () {
      const svc = yield* I18nTag
      yield* Effect.yieldNow()
      expect(ctl.handlerCount.initialized()).toBeGreaterThan(0)

      const s0 = yield* SubscriptionRef.get(svc.snapshot)
      expect(s0).toEqual({ language: 'en', init: 'pending', seq: 0 })

      expect(svc.t('hello', { defaultValue: 'Hello' })).toBe('Hello')

      const waitFiber = yield* Effect.fork(svc.tReady('hello', { defaultValue: 'Hello' }, 1000))

      yield* Effect.sync(() => ctl.emitInitialized())

      // Wait for the snapshot to become ready to avoid blocking on join.
      for (let i = 0; i < 10; i++) {
        const snap = yield* SubscriptionRef.get(svc.snapshot)
        if (snap.init === 'ready') break
        yield* TestClock.adjust('1 millis')
        yield* Effect.yieldNow()
      }

      const readyValue = yield* Fiber.join(waitFiber)
      expect(readyValue).toBe('en:hello')
    }).pipe(Effect.provide(I18n.layer(ctl.driver)))
  })

  it.scoped('tReady degrades on timeout (default + override)', () => {
    const ctl = makeControlledDriver({ language: 'en', initialized: false })
    return Effect.gen(function* () {
      const svc = yield* I18nTag

      const defaultTimeout = yield* Effect.fork(svc.tReady('bye', { defaultValue: 'Bye' }))
      yield* TestClock.adjust('5 seconds')
      expect(yield* Fiber.join(defaultTimeout)).toBe('Bye')

      const overrideTimeout = yield* Effect.fork(svc.tReady('soon', { defaultValue: 'Soon' }, 50))
      yield* TestClock.adjust('50 millis')
      expect(yield* Fiber.join(overrideTimeout)).toBe('Soon')
    }).pipe(Effect.provide(I18n.layer(ctl.driver)))
  })

  it.scoped('changeLanguage updates snapshot; failed init degrades', () => {
    const ctl = makeControlledDriver({ language: 'en', initialized: true })
    return Effect.gen(function* () {
      const svc = yield* I18nTag

      const s0 = yield* SubscriptionRef.get(svc.snapshot)
      expect(s0.init).toBe('ready')

      yield* svc.changeLanguage('zh')
      const s1 = yield* SubscriptionRef.get(svc.snapshot)
      expect(s1.language).toBe('zh')
      expect(s1.seq).toBeGreaterThan(s0.seq)

      ctl.setRejectChangeLanguage(true)
      yield* svc.changeLanguage('ja')
      const s2 = yield* SubscriptionRef.get(svc.snapshot)
      expect(s2.init).toBe('failed')
      expect(svc.t('hello', { defaultValue: 'Hello' })).toBe('Hello')
      expect(yield* svc.tReady('hello', { defaultValue: 'Hello' })).toBe('Hello')
    }).pipe(Effect.provide(I18n.layer(ctl.driver)))
  })
})
