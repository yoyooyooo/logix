import { describe, it, expect } from 'vitest'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { I18n, I18nTag, I18nModule, type I18nDriver } from '../../src/index.js'

const makeDriver = (id: string): I18nDriver & { readonly calls: { changeLanguage: number } } => {
  const calls = { changeLanguage: 0 }
  return {
    calls,
    language: `lang:${id}`,
    isInitialized: true,
    t: (key: string) => `${id}:${key}`,
    changeLanguage: (_language: string) => {
      calls.changeLanguage += 1
    },
    on: () => undefined,
    off: () => undefined,
  }
}

describe('I18n injection isolation', () => {
  it('isolates i18n service by runtime tree; I18nModule forwards to same instance', async () => {
    const Root = Logix.Module.make('I18n.InjectionIsolation.Root', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const RootImpl = Root.implement({
      initial: { ok: true },
      imports: [I18nModule.impl],
    }).impl

    const driverA = makeDriver('A')
    const driverB = makeDriver('B')

    const runtimeA = Logix.Runtime.make(RootImpl, {
      layer: I18n.layer(driverA),
    })
    const runtimeB = Logix.Runtime.make(RootImpl, {
      layer: I18n.layer(driverB),
    })

    try {
      const svcA = runtimeA.runSync(Logix.Root.resolve(I18nTag))
      const svcB = runtimeB.runSync(Logix.Root.resolve(I18nTag))

      expect(svcA.instance).toBe(driverA)
      expect(svcB.instance).toBe(driverB)
      expect(svcA.instance).not.toBe(svcB.instance)

      const modA = runtimeA.runSync(I18nModule.tag)
      const modB = runtimeB.runSync(I18nModule.tag)

      await runtimeA.runPromise(modA.dispatch({ _tag: 'changeLanguage', payload: 'zh' } as any))
      await runtimeB.runPromise(modB.dispatch({ _tag: 'changeLanguage', payload: 'en' } as any))

      expect(driverA.calls.changeLanguage).toBe(1)
      expect(driverB.calls.changeLanguage).toBe(1)
    } finally {
      await runtimeA.dispose()
      await runtimeB.dispose()
    }
  })
})
