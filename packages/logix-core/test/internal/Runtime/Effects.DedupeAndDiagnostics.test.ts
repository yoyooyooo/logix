import { describe, it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Ref, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as Debug from '../../../src/Debug.js'

describe('Runtime effects (US4)', () => {
  it.scoped('should de-duplicate by (actionTag, sourceKey) and emit duplicate_registration', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ value: Schema.Number })

      const M = Logix.Module.make('Runtime.Effects.Dedupe', {
        state: State,
        actions: { ping: Schema.Number } as const,
      })

      const observed = yield* Ref.make<ReadonlyArray<number>>([])

      const handler = (payload: number) =>
        Ref.update(observed, (arr) => [...arr, payload]).pipe(Effect.asVoid)

      const L = M.logic(($) => ({
        setup: Effect.gen(function* () {
          yield* $.effect($.actions.ping, handler)
          yield* $.effect($.actions.ping, handler)
        }),
        run: Effect.void,
      }))

      const impl = M.implement({ initial: { value: 0 }, logics: [L] })

      const ring = Debug.makeRingBufferSink(64)
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* Effect.sleep('50 millis')
        yield* rt.dispatch({ _tag: 'ping', payload: 1 } as any)
        yield* Effect.sleep('50 millis')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>)).pipe(
        Effect.ensuring(Effect.promise(() => runtime.dispose()).pipe(Effect.asVoid)),
      )

      expect(yield* Ref.get(observed)).toEqual([1])

      const diagnostics = ring.getSnapshot().filter((e) => e.type === 'diagnostic') as Array<Debug.Event>
      expect(diagnostics.some((d: any) => d.code === 'effects::duplicate_registration')).toBe(true)
    }),
  )

  it.scoped('should emit dynamic_registration and only affect future actions', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ value: Schema.Number })

      const M = Logix.Module.make('Runtime.Effects.DynamicRegistration', {
        state: State,
        actions: { ping: Schema.Number } as const,
      })

      const gate = yield* Deferred.make<void>()
      const observed = yield* Ref.make<ReadonlyArray<number>>([])

      const handler = (payload: number) =>
        Ref.update(observed, (arr) => [...arr, payload]).pipe(Effect.asVoid)

      const L = M.logic(($) => ({
        setup: Effect.void,
        run: Effect.gen(function* () {
          yield* Deferred.await(gate)
          yield* $.effect($.actions.ping, handler)
        }),
      }))

      const impl = M.implement({ initial: { value: 0 }, logics: [L] })

      const ring = Debug.makeRingBufferSink(64)
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* Effect.sleep('50 millis')

        yield* rt.dispatch({ _tag: 'ping', payload: 1 } as any)
        yield* Effect.sleep('50 millis')

        yield* Deferred.succeed(gate, undefined)
        yield* Effect.sleep('50 millis')

        yield* rt.dispatch({ _tag: 'ping', payload: 2 } as any)
        yield* Effect.sleep('50 millis')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>)).pipe(
        Effect.ensuring(Effect.promise(() => runtime.dispose()).pipe(Effect.asVoid)),
      )

      expect(yield* Ref.get(observed)).toEqual([2])

      const diagnostics = ring.getSnapshot().filter((e) => e.type === 'diagnostic') as Array<Debug.Event>
      expect(diagnostics.some((d: any) => d.code === 'effects::dynamic_registration')).toBe(true)
    }),
  )

  it.scoped('should isolate handler failures and emit handler_failure diagnostics', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ value: Schema.Number })

      const M = Logix.Module.make('Runtime.Effects.FailureIsolation', {
        state: State,
        actions: { ping: Schema.Number } as const,
      })

      const okCount = yield* Ref.make(0)

      const ok = (_payload: number) => Ref.update(okCount, (n) => n + 1).pipe(Effect.asVoid)
      const bad = (_payload: number) => Effect.fail(new Error('boom'))

      const L = M.logic(($) => ({
        setup: Effect.gen(function* () {
          yield* $.effect($.actions.ping, bad)
          yield* $.effect($.actions.ping, ok)
        }),
        run: Effect.void,
      }))

      const impl = M.implement({ initial: { value: 0 }, logics: [L] })

      const ring = Debug.makeRingBufferSink(64)
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* Effect.sleep('50 millis')
        yield* rt.dispatch({ _tag: 'ping', payload: 1 } as any)
        yield* Effect.sleep('50 millis')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>)).pipe(
        Effect.ensuring(Effect.promise(() => runtime.dispose()).pipe(Effect.asVoid)),
      )

      expect(yield* Ref.get(okCount)).toBe(1)

      const diagnostics = ring.getSnapshot().filter((e) => e.type === 'diagnostic') as Array<Debug.Event>
      expect(diagnostics.some((d: any) => d.code === 'effects::handler_failure')).toBe(true)
    }),
  )
})

