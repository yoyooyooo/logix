import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Fiber, Layer, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import { TickSchedulerTag } from '../../../src/internal/runtime/core/env.js'

const makeFields = (fanout: number, prefix: string) =>
  Array.from({ length: fanout }, (_, index) => `${prefix}${index}` as const)

const makeNumberStruct = (fields: ReadonlyArray<string>) =>
  Schema.Struct(
    Object.fromEntries(fields.map((field) => [field, Schema.Number])) as Record<string, typeof Schema.Number>,
  )

const makeInitialNumbers = (fields: ReadonlyArray<string>, value: number) =>
  Object.fromEntries(fields.map((field) => [field, value])) as Record<string, number>

describe('DeclarativeLinkRuntime same-target dispatch batch fusion', () => {
  it.effect('should keep same-target declarative fanout to one target commit per source commit', () =>
    Effect.gen(function* () {
      const runScenario = (fanout: 1 | 8 | 32) =>
        Effect.gen(function* () {
          const stateFields = makeFields(fanout, 'mirror')
          const actionTags = makeFields(fanout, 'setMirror')

          const Source = Logix.Module.make(`DeclarativeDispatchFusionSource${fanout}`, {
            state: Schema.Struct({ value: Schema.Number }),
            actions: { set: Schema.Number },
            reducers: {
              set: Logix.Module.Reducer.mutate<{ value: number }, { payload: number }>((draft, payload) => {
                draft.value = payload
              }),
            },
          })

          const TargetState = makeNumberStruct(stateFields)
          const TargetActions = Object.fromEntries(actionTags.map((tag) => [tag, Schema.Number])) as Record<
            string,
            typeof Schema.Number
          >
          const TargetReducers = Object.fromEntries(
            actionTags.map((tag, index) => [
              tag,
              Logix.Module.Reducer.mutate<any, { payload: number }>((draft, payload) => {
                draft[stateFields[index]!] = payload
              }),
            ]),
          )

          const Target = Logix.Module.make(`DeclarativeDispatchFusionTarget${fanout}`, {
            state: TargetState,
            actions: TargetActions as any,
            reducers: TargetReducers as any,
          })

          const ValueRead = Logix.ReadQuery.make({
            selectorId: `rq_declarative_dispatch_fusion_${fanout}`,
            debugKey: `DeclarativeDispatchFusionSource${fanout}.value`,
            reads: ['value'],
            select: (s: { readonly value: number }) => s.value,
            equalsKind: 'objectIs',
          })

          const DeclarativeLink = Logix.Process.linkDeclarative(
            { id: `dlink_dispatch_fusion_${fanout}`, modules: [Source, Target] as const },
            ($) =>
              actionTags.map((tag) => ({
                from: $[Source.id].read(ValueRead),
                to: $[Target.id].dispatch(tag as any),
              })),
          )

          const Root = Logix.Module.make(`DeclarativeDispatchFusionRoot${fanout}`, { state: Schema.Void, actions: {} })
          const RootImpl = Root.implement({
            initial: undefined,
            imports: [
              Source.implement({ initial: { value: 0 } }).impl,
              Target.implement({ initial: makeInitialNumbers(stateFields, 0) }).impl,
            ],
            processes: [DeclarativeLink],
          })

          const runtime = Logix.Runtime.make(RootImpl, {
            layer: Layer.empty as Layer.Layer<any, never, never>,
          })

          try {
            return yield* Effect.promise(() =>
              runtime.runPromise(
                Effect.gen(function* () {
                  const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
                  const sourceRt: any = yield* Effect.service(Source.tag).pipe(Effect.orDie)
                  const targetRt: any = yield* Effect.service(Target.tag).pipe(Effect.orDie)

                  let commits = 0
                  const fiber = runtime.runFork(
                    Stream.runForEach(
                      targetRt.changesWithMeta((s: any) => s),
                      () =>
                        Effect.sync(() => {
                          commits += 1
                        }),
                    ),
                  )

                  try {
                    yield* Effect.sleep('50 millis')
                    commits = 0

                    yield* sourceRt.dispatch({ _tag: 'set', payload: 1 })

                    for (let attempt = 0; attempt < 32; attempt += 1) {
                      yield* scheduler.flushNow
                      const current = yield* targetRt.getState
                      if (stateFields.every((field) => (current as any)[field] === 1)) {
                        return commits
                      }
                      yield* Effect.yieldNow
                    }

                    const state = yield* targetRt.getState
                    expect(state).toEqual(makeInitialNumbers(stateFields, 1))
                    return commits
                  } finally {
                    runtime.runFork(Fiber.interrupt(fiber).pipe(Effect.asVoid))
                  }
                }) as any,
              ),
            )
          } finally {
            yield* Effect.promise(() => runtime.dispose())
          }
        })

      const fanout1 = yield* runScenario(1)
      const fanout8 = yield* runScenario(8)
      const fanout32 = yield* runScenario(32)
      console.info('PERF_SAME_TARGET_DECLARATIVE_BATCH_COMMITS', JSON.stringify({ fanout1, fanout8, fanout32 }))

      expect(fanout1).toBe(1)
      expect(fanout8).toBe(1)
      expect(fanout32).toBe(1)
    }),
    15000,
  )
})
