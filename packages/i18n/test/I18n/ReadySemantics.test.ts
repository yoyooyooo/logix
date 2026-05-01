import { describe, it, expect } from '@effect/vitest'
import { Effect, Fiber, SubscriptionRef } from 'effect'
import { TestClock } from 'effect/testing'
import { I18n, I18nTag, token } from '../../src/index.js'
import type { I18nDriver } from '../../src/internal/driver/i18n.js'

const makeControlledDriver = (initial: { readonly language: string; readonly initialized: boolean }) => {
  let language = initial.language
  let initialized = initial.initialized
  let rejectChangeLanguage = false

  const resources: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    en: {
      hello: 'Hello',
      bye: 'Bye',
      soon: 'Soon',
      'form.required': 'Required',
    },
    zh: {
      hello: '你好',
      bye: '再见',
      soon: '马上',
      'form.required': '必填',
    },
  }

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
    t: (key: string) => resources[language]?.[key] ?? `${language}:${key}`,
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
  it.effect('render is non-blocking; renderReady waits for initialized', () => {
    const ctl = makeControlledDriver({ language: 'en', initialized: false })
    return Effect.gen(function* () {
      const svc = yield* Effect.service(I18nTag).pipe(Effect.orDie)
      const hello = token('hello')
      yield* Effect.yieldNow
      expect(ctl.handlerCount.initialized()).toBeGreaterThan(0)

      const s0 = yield* SubscriptionRef.get(svc.snapshot)
      expect(s0).toEqual({ language: 'en', init: 'pending', seq: 0 })

      expect(svc.render(hello, { fallback: 'Hello' })).toBe('Hello')
      expect(svc.render(hello)).toBe('hello')

      const waitFiber = yield* svc.renderReady(hello, { fallback: 'Hello' }, 1000).pipe(
        Effect.forkScoped({ startImmediately: true }),
      )

      yield* Effect.sync(() => ctl.emitInitialized())

      // Wait for the snapshot to become ready to avoid blocking on join.
      for (let i = 0; i < 10; i++) {
        const snap = yield* SubscriptionRef.get(svc.snapshot)
        if (snap.init === 'ready') break
        yield* TestClock.adjust('1 millis')
        yield* Effect.yieldNow
      }

      const readyValue = yield* Fiber.join(waitFiber)
      expect(readyValue).toBe('Hello')
    }).pipe(Effect.provide(I18n.layer(ctl.driver)))
  })

  it.effect('pending and failed states degrade only through render hints', () => {
    const ctl = makeControlledDriver({ language: 'en', initialized: false })
    return Effect.gen(function* () {
      const svc = yield* Effect.service(I18nTag).pipe(Effect.orDie)
      const bye = token('bye')
      const hello = token('hello')

      const defaultTimeout = yield* svc.renderReady(bye, { fallback: 'Bye' }).pipe(
        Effect.forkScoped({ startImmediately: true }),
      )
      yield* TestClock.adjust('5 seconds')
      expect(yield* Fiber.join(defaultTimeout)).toBe('Bye')

      const overrideTimeout = yield* svc.renderReady(token('soon'), { fallback: 'Soon' }, 50).pipe(
        Effect.forkScoped({ startImmediately: true }),
      )
      yield* TestClock.adjust('50 millis')
      expect(yield* Fiber.join(overrideTimeout)).toBe('Soon')

      ctl.emitInitialized()
      yield* Effect.yieldNow
      ctl.setRejectChangeLanguage(true)
      yield* svc.changeLanguage('ja')

      const failed = yield* SubscriptionRef.get(svc.snapshot)
      expect(failed.init).toBe('failed')
      expect(svc.render(hello, { fallback: 'Hello' })).toBe('Hello')
      expect(svc.render(hello)).toBe('hello')
      expect(yield* svc.renderReady(hello, { fallback: 'Hello' })).toBe('Hello')
    }).pipe(Effect.provide(I18n.layer(ctl.driver)))
  })

  it.effect('same token rerenders when language changes while token identity stays stable', () => {
    const ctl = makeControlledDriver({ language: 'en', initialized: true })
    return Effect.gen(function* () {
      const svc = yield* Effect.service(I18nTag).pipe(Effect.orDie)
      const required = token('form.required', { field: 'name' })

      const s0 = yield* SubscriptionRef.get(svc.snapshot)
      expect(s0.init).toBe('ready')
      const renderedEn = svc.render(required, { fallback: 'Required' })
      expect(renderedEn).toBe('Required')

      yield* svc.changeLanguage('zh')
      const s1 = yield* SubscriptionRef.get(svc.snapshot)
      expect(s1.language).toBe('zh')
      expect(s1.seq).toBeGreaterThan(s0.seq)
      const renderedZh = svc.render(required, { fallback: 'Required' })
      expect(renderedZh).toBe('必填')
      expect(required).toEqual(token('form.required', { field: 'name' }))
    }).pipe(Effect.provide(I18n.layer(ctl.driver)))
  })
})
