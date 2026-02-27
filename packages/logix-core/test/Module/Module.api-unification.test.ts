import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Module API unification', () => {
  it.scoped('supports ModuleDef.layer(config) as a layer-first Effect-native entry', () =>
    Effect.gen(function* () {
      const Counter = Logix.Module.make('ModuleApiUnifiedLayerFirst', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const layer = Counter.layer({
        initial: { count: 11 },
        logics: [],
      })

      const context = yield* Layer.build(layer)
      const runtime = Context.get(context, Counter.tag)
      const state = yield* runtime.getState

      expect(state.count).toBe(11)
    }),
  )

  it.scoped('keeps ModuleDef.layer(...) and build(...).createInstance().layer semantically consistent', () =>
    Effect.gen(function* () {
      const Counter = Logix.Module.make('ModuleApiUnifiedEntryParity', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const runWith = (layer: Layer.Layer<any, never, any>) =>
        Effect.gen(function* () {
          const context = yield* Layer.build(layer)
          const runtime = Context.get(context, Counter.tag)
          const state = yield* runtime.getState
          return {
            count: state.count,
            moduleId: runtime.moduleId,
          }
        })

      const layerCount = yield* runWith(
        Counter.layer({
          initial: { count: 5 },
        }),
      )

      const buildCount = yield* runWith(
        Counter
          .build({
            initial: { count: 5 },
          })
          .createInstance().layer,
      )

      expect(layerCount).toEqual({
        count: 5,
        moduleId: 'ModuleApiUnifiedEntryParity',
      })
      expect(buildCount).toEqual({
        count: 5,
        moduleId: 'ModuleApiUnifiedEntryParity',
      })
    }),
  )

  it.scoped('supports build(...).createInstance() as an advanced instantiation path', () =>
    Effect.gen(function* () {
      const Counter = Logix.Module.make('ModuleApiUnifiedCounter', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const built = Counter.build({
        initial: { count: 7 },
        logics: [],
      })

      const runtimeA = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(built.createInstance(), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()).pipe(Effect.asVoid),
      )
      const runtimeB = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(built, {
            layer: Layer.empty as Layer.Layer<any, never, never>,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()).pipe(Effect.asVoid),
      )

      const readCount = Effect.gen(function* () {
        const rt = yield* Counter.tag
        return (yield* rt.getState).count
      }) as Effect.Effect<number, never, any>

      expect(yield* Effect.promise(() => runtimeA.runPromise(readCount))).toBe(7)
      expect(yield* Effect.promise(() => runtimeB.runPromise(readCount))).toBe(7)
    }),
  )

  it.scoped('supports ModuleDef.createInstance(...) as an advanced bridge for direct Runtime.make input', () =>
    Effect.gen(function* () {
      const Counter = Logix.Module.make('ModuleApiUnifiedCounterDirect', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(
            Counter.createInstance({
              initial: { count: 3 },
              logics: [],
            }),
            { layer: Layer.empty as Layer.Layer<any, never, never> },
          ),
        ),
        (rt) => Effect.promise(() => rt.dispose()).pipe(Effect.asVoid),
      )

      const readCount = Effect.gen(function* () {
        const rt = yield* Counter.tag
        return (yield* rt.getState).count
      }) as Effect.Effect<number, never, any>

      const count = yield* Effect.promise(() => runtime.runPromise(readCount))
      expect(count).toBe(3)
    }),
  )

  it.scoped('emits migration diagnostics when legacy Module.implement(...) path is used', () =>
    Effect.gen(function* () {
      const ring = Logix.Debug.makeRingBufferSink(32)
      const diagnosticsLayer = Layer.mergeAll(
        Logix.Debug.replace([ring.sink]),
        Logix.Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const Counter = Logix.Module.make('ModuleApiLegacyImplementDiag', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const legacyModule = Counter.implement({
        initial: { count: 1 },
        logics: [],
      })

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(legacyModule, {
            layer: diagnosticsLayer,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()).pipe(Effect.asVoid),
      )

      const readState = Effect.gen(function* () {
        const rt = yield* Counter.tag
        yield* rt.getState
      }) as Effect.Effect<void, never, any>

      yield* Effect.promise(() => runtime.runPromise(readState))

      const events = ring
        .getSnapshot()
        .filter((event) => event.type === 'diagnostic' && (event as any).code === 'module_instantiation::legacy_entry')
      expect(events.length).toBe(1)
      const event = events[0] as any
      expect(typeof event.instanceId).toBe('string')
      expect(event.instanceId.length).toBeGreaterThan(0)
      expect(typeof event.txnSeq).toBe('number')
      expect(event.txnSeq).toBeGreaterThanOrEqual(0)
      expect(typeof event.opSeq).toBe('number')
      expect(event.opSeq).toBeGreaterThanOrEqual(0)
      expect(event.source).toBe('Module.implement')
      expect(event.hint).toContain('Module.layer(...)')
      expect(event.hint).toContain('Module.build(...).createInstance()')
    }),
  )
})
