import { describe, expect, it } from '@effect/vitest'
import { Effect, SubscriptionRef } from 'effect'
import { I18n, I18nTag, token } from '@logixjs/i18n'
import * as Form from '../../src/index.js'
import { enUS, zhCN } from '../../src/locales/index.js'

type DriverEvent = 'initialized' | 'languageChanged'
type DriverHandler = (...args: ReadonlyArray<unknown>) => void
type LocalI18nDriver = Parameters<typeof I18n.layer>[0]

const createAppI18nDriver = (resources: Readonly<Record<string, Readonly<Record<string, string>>>>): LocalI18nDriver => {
  let language = 'en'
  const handlers: Record<DriverEvent, Set<DriverHandler>> = {
    initialized: new Set<DriverHandler>(),
    languageChanged: new Set<DriverHandler>(),
  }

  return {
    get language() {
      return language
    },
    get isInitialized() {
      return true
    },
    t: (key: string, input?: unknown) => {
      const template = resources[language]?.[key] ?? `${language}:${key}`
      if (!input || typeof input !== 'object' || Array.isArray(input)) return template
      return Object.entries(input as Record<string, unknown>).reduce(
        (acc, [paramKey, paramValue]) => acc.split(`{{${paramKey}}}`).join(String(paramValue)),
        template,
      )
    },
    changeLanguage: (next: string) => {
      language = next
      for (const handler of handlers.languageChanged) handler(next)
    },
    on: (event: DriverEvent, handler: DriverHandler) => {
      handlers[event].add(handler)
    },
    off: (event: DriverEvent, handler: DriverHandler) => {
      handlers[event].delete(handler)
    },
  }
}

describe('Form.Rule builtin locales registration', () => {
  it.effect('works through app bootstrap merge and I18n.layer(driver)', () =>
    (() => {
      const resources = {
        en: {
          ...enUS,
          ...{
            'logix.form.rule.required': 'App Required',
          },
        },
        zh: {
          ...zhCN,
        },
      } as const

      return Effect.gen(function* () {
        const svc = yield* Effect.service(I18nTag).pipe(Effect.orDie)
        const required = token('logix.form.rule.required')
        const literal = Form.Rule.make<string>({ required: 'Please enter your name' }).required.validate('', {} as any) as any

        expect(svc.render(required)).toBe('App Required')
        expect(literal).toMatchObject({ _tag: 'i18n' })
        expect(svc.render(literal)).toBe('Please enter your name')
        yield* svc.changeLanguage('zh')

        const snapshot = yield* SubscriptionRef.get(svc.snapshot)
        expect(snapshot.language).toBe('zh')
        expect(svc.render(required)).toBe('此项为必填')
        expect(svc.render(literal)).toBe('Please enter your name')
      }).pipe(
        Effect.provide(I18n.layer(createAppI18nDriver(resources))),
      )
    })())
})
