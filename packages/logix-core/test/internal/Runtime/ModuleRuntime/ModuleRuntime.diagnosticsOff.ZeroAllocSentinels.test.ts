import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema, SubscriptionRef } from 'effect'
import * as Debug from '../../../../src/internal/debug-api.js'
import {
  disableTxnHotPathSentinels,
  enableTxnHotPathSentinels,
  readTxnHotPathSentinels,
  resetTxnHotPathSentinels,
} from '../../../../src/internal/runtime/core/txnHotPathSentinels.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'
import { makeFieldPathIdRegistry } from '../../../../src/internal/field-path.js'
import * as Logix from '../../../../src/index.js'

const withTxnHotPathSentinels = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      enableTxnHotPathSentinels()
      resetTxnHotPathSentinels()
    }),
    () => effect,
    () =>
      Effect.sync(() => {
        disableTxnHotPathSentinels()
      }),
  )

describe('ModuleRuntime diagnostics-off zero-alloc sentinels', () => {
  it.effect('public dispatch with diagnostics off does not enter debug or materialize light instrumentation payloads', () =>
    withTxnHotPathSentinels(
      Effect.gen(function* () {
        const Counter = Logix.Module.make('ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.Counter', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { bump: Schema.Void },
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft) => {
              draft.count += 1
            }),
          },
        })

        const program = Logix.Program.make(Counter, {
          initial: { count: 0 },
          logics: [],
          stateTransaction: { instrumentation: 'light' },
        })

        const sink: Debug.Sink = {
          record: () => Effect.void,
        }
        const runtime = Logix.Runtime.make(program, {
          layer: Layer.mergeAll(
            Debug.diagnosticsLevel('off'),
            Debug.replace([sink]) as Layer.Layer<any, never, never>,
          ) as Layer.Layer<any, never, never>,
        })

        resetTxnHotPathSentinels()

        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
              resetTxnHotPathSentinels()
              for (let i = 0; i < 8; i++) {
                yield* rt.dispatch({ _tag: 'bump' })
              }
              expect((yield* rt.getState).count).toBe(8)
            }),
          ),
        )

        const counters = readTxnHotPathSentinels()
        expect(counters.debugEventAllocCountOff).toBe(0)
        expect(counters.patchObjectMaterializeCountLight).toBe(0)
        expect(counters.snapshotObjectMaterializeCountLight).toBe(0)
        expect(counters.joinSplitInTxnWindowCount).toBe(0)
        expect(counters.dirtyAllFallbackCountP1Gate).toBe(0)

        yield* Effect.promise(() => runtime.dispose())
      }),
    ),
  )

  it.effect('light StateTransaction with id-first paths does not build patch or snapshot records', () =>
    withTxnHotPathSentinels(
      Effect.gen(function* () {
        type State = { value: number }

        const stateRef = yield* SubscriptionRef.make<State>({ value: 0 })
        const registry = makeFieldPathIdRegistry([['value']])
        const ctx = StateTransaction.makeContext<State>({
          moduleId: 'ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.StateTransaction',
          instanceId: 'zero-alloc-state-txn',
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'light-id-first' }, { value: 0 })
        for (let i = 0; i < 8; i++) {
          StateTransaction.updateDraft(ctx, { value: i + 1 })
          StateTransaction.recordPatch(ctx, ['value'], 'reducer')
        }

        const txn = yield* StateTransaction.commit(ctx, stateRef)
        expect(txn?.dirty.dirtyAll).toBe(false)
        expect(txn?.patches.length).toBe(0)
        expect(txn?.initialStateSnapshot).toBeUndefined()
        expect(txn?.finalStateSnapshot).toBeUndefined()

        const counters = readTxnHotPathSentinels()
        expect(counters.patchObjectMaterializeCountLight).toBe(0)
        expect(counters.snapshotObjectMaterializeCountLight).toBe(0)
        expect(counters.joinSplitInTxnWindowCount).toBe(0)
        expect(counters.dirtyAllFallbackCountP1Gate).toBe(0)
      }),
    ),
  )
})
