import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Cause, Deferred, Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as Logix from '../../src/index.js'

describe('Error handling - assembly failure', () => {
  it.scoped('should provide actionable MissingModuleRuntimeError when provider is missing', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []
      const errorSeen = yield* Deferred.make<void>()

      const sink: Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            events.push(event)
          }).pipe(
            Effect.tap(() => (event.type === 'lifecycle:error' ? Deferred.succeed(errorSeen, undefined) : Effect.void)),
          ),
      }

      const Child = Logix.Module.make('ErrorHandling.MissingProvider.Child', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const Parent = Logix.Module.make('ErrorHandling.MissingProvider.Parent', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = Parent.logic(($) => ({
        setup: Effect.void,
        run: Effect.gen(function* () {
          yield* $.use(Child)
        }),
      }))

      const layer = Parent.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
        Effect.scoped(
          Effect.gen(function* () {
            yield* Parent.tag
            yield* Deferred.await(errorSeen)
          }).pipe(Effect.provide(layer)),
        ),
      )

      const lifecycleError = events.find((e) => e.type === 'lifecycle:error') as
        | Extract<Debug.Event, { type: 'lifecycle:error' }>
        | undefined

      expect(lifecycleError).toBeDefined()
      if (!lifecycleError) return

      const defects = [...Cause.defects(lifecycleError.cause as Cause.Cause<unknown>)]
      const err = defects.find((e) => (e as any)?.name === 'MissingModuleRuntimeError') as any

      expect(err).toBeDefined()
      expect(err.tokenId).toBe('ErrorHandling.MissingProvider.Child')
      expect(err.entrypoint).toBe('logic.$.use')
      expect(String(err.message)).toContain('fix:')
    }),
  )
})
