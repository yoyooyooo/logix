import { describe, it, expect } from '@effect/vitest'
import { Effect, SubscriptionRef } from 'effect'
import { I18n, I18nTag, token } from '../../src/index.js'
import type { I18nDriver } from '../../src/internal/driver/i18n.js'

const makeDriver = (initial: { readonly language: string; readonly initialized: boolean }) => {
  let language = initial.language
  let initialized = initial.initialized
  const handlers = {
    initialized: new Set<(...args: any[]) => void>(),
    languageChanged: new Set<(...args: any[]) => void>(),
  }

  const driver: I18nDriver = {
    get language() {
      return language
    },
    get isInitialized() {
      return initialized
    },
    t: (key: string) => `${language}:${key}`,
    changeLanguage: (next: string) => {
      language = next
      for (const handler of handlers.languageChanged) {
        handler(next)
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
    emitInitialized: () => {
      initialized = true
      for (const handler of handlers.initialized) {
        handler()
      }
    },
  } as const
}

describe('I18n driver lifecycle boundary', () => {
  it.effect('keeps driver lifecycle details behind the service snapshot contract', () => {
    const ctl = makeDriver({ language: 'en', initialized: false })

    return Effect.gen(function* () {
      const svc = yield* Effect.service(I18nTag).pipe(Effect.orDie)

      const pending = yield* SubscriptionRef.get(svc.snapshot)
      expect(pending.init).toBe('pending')

      yield* Effect.sync(() => ctl.emitInitialized())

      const ready = yield* SubscriptionRef.get(svc.snapshot)
      expect(ready.init).toBe('ready')
      expect(ready.language).toBe('en')

      yield* svc.changeLanguage('zh')
      const changed = yield* SubscriptionRef.get(svc.snapshot)
      expect(changed.language).toBe('zh')
      expect(svc.render(token('hello'))).toBe('zh:hello')
    }).pipe(Effect.provide(I18n.layer(ctl.driver)))
  })
})
