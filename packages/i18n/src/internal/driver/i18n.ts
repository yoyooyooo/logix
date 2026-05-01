import {
  Duration,
  Effect,
  Fiber,
  Layer,
  ManagedRuntime,
  Option,
  ServiceMap,
  Scope,
  Schema,
  Stream,
  SubscriptionRef,
} from 'effect'

import type { I18nMessageToken, I18nTokenParamsInput } from '../token/token.js'

export type { I18nTokenParamsInput } from '../token/token.js'

/**
 * Low-level driver contract.
 *
 * Package-level canonical consumption remains service-first:
 * callers should read `services.i18n` or `I18nTag`, rather than coupling to driver lifecycle details directly.
 */
export type I18nDriver = {
  readonly language: string
  readonly isInitialized?: boolean
  readonly t: (key: string, input?: unknown) => string
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
  init: Schema.Literals(['pending', 'ready', 'failed']),
  seq: Schema.Number,
})

export type I18nRenderHints = {
  readonly fallback?: string
}

export type I18nService = {
  readonly snapshot: SubscriptionRef.SubscriptionRef<I18nSnapshot>
  readonly changeLanguage: (language: string) => Effect.Effect<void, never, never>
  readonly render: (token: I18nMessageToken, hints?: I18nRenderHints) => string
  readonly renderReady: (
    token: I18nMessageToken,
    hints?: I18nRenderHints,
    timeoutMs?: number,
  ) => Effect.Effect<string, never, never>
}

export class I18nTag extends ServiceMap.Service<I18nTag, I18nService>()('@logixjs/i18n/I18n') {}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const makeI18nService = (driver: I18nDriver): Effect.Effect<I18nService, never, Scope.Scope> =>
  Effect.gen(function* () {
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
      void Effect.runPromise(SubscriptionRef.set(snapshotRef, next).pipe(Effect.catchCause(() => Effect.void)))
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

    /**
     * Canonical runtime-facing lifecycle wiring:
     * - driver events update the shared snapshot
     * - consumers stay on the service contract (`render`, `renderReady`, `snapshot`)
     */
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

    const fallback = (message: I18nMessageToken, hints?: I18nRenderHints): string => hints?.fallback ?? message.key

    const render = (message: I18nMessageToken, hints?: I18nRenderHints): string => {
      if (currentSnapshot.init !== 'ready') {
        return fallback(message, hints)
      }
      try {
        return driver.t(message.key, message.params as I18nTokenParamsInput | undefined)
      } catch {
        return fallback(message, hints)
      }
    }

    const renderReady = (
      message: I18nMessageToken,
      hints?: I18nRenderHints,
      timeoutMs?: number,
    ): Effect.Effect<string, never, never> =>
      Effect.gen(function* () {
        const cap = timeoutMs ?? 5000
        const snap0 = yield* SubscriptionRef.get(snapshotRef)
        if (snap0.init === 'ready') return render(message, hints)
        if (snap0.init === 'failed') return fallback(message, hints)

        const wait = Stream.filter(SubscriptionRef.changes(snapshotRef), (s) => s.init !== 'pending').pipe(
          Stream.runHead,
          Effect.timeoutOption(Duration.millis(cap)),
          Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value : Option.none())),
        )

        const fiber = yield* wait.pipe(Effect.forkChild)

        const snap1 = yield* SubscriptionRef.get(snapshotRef)
        if (snap1.init !== 'pending') {
          yield* Fiber.interrupt(fiber)
          return snap1.init === 'ready' ? render(message, hints) : fallback(message, hints)
        }

        const outcome = yield* Fiber.join(fiber)
        return Option.match(outcome, {
          onNone: () => fallback(message, hints),
          onSome: (snap) => (snap.init === 'ready' ? render(message, hints) : fallback(message, hints)),
        })
      })

    return {
      snapshot: snapshotRef,
      changeLanguage,
      render,
      renderReady,
    } as const
  })

export const I18n = {
  layer: (driver: I18nDriver): Layer.Layer<I18nTag, never, never> => Layer.effect(I18nTag, makeI18nService(driver)),
} as const
