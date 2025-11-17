import { describe, it, expect } from '@effect/vitest'
import { Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('process: uiSubtree stop → start (re-install)', () => {
  const runCase = (mode: 'switch' | 'exhaust', expectedRestart: boolean) =>
    Effect.gen(function* () {
      const CounterState = Schema.Struct({ value: Schema.Number })
      const CounterActions = { inc: Schema.Void }

      const CounterDef = Logix.Module.make('ProcessUiSubtreeCounter', {
        state: CounterState,
        actions: CounterActions,
      })

      const CounterLogic = CounterDef.logic(($) => ({
        setup: Effect.void,
        run: Effect.gen(function* () {
          yield* $.onAction('inc').runParallelFork(
            $.state.mutate((draft) => {
              draft.value += 1
            }),
          )
        }),
      }))

      const CounterImpl = CounterDef.implement({
        initial: { value: 0 },
        logics: [CounterLogic],
      }).impl

      const subtreeId = `test:uiSubtree:restart:${mode}`

      let ticks = 0

      const Ticker = Logix.Process.link({ modules: [CounterDef] as const }, ($) =>
        Effect.gen(function* () {
          const counter = $[CounterDef.id]
          yield* Effect.forever(
            counter.actions.inc().pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  ticks += 1
                }),
              ),
              Effect.zipRight(Effect.sleep('5 millis')),
            ),
          )
        }).pipe(Effect.ensuring(Effect.uninterruptible(Effect.sleep('80 millis')))),
      )

      const runtime = Logix.Runtime.make(CounterImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const installOnce = (scope: Scope.CloseableScope, mode?: 'switch' | 'exhaust') =>
        runtime.runPromise(
          Logix.InternalContracts.installProcess(Ticker as any, {
            scope: { type: 'uiSubtree', subtreeId } as const,
            enabled: true,
            installedAt: 'uiSubtree',
            mode,
          }).pipe(Effect.provideService(Scope.Scope, scope)),
        )

      const getEvents = (): Promise<ReadonlyArray<Logix.Process.ProcessEvent>> =>
        runtime.runPromise(Logix.InternalContracts.getProcessEvents() as any) as any

      const getValue = () =>
        runtime.runPromise(
          Effect.gen(function* () {
            const counter = yield* CounterDef.tag
            return (yield* counter.getState).value
          }),
        )

      const scope1 = Effect.runSync(Scope.make()) as Scope.CloseableScope
      yield* Effect.promise(() => installOnce(scope1))

      yield* Effect.promise(() => runtime.runPromise(Effect.sleep('40 millis') as any))
      const events1 = yield* Effect.promise(() => getEvents())
      const firstValue = yield* Effect.promise(() => getValue())
      const firstTicks = ticks

      expect(firstValue).toBeGreaterThan(0)
      expect(firstTicks).toBeGreaterThan(0)
      expect(
        events1.some(
          (e: Logix.Process.ProcessEvent) =>
            e.type === 'process:start' && e.identity.identity.scope.type === 'uiSubtree',
        ),
      ).toBe(true)

      const stopPromise = runtime.runPromise(Scope.close(scope1, Exit.void) as any)

      const scope2 = Effect.runSync(Scope.make()) as Scope.CloseableScope
      yield* Effect.promise(() => installOnce(scope2, mode))

      yield* Effect.promise(() => stopPromise)

      const eventsAfter = yield* Effect.promise(() => getEvents())
      const startCount1 = events1.filter(
        (e: Logix.Process.ProcessEvent) => e.type === 'process:start' && e.identity.identity.scope.type === 'uiSubtree',
      ).length
      const startCount2 = eventsAfter.filter(
        (e: Logix.Process.ProcessEvent) => e.type === 'process:start' && e.identity.identity.scope.type === 'uiSubtree',
      ).length

      const stopEvents = eventsAfter.filter(
        (e: Logix.Process.ProcessEvent) => e.type === 'process:stop' && e.identity.identity.scope.type === 'uiSubtree',
      )
      expect(stopEvents.length).toBeGreaterThan(0)

      const baselineValue = yield* Effect.promise(() => getValue())
      const baselineTicks = ticks

      yield* Effect.promise(() => runtime.runPromise(Effect.sleep('60 millis') as any))
      const valueAfter = yield* Effect.promise(() => getValue())
      const ticksAfter = ticks

      if (expectedRestart) {
        expect(startCount2).toBeGreaterThan(startCount1)
        expect(valueAfter).toBeGreaterThan(baselineValue)
        expect(ticksAfter).toBeGreaterThan(baselineTicks)
      } else {
        expect(startCount2).toBe(startCount1)
        expect(valueAfter).toBe(baselineValue)
        expect(ticksAfter).toBe(baselineTicks)
      }

      yield* Effect.promise(() => runtime.runPromise(Scope.close(scope2, Exit.void) as any))
      yield* Effect.promise(() => runtime.dispose())
    })

  it.scoped('mode=switch: should restart even if re-install happens during stopping', () => runCase('switch', true))
  it.scoped('mode=exhaust: should not restart if re-install happens during stopping', () => runCase('exhaust', false))
})
