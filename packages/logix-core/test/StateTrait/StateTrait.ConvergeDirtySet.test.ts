import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('StateTrait converge dirty-set scheduling', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    derivedA: Schema.Number,
    derivedB: Schema.Number,
  })

  type S = Schema.Schema.Type<typeof State>

  const Actions = { noop: Schema.Void, setA: Schema.Number }

  const M = Logix.Module.make('StateTraitConvergeDirtySet', {
    state: State,
    actions: Actions,
    reducers: {
      noop: (s: any) => s,
      setA: Logix.Module.Reducer.mutate((draft: any, action: { readonly payload: number }) => {
        draft.a = action.payload
      }),
    },
    traits: Logix.StateTrait.from(State)({
      derivedA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
      derivedB: Logix.StateTrait.computed({
        deps: ['b'],
        get: (b) => b + 1,
      }),
    }),
  })

  const impl = M.implement({
    initial: { a: 0, b: 0, derivedA: 1, derivedB: 1 },
    logics: [],
  })

  it.scoped('runs only affected writers when dirtyPaths are specific', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: { traitConvergeMode: 'dirty' },
        layer: Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* rt.dispatch({ _tag: 'setA', payload: 1 } as any)

        const updates = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId) as ReadonlyArray<any>
        expect(updates.length).toBeGreaterThan(0)

        const last = updates[updates.length - 1]
        expect(last?.traitSummary?.converge?.requestedMode).toBe('dirty')
        expect(last?.traitSummary?.converge?.executedMode).toBe('dirty')
        expect(last?.traitSummary?.converge?.dirty?.dirtyAll).toBe(false)
        expect(last?.traitSummary?.converge?.dirty?.rootCount).toBe(1)
        expect(Array.isArray(last?.traitSummary?.converge?.dirty?.rootIds)).toBe(true)
        expect(last?.traitSummary?.converge?.dirty?.rootIds?.length).toBe(1)
        expect(last?.traitSummary?.converge?.dirty?.rootIdsTruncated).toBe(false)
        expect(last?.traitSummary?.converge?.stepStats?.totalSteps).toBe(2)
        expect(last?.traitSummary?.converge?.stepStats?.executedSteps).toBe(1)
        expect(last?.traitSummary?.converge?.stepStats?.skippedSteps).toBe(1)

        expect(last?.state?.a).toBe(1)
        expect(last?.state?.derivedA).toBe(2)
        expect(last?.state?.derivedB).toBe(1)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.scoped('falls back to full scheduling when only wildcard dirtyPaths exist', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: { traitConvergeMode: 'dirty' },
        layer: Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag

        yield* Logix.InternalContracts.runWithStateTransaction(
          rt as any,
          { kind: 'test', name: 'dirty-wildcard' },
          () =>
            Effect.gen(function* () {
              const prev = yield* rt.getState
              yield* rt.setState({ ...prev, a: 2 })
            }),
        )

        const updates = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId) as ReadonlyArray<any>
        expect(updates.length).toBeGreaterThan(0)

        const last = updates[updates.length - 1]
        expect(last?.traitSummary?.converge?.requestedMode).toBe('dirty')
        expect(last?.traitSummary?.converge?.executedMode).toBe('dirty')
        expect(last?.traitSummary?.converge?.dirty?.dirtyAll).toBe(true)
        expect(last?.traitSummary?.converge?.dirty?.rootCount).toBe(0)
        expect(last?.traitSummary?.converge?.dirty?.rootIds).toEqual([])
        expect(last?.traitSummary?.converge?.dirty?.rootIdsTruncated).toBe(false)
        expect(last?.traitSummary?.converge?.stepStats?.totalSteps).toBe(2)
        expect(last?.traitSummary?.converge?.stepStats?.executedSteps).toBe(2)
        expect(last?.traitSummary?.converge?.stepStats?.skippedSteps).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
