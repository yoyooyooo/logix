import { Cause, Context, Effect, Ref } from "effect"

export interface ErrorContext {
  readonly phase: string
  readonly moduleId?: string
  readonly [key: string]: unknown
}

export interface LifecycleManager {
  readonly registerInit: (
    effect: Effect.Effect<void, never, any>
  ) => Effect.Effect<void, never, any>
  readonly registerDestroy: (
    effect: Effect.Effect<void, never, any>
  ) => Effect.Effect<void, never, any>
  readonly registerOnError: (
    handler: (
      cause: Cause.Cause<unknown>,
      context: ErrorContext
    ) => Effect.Effect<void, never, any>
  ) => Effect.Effect<void, never, any>
  readonly runDestroy: Effect.Effect<void, never, any>
  readonly notifyError: (
    cause: Cause.Cause<unknown>,
    context: ErrorContext
  ) => Effect.Effect<void, never, any>
}

export const LifecycleContext = Context.GenericTag<LifecycleManager>(
  "@logix/LifecycleManager"
)

const safeRun = (label: string, eff: Effect.Effect<void, any, any>) =>
  eff.pipe(
    Effect.matchCauseEffect({
      onSuccess: () => Effect.void,
      onFailure: (cause) =>
        Effect.logError(`[${label}] failed: ${Cause.pretty(cause)}`),
    })
  )

export const makeLifecycleManager: Effect.Effect<LifecycleManager> = Effect.gen(
  function* () {
    const destroyRef = yield* Ref.make<
      ReadonlyArray<Effect.Effect<void, never, any>>
    >([])
    const errorRef = yield* Ref.make<
      ReadonlyArray<
        (
          cause: Cause.Cause<unknown>,
          context: ErrorContext
        ) => Effect.Effect<void, never, any>
      >
    >([])

    const registerDestroy = (effect: Effect.Effect<void, never, any>) =>
      Ref.update(destroyRef, (list) => [...list, effect])

    const registerOnError = (
      handler: (
        cause: Cause.Cause<unknown>,
        context: ErrorContext
      ) => Effect.Effect<void, never, any>
    ) => Ref.update(errorRef, (list) => [...list, handler])

    const runDestroy = Ref.get(destroyRef).pipe(
      Effect.flatMap((effects) =>
        Effect.forEach(effects, (effect) =>
          safeRun("lifecycle.onDestroy", effect), { discard: true }
        )
      )
    )

    const notifyError = (cause: Cause.Cause<unknown>, context: ErrorContext) =>
      Ref.get(errorRef).pipe(
        Effect.flatMap((handlers) =>
          Effect.forEach(handlers, (handler) =>
            handler(cause, context).pipe(
              Effect.catchAllCause((inner) =>
                Effect.logError(
                  `[lifecycle.onError] failed: ${Cause.pretty(inner)}`
                )
              )
            ), { discard: true }
          )
        )
      )

    const registerInit = (effect: Effect.Effect<void, never, any>) =>
      effect.pipe(
        Effect.matchCauseEffect({
          onSuccess: () => Effect.void,
          onFailure: (cause) =>
            notifyError(cause, { phase: "lifecycle.onInit" }).pipe(
              Effect.zipRight(
                Effect.logError(
                  `[lifecycle.onInit] failed: ${Cause.pretty(cause)}`
                )
              )
            ),
        })
      )

    return {
      registerInit,
      registerDestroy,
      registerOnError,
      runDestroy,
      notifyError,
    }
  }
)
