import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { I18n, I18nTag, token } from '../../src/index.js'
import type { I18nDriver } from '../../src/internal/driver/i18n.js'

const makeDriver = (id: string): I18nDriver & { readonly calls: { changeLanguage: number } } => {
  const calls = { changeLanguage: 0 }
  let language = `lang:${id}`
  return {
    calls,
    get language() {
      return language
    },
    isInitialized: true,
    t: (key: string) => `${id}:${language}:${key}`,
    changeLanguage: (next: string) => {
      calls.changeLanguage += 1
      language = next
    },
    on: () => undefined,
    off: () => undefined,
  }
}

describe('I18n injection isolation', () => {
  it('isolates i18n service by runtime tree', async () => {
    const Root = Logix.Module.make('I18n.ServiceIsolation.Root', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const RootProgram = Logix.Program.make(Root, {
      initial: { ok: true },
      logics: [],
    })

    const driverA = makeDriver('A')
    const driverB = makeDriver('B')

    const runtimeA = Logix.Runtime.make(RootProgram, {
      layer: I18n.layer(driverA),
    })
    const runtimeB = Logix.Runtime.make(RootProgram, {
      layer: I18n.layer(driverB),
    })

    try {
      const svcA = runtimeA.runSync(Effect.service(I18nTag).pipe(Effect.orDie))
      const svcB = runtimeB.runSync(Effect.service(I18nTag).pipe(Effect.orDie))
      const hello = token('hello')
      expect(svcA.render(hello)).toBe('A:lang:A:hello')
      expect(svcB.render(hello)).toBe('B:lang:B:hello')

      await runtimeA.runPromise(svcA.changeLanguage('zh'))
      await runtimeB.runPromise(svcB.changeLanguage('en'))

      expect(driverA.calls.changeLanguage).toBe(1)
      expect(driverB.calls.changeLanguage).toBe(1)
      expect(svcA.render(hello)).toBe('A:zh:hello')
      expect(svcB.render(hello)).toBe('B:en:hello')
    } finally {
      await runtimeA.dispose()
      await runtimeB.dispose()
    }
  })
})
