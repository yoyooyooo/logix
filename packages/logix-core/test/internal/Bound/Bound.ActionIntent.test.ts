import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../src/Debug.js'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntime from '../../../src/internal/runtime/ModuleRuntime.js'
import { currentTxnOriginOverride } from '../../../src/internal/runtime/core/TxnOriginOverride.js'

describe('Bound ActionIntent kernel (O-022)', () => {
  const Counter = Logix.Module.make('Bound.ActionIntentKernel', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {
      inc: Schema.Void,
    } as const,
    reducers: {
      inc: Logix.Module.Reducer.mutate((draft) => {
        draft.count += 1
      }),
    },
  })

  it('dispatchers / action(token) / dispatch should converge to one action-intent anchor', async () => {
    const ring = Debug.makeRingBufferSink(128)

    const logic = Counter.logic(($) =>
      Effect.gen(function* () {
        const runInc = $.action($.actions.inc)

        yield* $.dispatchers.inc()
        yield* runInc()
        yield* $.dispatch('inc')
      }),
    )

    const impl = Counter.implement({
      initial: { count: 0 },
      logics: [logic],
    })

    const runtime = Logix.Runtime.make(impl, {
      layer: Layer.mergeAll(
        Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
        Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>,
    })

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          const rt = yield* Counter.tag
          yield* Effect.timeoutFail({
            duration: '2 seconds',
            onTimeout: () => new Error('[test] action-intent commits did not converge in time'),
          })(
            Effect.gen(function* () {
              while (true) {
                const state = yield* rt.getState
                if (state.count >= 3) {
                  return
                }
                yield* Effect.yieldNow()
              }
            }),
          )
        }) as Effect.Effect<void, never, any>,
      )
    } finally {
      await runtime.dispose()
    }

    const commits = ring
      .getSnapshot()
      .filter(
        (event) =>
          event.type === 'state:update' &&
          event.moduleId === 'Bound.ActionIntentKernel' &&
          (event as any).txnId != null,
      ) as ReadonlyArray<any>

    expect(commits.length).toBe(3)
    expect(commits.map((event) => event.originKind)).toEqual(['action-intent', 'action-intent', 'action-intent'])
    expect(commits.map((event) => event.originName)).toEqual(['dispatchers', 'action', 'dispatch'])
    expect(commits.map((event) => event.originDetails?.actionIntent)).toEqual([true, true, true])
    expect(commits.map((event) => event.originDetails?.entry)).toEqual(['dispatchers', 'action', 'dispatch'])
    expect(commits.map((event) => event.originDetails?.input)).toEqual(['token', 'token', 'type'])
    expect(commits.map((event) => event.originDetails?.actionTag)).toEqual(['inc', 'inc', 'inc'])
    expect(commits[2]?.state?.count).toBe(3)
  })

  it.scoped('should cache dispatchers and action(token) callables for hot paths', () =>
    Effect.gen(function* () {
      const runtime = yield* ModuleRuntime.make<
        Logix.StateOf<typeof Counter.shape>,
        Logix.ActionOf<typeof Counter.shape>
      >(
        { count: 0 },
        {
          reducers: {
            inc: Logix.Module.Reducer.mutate((draft) => {
              draft.count += 1
            }),
          },
        },
      )

      const $ = Logix.Bound.make(Counter.shape, runtime)

      expect($.dispatchers.inc).toBe($.dispatchers.inc)
      expect($.action($.actions.inc)).toBe($.action($.actions.inc))

      yield* $.dispatchers.inc()
      yield* $.action($.actions.inc)()

      expect((yield* runtime.getState).count).toBe(2)
    }) as Effect.Effect<void, never, any>,
  )

  it.scoped('dispatchBatch should merge override details but keep runtime-owned count semantics', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)
      const moduleId = 'Bound.ActionIntentBatchOrigin'

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make<
            Logix.StateOf<typeof Counter.shape>,
            Logix.ActionOf<typeof Counter.shape>
          >(
            { count: 0 },
            {
              moduleId,
              reducers: {
                inc: Logix.Module.Reducer.mutate((draft) => {
                  draft.count += 1
                }),
              },
            },
          )

          const batchActions = [
            { _tag: 'inc', payload: undefined },
            { _tag: 'inc', payload: undefined },
          ] as const

          yield* Effect.locally(currentTxnOriginOverride, {
            kind: 'action-intent',
            name: 'dispatchBatch',
            details: {
              actionIntent: true,
              entry: 'dispatchBatch',
            },
          })(runtime.dispatchBatch(batchActions as any))

          yield* Effect.locally(currentTxnOriginOverride, {
            kind: 'action-intent',
            name: 'dispatchBatch',
            details: {
              actionIntent: true,
              entry: 'dispatchBatch',
              count: 99,
            },
          })(runtime.dispatchBatch(batchActions as any))

          const commits = ring
            .getSnapshot()
            .filter(
              (event) => event.type === 'state:update' && event.moduleId === moduleId && (event as any).txnId != null,
            ) as ReadonlyArray<any>

          expect(commits).toHaveLength(2)
          expect(commits[0]?.originKind).toBe('action-intent')
          expect(commits[0]?.originName).toBe('dispatchBatch')
          expect(commits[0]?.originDetails?.actionIntent).toBe(true)
          expect(commits[0]?.originDetails?.entry).toBe('dispatchBatch')
          expect(commits[0]?.originDetails?.count).toBe(2)
          expect(commits[1]?.originDetails?.count).toBe(2)
          expect((yield* runtime.getState).count).toBe(4)
        }),
      )
    }) as Effect.Effect<void, never, any>,
  )

  it.scoped('dispatch should ignore override attempts for reserved origin audit detail keys', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)
      const moduleId = 'Bound.ActionIntentDispatchOrigin'

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make<
            Logix.StateOf<typeof Counter.shape>,
            Logix.ActionOf<typeof Counter.shape>
          >(
            { count: 0 },
            {
              moduleId,
              reducers: {
                inc: Logix.Module.Reducer.mutate((draft) => {
                  draft.count += 1
                }),
              },
            },
          )

          yield* Effect.locally(currentTxnOriginOverride, {
            kind: 'action-intent',
            name: 'dispatch',
            details: {
              _tag: 'override',
              path: 'override.path',
              op: 'remove',
              count: 99,
              ext: 'ok',
            },
          })(runtime.dispatch({ _tag: 'inc', payload: { path: 'real.path' } } as any))

          const commits = ring
            .getSnapshot()
            .filter(
              (event) => event.type === 'state:update' && event.moduleId === moduleId && (event as any).txnId != null,
            ) as ReadonlyArray<any>

          expect(commits).toHaveLength(1)
          expect(commits[0]?.originKind).toBe('action-intent')
          expect(commits[0]?.originName).toBe('dispatch')
          expect(commits[0]?.originDetails?.ext).toBe('ok')

          expect(commits[0]?.originDetails?._tag).toBe('inc')
          expect(commits[0]?.originDetails?.path).toBe('real.path')
          expect(commits[0]?.originDetails?.op).toBe('set')

          expect(commits[0]?.originDetails?.count).toBeUndefined()
          expect((yield* runtime.getState).count).toBe(1)
        }),
      )
    }) as Effect.Effect<void, never, any>,
  )
})
