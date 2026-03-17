import { describe, it, expect } from 'vitest'
import { Cause, Chunk, Effect, Fiber, Layer, Schema, Stream } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as Logix from '../../src/index.js'

describe('Runtime.readQuery.strictGate', () => {
  it('error mode: ungraded dynamic selector fails with missingBuildGrade (e2e Runtime.make)', async () => {
    const M = Logix.Module.make('Runtime.ReadQuery.StrictGate.Error', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          draft.count += 1
        }),
      },
    })

    const impl = M.implement({
      initial: { count: 0 },
      logics: [],
    })

    const ring = Debug.makeRingBufferSink(64)
    const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(impl, {
      layer,
      readQuery: {
        strictGate: { mode: 'error' },
      },
    })

    const program = Effect.gen(function* () {
      const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)

      const fiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(rt.changesReadQueryWithMeta(selector), 1)))
      // Ensure subscription starts before dispatch; PubSub-based streams drop events when no subscribers exist.
      for (let i = 0; i < 64; i++) {
        yield* Effect.yieldNow
      }
      yield* rt.dispatch({ _tag: 'inc', payload: undefined })

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return

      const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
      const err = defects.find((e) => (e as any)?._tag === 'ReadQueryStrictGateError') as any
      expect(err).toBeDefined()
      expect(err?.details?.fallbackReason).toBe('missingBuildGrade')
    })

    try {
      await runtime.runPromise(program as Effect.Effect<void, never, any>)
      const diag = ring
        .getSnapshot()
        .find((e) => e.type === 'diagnostic' && (e as any).code === 'read_query::strict_gate') as any

      expect(diag).toBeDefined()
      expect(diag?.severity).toBe('error')
      expect(diag?.trigger?.details?.fallbackReason).toBe('missingBuildGrade')
    } finally {
      await runtime.dispose()
    }
  })

  it('warn mode: ungraded dynamic selector emits warning and continues (e2e Runtime.make)', async () => {
    const M = Logix.Module.make('Runtime.ReadQuery.StrictGate.Warn', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          draft.count += 1
        }),
      },
    })

    const impl = M.implement({
      initial: { count: 0 },
      logics: [],
    })

    const ring = Debug.makeRingBufferSink(64)
    const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(impl, {
      layer,
      readQuery: {
        strictGate: { mode: 'warn' },
      },
    })

    const program = Effect.gen(function* () {
      const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)

      const fiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(rt.changesReadQueryWithMeta(selector), 1)))
      // Ensure subscription starts before dispatch; PubSub-based streams drop events when no subscribers exist.
      for (let i = 0; i < 64; i++) {
        yield* Effect.yieldNow
      }
      yield* rt.dispatch({ _tag: 'inc', payload: undefined })

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Success')
      if (exit._tag !== 'Success') return

      const values = Array.from(exit.value as Iterable<any>)
      expect(values.length).toBe(1)
      expect(values[0]?.value).toBe(1)
    })

    try {
      await runtime.runPromise(program as Effect.Effect<void, never, any>)
      const diag = ring
        .getSnapshot()
        .find((e) => e.type === 'diagnostic' && (e as any).code === 'read_query::strict_gate') as any

      expect(diag).toBeDefined()
      expect(diag?.severity).toBe('warning')
      expect(diag?.trigger?.details?.fallbackReason).toBe('missingBuildGrade')
    } finally {
      await runtime.dispose()
    }
  })
})
