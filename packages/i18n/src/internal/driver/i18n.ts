import {
  Context,
  Duration,
  Effect,
  Fiber,
  Layer,
  Option,
  Runtime,
  Scope,
  Schema,
  Stream,
  SubscriptionRef,
} from 'effect'

import type { I18nMessageToken, I18nTokenOptionsInput } from '../token/token.js'
import { token } from '../token/token.js'

export type { I18nTokenOptionsInput } from '../token/token.js'

export type I18nDriver = {
  readonly language: string
  readonly isInitialized?: boolean
  readonly t: (key: string, options?: unknown) => string
  readonly changeLanguage: (language: string) => Promise<unknown> | unknown
  readonly on: (event: 'initialized' | 'languageChanged', handler: (...args: any[]) => void) => unknown
  readonly off: (event: 'initialized' | 'languageChanged', handler: (...args: any[]) => void) => unknown
}

export type I18nInitState = 'pending' | 'ready' | 'failed'

export type I18nSnapshot = {
  readonly language: string
  readonly init: I18nInitState
  readonly seq: number
}

export const I18nSnapshotSchema = Schema.Struct({
  language: Schema.String,
  init: Schema.Literal('pending', 'ready', 'failed'),
  seq: Schema.Number,
})

export type I18nService = {
  readonly instance: I18nDriver
  readonly snapshot: SubscriptionRef.SubscriptionRef<I18nSnapshot>
  readonly token: (key: string, options?: I18nTokenOptionsInput) => I18nMessageToken
  readonly changeLanguage: (language: string) => Effect.Effect<void, never, never>
  readonly t: (key: string, options?: I18nTokenOptionsInput) => string
  readonly tReady: (
    key: string,
    options?: I18nTokenOptionsInput,
    timeoutMs?: number,
  ) => Effect.Effect<string, never, never>
}

export class I18nTag extends Context.Tag('@logixjs/i18n/I18n')<I18nTag, I18nService>() {}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const makeI18nService = (driver: I18nDriver): Effect.Effect<I18nService, never, Scope.Scope> =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<never>()

    const init: I18nInitState = driver.isInitialized ? 'ready' : 'pending'
    let currentSnapshot: I18nSnapshot = {
      language: driver.language,
      init,
      seq: 0,
    }
    const snapshotRef = yield* SubscriptionRef.make<I18nSnapshot>(currentSnapshot)

    const update = (patch: Partial<Pick<I18nSnapshot, 'language' | 'init'>>): Effect.Effect<void> =>
      SubscriptionRef.update(snapshotRef, (prev) => {
        const next: I18nSnapshot = {
          language: patch.language ?? prev.language,
          init: patch.init ?? prev.init,
          seq: prev.seq + 1,
        }
        currentSnapshot = next
        return next
      })

    const pushSnapshot = (patch: Partial<Pick<I18nSnapshot, 'language' | 'init'>>): void => {
      const next: I18nSnapshot = {
        language: patch.language ?? currentSnapshot.language,
        init: patch.init ?? currentSnapshot.init,
        seq: currentSnapshot.seq + 1,
      }
      currentSnapshot = next
      Runtime.runFork(runtime, SubscriptionRef.set(snapshotRef, next).pipe(Effect.catchAllCause(() => Effect.void)))
    }

    const onInitialized = (): void => {
      pushSnapshot({ init: 'ready', language: driver.language })
    }

    const onLanguageChanged = (lang: unknown): void => {
      pushSnapshot({
        init: 'ready',
        language: asNonEmptyString(lang) ?? driver.language,
      })
    }

    yield* Effect.sync(() => {
      driver.on('initialized', onInitialized)
      driver.on('languageChanged', onLanguageChanged)
    })

    const scope = yield* Effect.scope
    yield* Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        driver.off('initialized', onInitialized)
        driver.off('languageChanged', onLanguageChanged)
      }),
    )

    const changeLanguage = (language: string): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        yield* update({ language, init: 'pending' })
        const exit = yield* Effect.exit(
          Effect.tryPromise({
            try: () => Promise.resolve(driver.changeLanguage(language)),
            catch: () => undefined,
          }),
        )
        if (exit._tag === 'Failure') {
          yield* update({ init: 'failed' })
        } else {
          yield* update({ init: 'ready', language })
        }
      })

    const fallback = (key: string, options?: I18nTokenOptionsInput): string =>
      typeof options?.defaultValue === 'string' ? options.defaultValue : key

    const t = (key: string, options?: I18nTokenOptionsInput): string => {
      if (currentSnapshot.init !== 'ready') {
        return fallback(key, options)
      }
      try {
        return driver.t(key, options)
      } catch {
        return fallback(key, options)
      }
    }

    const tReady = (
      key: string,
      options?: I18nTokenOptionsInput,
      timeoutMs?: number,
    ): Effect.Effect<string, never, never> =>
      Effect.gen(function* () {
        const cap = timeoutMs ?? 5000
        const snap0 = yield* SubscriptionRef.get(snapshotRef)
        if (snap0.init === 'ready') return t(key, options)
        if (snap0.init === 'failed') return fallback(key, options)

        const wait = Stream.filter(snapshotRef.changes, (s) => s.init !== 'pending').pipe(
          Stream.runHead,
          Effect.timeoutFail({
            duration: Duration.millis(cap),
            onTimeout: () => undefined,
          }),
          Effect.catchAll(() => Effect.succeed(Option.none())),
        )

        const fiber = yield* Effect.fork(wait)

        const snap1 = yield* SubscriptionRef.get(snapshotRef)
        if (snap1.init !== 'pending') {
          yield* Fiber.interruptFork(fiber)
          return snap1.init === 'ready' ? t(key, options) : fallback(key, options)
        }

        const outcome = yield* Fiber.join(fiber)
        return Option.match(outcome, {
          onNone: () => fallback(key, options),
          onSome: (snap) => (snap.init === 'ready' ? t(key, options) : fallback(key, options)),
        })
      })

    return {
      instance: driver,
      snapshot: snapshotRef,
      token,
      changeLanguage,
      t,
      tReady,
    } as const
  })

export const I18n = {
  layer: (driver: I18nDriver): Layer.Layer<I18nTag, never, never> => Layer.scoped(I18nTag, makeI18nService(driver)),
} as const
