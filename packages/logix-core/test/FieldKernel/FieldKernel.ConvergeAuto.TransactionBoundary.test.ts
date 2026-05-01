import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Cause, Effect, Layer, Option, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('FieldKernel converge auto transaction boundary', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    derivedA: Schema.Number,
  })

  const Actions = {
    noop: Schema.Void,
  }

  const M = FieldContracts.withModuleFieldDeclarations(
    Logix.Module.make('FieldKernelConvergeAuto_TransactionBoundary', {
      state: State,
      actions: Actions,
      reducers: { noop: (s: any) => s },
    }),
    FieldContracts.fieldFrom(State)({
      derivedA: FieldContracts.fieldComputed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
    }),
  )

  const programModule = Logix.Program.make(M, {
    initial: { a: 0, derivedA: 1 },
    logics: [],
  })

  it.effect('fails fast when async escapes the transaction window', () =>
    Effect.gen(function* () {
      const prevNodeEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = 'production'
      try {
        const ring = Debug.makeRingBufferSink(128)
        const layer = Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>

        const runtime = Logix.Runtime.make(programModule, {
          layer,
          stateTransaction: {
            fieldConvergeMode: 'auto',
          },
        })

        const exit = yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
              return yield* Effect.exit(
                FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'async-escape' }, () =>
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
          const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
          expect(defects.some((d) => (d as any)?.code === 'state_transaction::async_escape')).toBe(true)
        }

        const diagnostics = ring
          .getSnapshot()
          .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_transaction::async_escape')
        expect(diagnostics.length).toBeGreaterThan(0)
      } finally {
        if (prevNodeEnv == null) {
          delete (process.env as any).NODE_ENV
        } else {
          ;(process.env as any).NODE_ENV = prevNodeEnv
        }
      }
    }),
  )

  it.effect('does not misclassify long synchronous transaction body as async escape', () =>
    Effect.gen(function* () {
      const prevNodeEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = 'production'
      try {
        const ring = Debug.makeRingBufferSink(128)
        const layer = Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>

        const runtime = Logix.Runtime.make(programModule, {
          layer,
          stateTransaction: {
            fieldConvergeMode: 'auto',
          },
        })

        const exit = yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
              return yield* Effect.exit(
                FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'long-sync' }, () =>
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
      } finally {
        if (prevNodeEnv == null) {
          delete (process.env as any).NODE_ENV
        } else {
          ;(process.env as any).NODE_ENV = prevNodeEnv
        }
      }
    }),
  )

  it.effect('uninterruptible async escape should not block abort/next transaction', () =>
    Effect.gen(function* () {
      const prevNodeEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = 'production'
      try {
        const layer = Debug.diagnosticsLevel('light') as Layer.Layer<any, never, never>

        const runtime = Logix.Runtime.make(programModule, {
          layer,
          stateTransaction: {
            fieldConvergeMode: 'auto',
          },
        })

        const exit = yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

              const firstExit = yield* Effect.exit(
                FieldContracts.runWithStateTransaction(
                  rt,
                  { kind: 'test', name: 'uninterruptible-escape' },
                  () => Effect.uninterruptible(Effect.sleep('2 seconds')),
                ).pipe(
                  Effect.timeoutOption('500 millis'),
                  Effect.flatMap((maybe) =>
                    Option.isSome(maybe)
                      ? Effect.void
                      : Effect.die(new Error('[test] async-escape cleanup blocked transaction exit')),
                  ),
                ),
              )

              expect(firstExit._tag).toBe('Failure')
              if (firstExit._tag === 'Failure') {
                const failures = firstExit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error)
                expect(
                  failures.some((f) => String(f).includes('[test] async-escape cleanup blocked transaction exit')),
                ).toBe(false)
              }

              const nextExit = yield* Effect.exit(
                FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'post-escape' }, () =>
                  Effect.void,
                ).pipe(
                  Effect.timeoutOption('500 millis'),
                  Effect.flatMap((maybe) =>
                    Option.isSome(maybe)
                      ? Effect.void
                      : Effect.die(new Error('[test] next transaction blocked by escaped fiber')),
                  ),
                ),
              )

              expect(nextExit._tag).toBe('Success')
            }),
          ),
        )

        expect(exit).toBeUndefined()
      } finally {
        if (prevNodeEnv == null) {
          delete (process.env as any).NODE_ENV
        } else {
          ;(process.env as any).NODE_ENV = prevNodeEnv
        }
      }
    }),
  )
})
