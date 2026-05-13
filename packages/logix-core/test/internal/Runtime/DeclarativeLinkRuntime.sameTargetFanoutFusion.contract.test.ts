import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, Layer, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RuntimeContracts from '../../../src/internal/runtime-contracts.js'
import { TickSchedulerTag } from '../../../src/internal/runtime/core/env.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

const makeFields = (fanout: number, prefix: string) =>
  Array.from({ length: fanout }, (_, index) => `${prefix}${index}` as const)

const makeNumberStruct = (fields: ReadonlyArray<string>) =>
  Schema.Struct(
    Object.fromEntries(fields.map((field) => [field, Schema.Number])) as Record<string, typeof Schema.Number>,
  )

const makeInitialNumbers = (fields: ReadonlyArray<string>, value: number) =>
  Object.fromEntries(fields.map((field) => [field, value])) as Record<string, number>

describe('DeclarativeLinkRuntime same-target fanout fusion contract', () => {
  it.effect('Module-as-Source: same-target fanout is fused to one target commit', () =>
    Effect.gen(function* () {
      const runScenario = (fanout: 1 | 8 | 32) =>
        Effect.gen(function* () {
          type SourceAction = { readonly _tag: 'set'; readonly payload: number }
          const targetFields = makeFields(fanout, 'fromSource')

          const Source = Logix.Module.make(`SameTargetModuleAsSourceSource${fanout}`, {
            state: Schema.Struct({ value: Schema.Number }),
            actions: { set: Schema.Number },
            reducers: {
              set: Logix.Module.Reducer.mutate<{ value: number }, { payload: number }>((draft, payload) => {
                draft.value = payload
              }),
            },
          })

          const TargetState = makeNumberStruct(targetFields)
          const SourceValueRead = RuntimeContracts.Selector.make({
            selectorId: `rq_same_target_module_source_${fanout}`,
            debugKey: `SameTargetModuleAsSourceSource${fanout}.value`,
            reads: ['value'],
            select: (s: { readonly value: number }) => s.value,
            equalsKind: 'objectIs',
          })

          const Target = FieldContracts.withModuleFieldDeclarations(Logix.Module.make(`SameTargetModuleAsSourceTarget${fanout}`, {
  state: TargetState,
  actions: {}
}), FieldContracts.fieldFrom(TargetState)(
              Object.fromEntries(
                targetFields.map((field) => [
                  field,
                  FieldContracts.fieldExternalStore({
                    store: RuntimeContracts.ExternalInput.fromModule(Source, SourceValueRead),
                  }),
                ]),
              ) as any,
            ))

          const sourceProgram = Logix.Program.make(Source, { initial: { value: 0 } })
          const Root = Logix.Module.make(`SameTargetModuleAsSourceRoot${fanout}`, { state: Schema.Void, actions: {} })
          const targetProgram = Logix.Program.make(Target, {
            initial: makeInitialNumbers(targetFields, 0),
            capabilities: {
              imports: [sourceProgram],
            },
            logics: [],
          })
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
            const sourceRt = runtime.runSync(Effect.service(Source.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
              { value: number },
              SourceAction
            >
            const targetRt = runtime.runSync(Effect.service(Target.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
              Record<string, number>,
              never
            >

            let commits = 0
            const subscriberReady = yield* Deferred.make<void>()
            const fiber = runtime.runFork(
              Stream.runForEach(
                targetRt.changesWithMeta((s: any) => s),
                () =>
                  Effect.gen(function* () {
                    yield* Deferred.succeed(subscriberReady, undefined).pipe(Effect.ignore)
                    yield* Effect.sync(() => {
                      commits += 1
                    })
                  }),
              ),
            )

            try {
              yield* sourceRt.dispatch({ _tag: 'set', payload: 1 })
              yield* Effect.promise(() =>
                runtime.runPromise(
                  Effect.gen(function* () {
                    const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
                    yield* scheduler.flushNow
                  }),
                ),
              )
              yield* flushAllHostScheduler(hostScheduler)
              yield* Deferred.await(subscriberReady)
              commits = 0

              yield* Effect.promise(() => runtime.runPromise(sourceRt.dispatch({ _tag: 'set', payload: 2 })))
              yield* Effect.promise(() =>
                runtime.runPromise(
                  Effect.gen(function* () {
                    const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
                    yield* scheduler.flushNow
                  }),
                ),
              )
              yield* flushAllHostScheduler(hostScheduler)

              const state = yield* Effect.promise(() => runtime.runPromise(targetRt.getState))
              expect(state).toEqual(makeInitialNumbers(targetFields, 2))
              return commits
            } finally {
              yield* Effect.promise(() => runtime.runPromise(Fiber.interrupt(fiber).pipe(Effect.asVoid)))
            }
          } finally {
            yield* Effect.promise(() => runtime.dispose())
          }
        })

      const fanout1 = yield* runScenario(1)
      const fanout8 = yield* runScenario(8)
      const fanout32 = yield* runScenario(32)

      console.info(
        'PERF_SAME_TARGET_MODULE_AS_SOURCE_COMMITS',
        JSON.stringify({ fanout1, fanout8, fanout32 }),
      )

      expect(fanout1).toBe(1)
      expect(fanout8).toBe(1)
      expect(fanout32).toBe(1)
    }),
  )

})
