import { Context, Effect, Exit, Layer, Scope } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

export const withProcessRuntime = (layer: Layer.Layer<any, any, any>): Layer.Layer<any, any, any> =>
  Layer.provideMerge(ProcessRuntime.layer())(layer)

export const withProcessRuntimeScope = <A, E = never, R = never>(options: {
  readonly layer: Layer.Layer<any, any, any>
  readonly run: (params: {
    readonly env: Context.Context<any>
    readonly runtime: ProcessRuntime.ProcessRuntime
  }) => Effect.Effect<A, E, R>
}): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    const scope = yield* Scope.make()
    try {
      const env = yield* Layer.buildWithScope(options.layer, scope)
      const runtime = Context.get(
        env as Context.Context<any>,
        ProcessRuntime.ProcessRuntimeTag as any,
      ) as ProcessRuntime.ProcessRuntime
      return yield* options.run({
        env: env as Context.Context<any>,
        runtime,
      })
    } finally {
      yield* Scope.close(scope, Exit.succeed(undefined))
    }
  })

export const collectProcessErrorEvent = (options: {
  readonly layer: Layer.Layer<any, any, any>
  readonly processId: string
  readonly attempts?: number
  readonly onBeforeClose?: Effect.Effect<void>
}): Effect.Effect<{
  readonly errorEvent: Logix.Process.ProcessEvent | undefined
  readonly events: ReadonlyArray<Logix.Process.ProcessEvent>
}> =>
  withProcessRuntimeScope({
    layer: options.layer,
    run: ({ runtime }) =>
      Effect.gen(function* () {
        const attempts = Math.max(1, options.attempts ?? 200)
        let result: {
          readonly errorEvent: Logix.Process.ProcessEvent | undefined
          readonly events: ReadonlyArray<Logix.Process.ProcessEvent>
        } = {
          errorEvent: undefined,
          events: [],
        }

        for (let i = 0; i < attempts; i++) {
          const events = (yield* runtime.getEventsSnapshot()) as ReadonlyArray<Logix.Process.ProcessEvent>
          const errorEvent = events.find(
            (event) => event.type === 'process:error' && event.identity.identity.processId === options.processId,
          )
          if (errorEvent) {
            result = { errorEvent, events }
            break
          }
          result = { errorEvent: undefined, events }
          yield* Effect.yieldNow()
        }

        if (options.onBeforeClose) {
          yield* options.onBeforeClose
        }

        return result
      }),
  })
