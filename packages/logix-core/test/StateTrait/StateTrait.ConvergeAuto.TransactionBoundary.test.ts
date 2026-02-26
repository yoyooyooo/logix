import { describe, expect, it } from '@effect/vitest'
import { Cause, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('StateTrait converge auto transaction boundary', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    derivedA: Schema.Number,
  })

  const Actions = {
    noop: Schema.Void,
  }

  const M = Logix.Module.make('StateTraitConvergeAuto_TransactionBoundary', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State)({
      derivedA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
    }),
  })

  const impl = M.implement({
    initial: { a: 0, derivedA: 1 },
    logics: [],
  })

  it.scoped('fails fast when async escapes the transaction window', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(128)
      const layer = Layer.mergeAll(
        Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
        Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'auto',
        },
      })

      const exit = yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag
            return yield* Effect.exit(
              Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'async-escape' }, () =>
                Effect.gen(function* () {
                  yield* Effect.sleep('1 millis')
                }),
              ),
            )
          }),
        ),
      )
      expect(exit._tag).toBe('Failure')
      if (exit._tag === 'Failure') {
        const defects = [...Cause.defects(exit.cause)]
        expect(defects.some((d) => (d as any)?.code === 'state_transaction::async_escape')).toBe(true)
      }

      const diagnostics = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_transaction::async_escape')
      expect(diagnostics.length).toBeGreaterThan(0)
    }),
  )

  it.scoped('does not misclassify long synchronous transaction body as async escape', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(128)
      const layer = Layer.mergeAll(
        Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
        Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'auto',
        },
      })

      const exit = yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag
            return yield* Effect.exit(
              Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'long-sync' }, () =>
                Effect.sync(() => {
                  let acc = 0
                  for (let i = 0; i < 200_000; i += 1) {
                    acc += i
                  }
                  if (acc < 0) {
                    throw new Error('unreachable')
                  }
                }),
              ),
            )
          }),
        ),
      )
      expect(exit._tag).toBe('Success')

      const diagnostics = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_transaction::async_escape')
      expect(diagnostics).toHaveLength(0)
    }),
  )

  it.scoped('uninterruptible async escape should not block abort/next transaction', () =>
    Effect.gen(function* () {
      const layer = Debug.diagnosticsLevel('light') as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'auto',
        },
      })

      const exit = yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag

            const firstExit = yield* Effect.exit(
              Logix.InternalContracts.runWithStateTransaction(
                rt,
                { kind: 'test', name: 'uninterruptible-escape' },
                () => Effect.uninterruptible(Effect.sleep('2 seconds')),
              ).pipe(
                Effect.timeoutFail({
                  duration: '500 millis',
                  onTimeout: () => new Error('[test] async-escape cleanup blocked transaction exit'),
                }),
              ),
            )

            expect(firstExit._tag).toBe('Failure')
            if (firstExit._tag === 'Failure') {
              const defects = [...Cause.defects(firstExit.cause)]
              expect(defects.some((d) => (d as any)?.code === 'state_transaction::async_escape')).toBe(true)

              const failures = [...Cause.failures(firstExit.cause)]
              expect(
                failures.some((f) => String(f).includes('[test] async-escape cleanup blocked transaction exit')),
              ).toBe(false)
            }

            const nextExit = yield* Effect.exit(
              Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'post-escape' }, () =>
                Effect.void,
              ).pipe(
                Effect.timeoutFail({
                  duration: '500 millis',
                  onTimeout: () => new Error('[test] next transaction blocked by escaped fiber'),
                }),
              ),
            )

            expect(nextExit._tag).toBe('Success')
          }),
        ),
      )

      expect(exit).toBeUndefined()
    }),
  )
})
