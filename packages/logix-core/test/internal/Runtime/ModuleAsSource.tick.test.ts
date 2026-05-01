import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RuntimeContracts from '../../../src/internal/runtime-contracts.js'
import { RuntimeStoreTag, TickSchedulerTag } from '../../../src/internal/runtime/core/env.js'
import { enterRuntimeBatch, exitRuntimeBatch } from '../../../src/internal/runtime/core/TickScheduler.js'
import { advanceTicks, flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

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

      const SourceValueRead = RuntimeContracts.Selector.make({
        selectorId: 'rq_module_as_source_value',
        debugKey: 'ModuleAsSourceSource.value',
        reads: ['value'],
        select: (s: { readonly value: number }) => s.value,
        equalsKind: 'objectIs',
      })

      const Target = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('ModuleAsSourceTarget', {
  state: TargetState,
  actions: {}
}), FieldContracts.fieldFrom(TargetState)({
          fromSource: FieldContracts.fieldExternalStore({
            store: RuntimeContracts.ExternalInput.fromModule(Source, SourceValueRead),
          }),
          keyHash: FieldContracts.fieldComputed({
            deps: ['fromSource'],
            get: (fromSource) => `h:${fromSource}`,
          }),
        }))

      const targetProgram = Logix.Program.make(Target, {
        initial: {
          fromSource: 0,
          keyHash: 'h:0',
        },
        capabilities: {
          imports: [Logix.Program.make(Source, { initial: { value: 0 } })],
        },
      })

      const Root = Logix.Module.make('ModuleAsSourceRoot', { state: Schema.Void, actions: {} })
      const rootProgram = Logix.Program.make(Root, {
        initial: undefined,
        capabilities: {
          imports: [targetProgram],
        },
      })

      const hostScheduler = makeTestHostScheduler()
      const runtime = Logix.Runtime.make(rootProgram, {
        layer: Layer.mergeAll(testHostSchedulerLayer(hostScheduler), Layer.empty) as Layer.Layer<any, never, never>,
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
              const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)

              const sourceRt: any = yield* Effect.service(Source.tag).pipe(Effect.orDie)
              const targetRt: any = yield* Effect.service(Target.tag).pipe(Effect.orDie)

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
              yield* flushAllHostScheduler(hostScheduler)

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

  it.effect('should apply Module-as-Source during scheduled microtask tick (no manual flushNow)', () =>
    Effect.gen(function* () {
      const Source = Logix.Module.make('ModuleAsSourceScheduledSource', {
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

      const SourceValueRead = RuntimeContracts.Selector.make({
        selectorId: 'rq_module_as_source_scheduled_value',
        debugKey: 'ModuleAsSourceScheduledSource.value',
        reads: ['value'],
        select: (s: { readonly value: number }) => s.value,
        equalsKind: 'objectIs',
      })

      const Target = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('ModuleAsSourceScheduledTarget', {
  state: TargetState,
  actions: {}
}), FieldContracts.fieldFrom(TargetState)({
          fromSource: FieldContracts.fieldExternalStore({
            store: RuntimeContracts.ExternalInput.fromModule(Source, SourceValueRead),
          }),
          keyHash: FieldContracts.fieldComputed({
            deps: ['fromSource'],
            get: (fromSource) => `h:${fromSource}`,
          }),
        }))

      const targetProgram = Logix.Program.make(Target, {
        initial: {
          fromSource: 0,
          keyHash: 'h:0',
        },
        capabilities: {
          imports: [Logix.Program.make(Source, { initial: { value: 0 } })],
        },
      })

      const Root = Logix.Module.make('ModuleAsSourceScheduledRoot', { state: Schema.Void, actions: {} })
      const rootProgram = Logix.Program.make(Root, {
        initial: undefined,
        capabilities: {
          imports: [targetProgram],
        },
      })

      const hostScheduler = makeTestHostScheduler()
      const runtime = Logix.Runtime.make(rootProgram, {
        layer: Layer.mergeAll(testHostSchedulerLayer(hostScheduler), Layer.empty) as Layer.Layer<any, never, never>,
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
              const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)

              const sourceRt: any = yield* Effect.service(Source.tag).pipe(Effect.orDie)
              const targetRt: any = yield* Effect.service(Target.tag).pipe(Effect.orDie)

              yield* sourceRt.dispatch({ _tag: 'set', payload: 1 })

              yield* advanceTicks({ scheduler: hostScheduler, getTickSeq: store.getTickSeq, n: 1 })

              expect(scheduler.getTickSeq()).toBe(1)
              expect(store.getTickSeq()).toBe(1)
              expect(yield* sourceRt.getState).toEqual({ value: 1 })
              expect(yield* targetRt.getState).toEqual({ fromSource: 1, keyHash: 'h:1' })
            }) as any,
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )
})
