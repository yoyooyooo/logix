import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { I18n, I18nTag } from '../../src/index.js'
import type { I18nDriver } from '../../src/internal/driver/i18n.js'

const makeDriver = (): I18nDriver => ({
  language: 'en',
  isInitialized: true,
  t: (key: string) => `en:${key}`,
  changeLanguage: () => undefined,
  on: () => undefined,
  off: () => undefined,
})

describe('I18n service-first boundary', () => {
  it.effect('keeps only render-oriented public service methods', () =>
    Effect.gen(function* () {
      const service = yield* Effect.service(I18nTag).pipe(Effect.orDie)

      expect(Object.keys(service).sort()).toEqual(['changeLanguage', 'render', 'renderReady', 'snapshot'])
      expect('instance' in service).toBe(false)
      expect('token' in service).toBe(false)
      expect('t' in service).toBe(false)
      expect('tReady' in service).toBe(false)
    }).pipe(Effect.provide(I18n.layer(makeDriver()))))
})
