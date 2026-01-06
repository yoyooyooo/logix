import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import { RuntimeStoreTag, TickSchedulerTag } from '../../../src/internal/runtime/core/env.js'
import { enterRuntimeBatch, exitRuntimeBatch } from '../../../src/internal/runtime/core/TickScheduler.js'

describe('Module-as-Source (tick semantics)', () => {
  it.effect('should settle A->B writeback and downstream derived within the same tick', () =>
    Effect.gen(function* () {
      const Source = Logix.Module.make('ModuleAsSourceSource', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { set: Schema.Number },
        reducers: {
          set: Logix.Module.Reducer.mutate<{ value: number }, { payload: number }>((draft, payload) => {
            draft.value = payload
          }),
        },
      })

      const TargetState = Schema.Struct({
        fromSource: Schema.Number,
        keyHash: Schema.String,
      })

      const SourceValueRead = Logix.ReadQuery.make({
        selectorId: 'rq_module_as_source_value',
        debugKey: 'ModuleAsSourceSource.value',
        reads: ['value'],
        select: (s: { readonly value: number }) => s.value,
        equalsKind: 'objectIs',
      })

      const Target = Logix.Module.make('ModuleAsSourceTarget', {
        state: TargetState,
        actions: {},
        traits: Logix.StateTrait.from(TargetState)({
          fromSource: Logix.StateTrait.externalStore({
            store: Logix.ExternalStore.fromModule(Source, SourceValueRead),
          }),
          keyHash: Logix.StateTrait.computed({
            deps: ['fromSource'],
            get: (fromSource) => `h:${fromSource}`,
          }),
        }),
      })

      const TargetImpl = Target.implement({
        initial: {
          fromSource: 0,
          keyHash: 'h:0',
        },
        imports: [Source.implement({ initial: { value: 0 } }).impl],
      })

      const Root = Logix.Module.make('ModuleAsSourceRoot', { state: Schema.Void, actions: {} })
      const RootImpl = Root.implement({
        initial: undefined,
        imports: [TargetImpl.impl],
      })

      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const store = yield* RuntimeStoreTag
              const scheduler = yield* TickSchedulerTag

              const sourceRt: any = yield* Source.tag
              const targetRt: any = yield* Target.tag

              yield* Effect.acquireUseRelease(
                Effect.sync(() => {
                  enterRuntimeBatch()
                }),
                () =>
                  Effect.gen(function* () {
                    yield* sourceRt.dispatch({ _tag: 'set', payload: 1 })
                    yield* sourceRt.dispatch({ _tag: 'set', payload: 2 })
                  }),
                () =>
                  Effect.sync(() => {
                    exitRuntimeBatch()
                  }),
              )

              expect(yield* sourceRt.getState).toEqual({ value: 2 })

              yield* scheduler.flushNow

              expect(yield* sourceRt.getState).toEqual({ value: 2 })
              expect(yield* targetRt.getState).toEqual({ fromSource: 2, keyHash: 'h:2' })

              expect(scheduler.getTickSeq()).toBe(1)
              expect(store.getTickSeq()).toBe(1)
            }) as any,
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )
})
