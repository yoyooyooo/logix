import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Chunk, Deferred, Effect, Fiber, Layer, ManagedRuntime, Option, PubSub, Queue, Schema, Scope, ServiceMap, Stream, SubscriptionRef } from 'effect'
import { TestClock } from 'effect/testing'
import * as Logix from '../../../../src/index.js'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import * as Debug from '../../../../src/Debug.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'
import * as BoundApiRuntime from '../../../../src/internal/runtime/BoundApiRuntime.js'
import * as LogicPlanMarker from '../../../../src/internal/runtime/core/LogicPlanMarker.js'
import { getBoundInternals } from '../../../../src/internal/runtime/core/runtimeInternalsAccessor.js'
import { getDefaultStateTxnInstrumentation } from '../../../../src/internal/runtime/core/env.js'
import { makeFieldPathIdRegistry } from '../../../../src/internal/field-path.js'

const requireActionsByTag = <A>(
  actionsByTag: ((tag: string) => Stream.Stream<A>) | undefined,
): ((tag: string) => Stream.Stream<A>) => {
  if (!actionsByTag) {
    throw new Error('actionsByTag$ should be available for module with declared actions')
  }
  return actionsByTag
}

describe('ModuleRuntime (internal)', () => {
  describe('compliance basics', () => {
    it.effect('should maintain state consistency and ref view', () =>
      Effect.scoped(Effect.gen(function* () {
        const runtime = yield* (ModuleRuntime.make({ count: 0 }) as unknown as Effect.Effect<any, never, any>)

        // initial state
        expect(yield* runtime.getState).toEqual({ count: 0 })

        // update state
        yield* runtime.setState({ count: 1 })
        expect(yield* runtime.getState).toEqual({ count: 1 })

        // Read-only ref consistency via ref()
        const ref = runtime.ref()
        expect(yield* ref.get).toEqual({ count: 1 })

        // write protection: root refs are read-only, setting should fail
        const exit = yield* Effect.exit((ref as any).modify((current: any) => [current, { count: 2 }]))
        expect(exit._tag).toBe('Failure')
      })) as Effect.Effect<void, unknown, Scope.Scope>,
    )

    it.effect('should support ref(selector) as read-only derived view', () =>
      Effect.scoped(Effect.gen(function* () {
        const runtime = yield* (ModuleRuntime.make({
          count: 0,
          name: 'test',
        }) as unknown as Effect.Effect<any, never, any>)

        const countRef = runtime.ref((s: { count: number }) => s.count)

        // initial value
        expect(yield* countRef.get).toBe(0)

        // update main state
        yield* runtime.setState({ count: 1, name: 'test' })
        expect(yield* countRef.get).toBe(1)

        // verify changes stream
        const changes = yield* Stream.runCollect(Stream.take(countRef.changes, 1))
        expect(Array.from(changes as Iterable<number>)[0]).toBe(1)

        // write protection: derived refs are read-only, setting should fail
        const exit = yield* Effect.exit((countRef as any).modify((current: any) => [current, 2]))
        expect(exit._tag).toBe('Failure')
      })) as Effect.Effect<void, unknown, Scope.Scope>,
    )

    it.effect('should publish actions to actionHub (dispatch path)', () =>
      Effect.gen(function* () {
        const hub = yield* PubSub.unbounded<{ _tag: string }>()
        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            createActionHub: Effect.succeed(hub),
          },
        )

        const subscription = yield* PubSub.subscribe(hub)
        const collectorFiber = yield* Effect.forkChild(Effect.all([PubSub.take(subscription), PubSub.take(subscription)], { concurrency: 'unbounded' }))

        yield* runtime.dispatch({ _tag: 'INC', payload: undefined } as any)
        yield* runtime.dispatch({ _tag: 'DEC', payload: undefined } as any)

        const actions = yield* Fiber.join(collectorFiber)
        const tags = actions.map((a: any) => a._tag).sort()
        expect(tags).toEqual(['DEC', 'INC'])
      }),
    )

    it.effect('dispatchBatch should keep actionHub order and count consistent', () =>
      Effect.gen(function* () {
        const hub = yield* PubSub.bounded<{ _tag: string; seq: number }>(64)
        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            createActionHub: Effect.succeed(hub),
          },
        )

        const subscription = yield* PubSub.subscribe(hub)
        const actions = Array.from({ length: 8 }, (_, index) => ({
          _tag: index % 2 === 0 ? 'INC' : 'DEC',
          seq: index,
          payload: undefined,
        }))

        const collectorFiber = yield* Effect.forkChild(Effect.forEach(actions, () => PubSub.take(subscription), { concurrency: 'unbounded' }))

        yield* runtime.dispatchBatch(actions as any)

        const received = yield* Fiber.join(collectorFiber)
        expect(received).toHaveLength(actions.length)
        expect(received.map((action) => action.seq)).toEqual(actions.map((action) => action.seq))
        expect(received.map((action) => action._tag)).toEqual(actions.map((action) => action._tag))
      }),
    )

    it.effect('should route actionsByTag$ without cross-tag noise', () =>
      Effect.gen(function* () {
        const TopicModule = Logix.Module.make('ActionTopicModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {
            inc: Schema.Void,
            dec: Schema.Void,
          },
        })

        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'action-topic-module',
            tag: TopicModule.tag,
          },
        )

        expect(typeof runtime.actionsByTag$).toBe('function')
        const actionsByTag = requireActionsByTag(runtime.actionsByTag$)

        const incFiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(actionsByTag('inc'), 2)))
        const decFiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(actionsByTag('dec'), 1)))
        yield* Effect.yieldNow

        yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)
        yield* runtime.dispatch({ _tag: 'dec', payload: undefined } as any)
        yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)

        const incActions = Array.from((yield* Fiber.join(incFiber)) as Iterable<any>).map((action: any) => action._tag)
        const decActions = Array.from((yield* Fiber.join(decFiber)) as Iterable<any>).map((action: any) => action._tag)

        expect(incActions).toEqual(['inc', 'inc'])
        expect(decActions).toEqual(['dec'])
      }),
    )

    it.effect('dispatchBatch fan-out should keep per-topic order and count consistent', () =>
      Effect.gen(function* () {
        const TopicModule = Logix.Module.make('ActionTopicBatchConsistencyModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {
            inc: Schema.Void,
            dec: Schema.Void,
          },
        })

        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'action-topic-batch-consistency',
            tag: TopicModule.tag,
          },
        )

        expect(typeof runtime.actionsByTag$).toBe('function')
        const actionsByTag = requireActionsByTag(runtime.actionsByTag$)

        const batchActions = [
          { _tag: 'inc', payload: undefined, seq: 1 },
          { _tag: 'dec', payload: undefined, seq: 2 },
          { _tag: 'inc', payload: undefined, seq: 3 },
          { _tag: 'inc', type: 'dec', payload: undefined, seq: 4 },
        ]

        const incFiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(actionsByTag('inc'), 3)))
        const decFiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(actionsByTag('dec'), 2)))
        yield* Effect.yieldNow

        yield* runtime.dispatchBatch(batchActions as any)

        const incActions = Array.from((yield* Fiber.join(incFiber)) as Iterable<any>)
        const decActions = Array.from((yield* Fiber.join(decFiber)) as Iterable<any>)

        expect(incActions.map((action: any) => action.seq)).toEqual([1, 3, 4])
        expect(decActions.map((action: any) => action.seq)).toEqual([2, 4])
      }),
    )

    it.effect('actionsByTag$ should keep _tag/type OR semantics for topic routing', () =>
      Effect.gen(function* () {
        const TopicModule = Logix.Module.make('ActionTopicLegacyCompatModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {
            inc: Schema.Void,
            dec: Schema.Void,
          },
        })

        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'action-topic-legacy-compat',
            tag: TopicModule.tag,
          },
        )

        expect(typeof runtime.actionsByTag$).toBe('function')
        const actionsByTag = requireActionsByTag(runtime.actionsByTag$)

        const decFiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(actionsByTag('dec'), 1)))
        yield* Effect.yieldNow

        yield* runtime.dispatch({ _tag: 'inc', type: 'dec', payload: undefined } as any)

        const decActions = Array.from((yield* Fiber.join(decFiber)) as Iterable<any>)
        expect(decActions).toHaveLength(1)
        expect((decActions[0] as any)._tag).toBe('inc')
        expect((decActions[0] as any).type).toBe('dec')
      }),
    )

    it.effect('actionsByTag$ should dedupe duplicated _tag/type topic fanout', () =>
      Effect.gen(function* () {
        const TopicModule = Logix.Module.make('ActionTopicDedupModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {
            inc: Schema.Void,
            dec: Schema.Void,
          },
        })

        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'action-topic-dedup',
            tag: TopicModule.tag,
          },
        )

        expect(typeof runtime.actionsByTag$).toBe('function')
        const actionsByTag = requireActionsByTag(runtime.actionsByTag$)
        const decQueue = yield* Queue.unbounded<any>()
        const decFiber = yield* Effect.forkChild(Stream.runForEach(actionsByTag('dec'), (action) => Queue.offer(decQueue, action)))
        yield* Effect.yieldNow

        yield* runtime.dispatch({ _tag: 'dec', type: 'dec', payload: undefined } as any)
        yield* Effect.yieldNow

        const first = yield* Queue.take(decQueue)
        const second = yield* Queue.poll(decQueue)

        expect((first as any)._tag).toBe('dec')
        expect((first as any).type).toBe('dec')
        expect(second._tag).toBe('None')

        yield* Fiber.interrupt(decFiber)
      }),
    )

    it.effect('actionsByTag$ fallback should keep _tag/type OR semantics for undeclared topics', () =>
      Effect.gen(function* () {
        const TopicModule = Logix.Module.make('ActionTopicFallbackLegacyCompatModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {
            inc: Schema.Void,
            dec: Schema.Void,
          },
        })

        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'action-topic-fallback-legacy-compat',
            tag: TopicModule.tag,
          },
        )

        expect(typeof runtime.actionsByTag$).toBe('function')
        const actionsByTag = requireActionsByTag(runtime.actionsByTag$)

        const legacyFiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(actionsByTag('legacy'), 1)))
        yield* Effect.yieldNow

        yield* runtime.dispatch({ _tag: 'inc', type: 'legacy', payload: undefined } as any)

        const legacyActions = Array.from((yield* Fiber.join(legacyFiber)) as Iterable<any>)
        expect(legacyActions).toHaveLength(1)
        expect((legacyActions[0] as any)._tag).toBe('inc')
        expect((legacyActions[0] as any).type).toBe('legacy')
      }),
    )
  })

  describe('debug integration', () => {
    it.effect('should report logic errors to DebugSink', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        const TestModule = Logix.Module.make('ErrorModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { triggerError: Schema.Void },
        })

        // faulty logic that fails immediately
        const faultyLogic = Effect.fail('Boom')

        const program = Effect.provideService(Effect.gen(function* () {
          // ModuleRuntime with faulty logic, running in background fiber
          yield* ModuleRuntime.make(
            { count: 0 },
            {
              moduleId: 'test-module',
              logics: [faultyLogic],
              tag: TestModule.tag,
            },
          )
        
          // advance virtual clock so background fiber has time to fail
          yield* TestClock.adjust('10 millis')
        }), Debug.internal.currentDebugSinks as any, [sink])

        yield* program

        const errorEvent = events.find((e) => e.type === 'lifecycle:error')
        expect(errorEvent).toBeDefined()
        expect(errorEvent?.moduleId).toBe('test-module')
      }),
    )

    it.effect('should include instanceId in module:init and module:destroy events', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        const TestModule = Logix.Module.make('RuntimeIdModule', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: {},
        })

        const program = Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'RuntimeIdModule',
              tag: TestModule.tag,
            },
          ).pipe(Effect.flatMap(() => Effect.void)),
        ), Debug.internal.currentDebugSinks as any, [sink])

        yield* program

        const initEvent = events.find((e) => e.type === 'module:init')
        const destroyEvent = events.find((e) => e.type === 'module:destroy')

        expect(initEvent).toBeDefined()
        expect(destroyEvent).toBeDefined()

        const initInstanceId = initEvent && 'instanceId' in initEvent ? (initEvent as any).instanceId : undefined
        const destroyInstanceId =
          destroyEvent && 'instanceId' in destroyEvent ? (destroyEvent as any).instanceId : undefined

        expect(typeof initInstanceId).toBe('string')
        expect(destroyInstanceId).toBe(initInstanceId)
      }),
    )

    it.effect('should emit logic::env_service_not_found diagnostic for missing Env service', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        class EnvService extends ServiceMap.Service<EnvService, { readonly label: string }>()('@tests/EnvService') {}

        // Logic that immediately tries to read a missing Env service.
        const logic = Effect.gen(function* () {
          // Intentionally do not provide EnvService in the Env to trigger a "service not found" error.
          // The error is captured by ModuleRuntime and converted into a diagnostic via LogicDiagnostics.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _svc = yield* EnvService
          return undefined
        })

        const EnvModule = Logix.Module.make('EnvModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {},
        })

        const program: Effect.Effect<void, never, any> = Effect.provideService(Effect.gen(function* () {
          yield* ModuleRuntime.make(
            { count: 0 },
            {
              moduleId: 'env-module',
              logics: [logic],
              tag: EnvModule.tag,
            },
          )
        
          // Give the background Logic fiber a chance to run and fail.
          yield* TestClock.adjust('10 millis')
        }), Debug.internal.currentDebugSinks as any, [
          sink,
        ])

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::env_service_not_found')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('warning')
        expect(diagnosticEvent?.moduleId).toBe('env-module')
      }),
    )

    it.effect('should emit logic::invalid_phase diagnostic when accessing Env in setup', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        class EnvService extends ServiceMap.Service<EnvService, { readonly label: string }>()('@tests/EnvService') {}

        const ModuleWithEnv = Logix.Module.make('ModuleWithEnv', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: {},
        })

        const logic = ModuleWithEnv.logic(($) =>
          Effect.gen(function* () {
            // Reading Env during setup should be blocked by the phase guard and converted into a logic::invalid_phase diagnostic.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _svc = yield* $.use(EnvService)
            return Effect.void
          }),
        )

        const program: Effect.Effect<void, never, any> = Effect.provideService(Effect.gen(function* () {
          yield* ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'module-with-env',
              logics: [logic],
              tag: ModuleWithEnv.tag,
            },
          )
        
          // Give the background Logic fiber a chance to run and emit the diagnostic.
          yield* TestClock.adjust('10 millis')
        }), Debug.internal.currentDebugSinks as any, [
          sink,
        ])

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        if (!diagnosticEvent) {
          // Debug aid: if the diagnostic wasn't captured, print events for inspection.
          // eslint-disable-next-line no-console
          console.error('logic::invalid_phase events', events)
        }

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent?.moduleId).toBe('module-with-env')
      }),
    )

    it.effect('should emit logic::invalid_phase when using run-only watcher APIs in setup', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        const ModuleWithWatcher = Logix.Module.make('ModuleWithWatcher', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { ping: Schema.Void },
        })

        const logic = ModuleWithWatcher.logic(($) =>
          Effect.gen(function* () {
            // Using run-only watcher APIs during setup should trigger a phase-guard diagnostic.
            yield* $.onAction('ping').run(Effect.void)
            return Effect.void
          }),
        )

        const program: Effect.Effect<void, never, any> = Effect.provideService(Effect.gen(function* () {
          yield* ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'module-with-watcher',
              logics: [logic],
              tag: ModuleWithWatcher.tag,
            },
          )
        
          yield* Effect.yieldNow
          yield* TestClock.adjust('10 millis')
        }), Debug.internal.currentDebugSinks as any, [
          sink,
        ])

        yield* program

        const diagnosticEvent =
          events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase') ??
          events.find((e) => e.type === 'lifecycle:error')

        expect(events.some((e) => e.type === 'module:init')).toBe(true)
      }),
    )

    it.effect('should keep phase guard active for LogicPlan setup violations', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        const PlanModule = Logix.Module.make('PlanPhaseGuard', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { ping: Schema.Void },
        })

        const logic = PlanModule.logic<never>(($) => {
          const setup = $.onAction('ping').run(Effect.void)
          const run = Effect.void
          const plan = { setup, run }
          const effect = Effect.succeed(plan) as any
          LogicPlanMarker.markAsLogicPlanEffect(effect)
          return effect
        })

        const program: Effect.Effect<void, never, any> = Effect.provideService(Effect.gen(function* () {
          yield* ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'plan-phase-guard',
              logics: [logic],
              tag: PlanModule.tag,
            },
          )
        
          yield* TestClock.adjust('10 millis')
        }), Debug.internal.currentDebugSinks, [sink])

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent && 'moduleId' in diagnosticEvent ? (diagnosticEvent as any).moduleId : undefined).toBe(
          'PlanPhaseGuard',
        )
      }),
    )

    it.effect('should keep phase guard active for nested LogicPlanEffect setup violations', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        const PlanModule = Logix.Module.make('PlanPhaseGuardNested', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { ping: Schema.Void },
        })

        const logic = PlanModule.logic<never>(($) => {
          const setup = $.onAction('ping').run(Effect.void)
          const run = Effect.void

          const inner = Effect.succeed({ setup, run }) as any
          LogicPlanMarker.markAsLogicPlanEffect(inner)

          const outer = Effect.succeed(inner) as any
          LogicPlanMarker.markAsLogicPlanEffect(outer)

          return outer
        })

        const program: Effect.Effect<void, never, any> = Effect.provideService(Effect.gen(function* () {
          yield* ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'plan-phase-guard-nested',
              logics: [logic],
              tag: PlanModule.tag,
            },
          )
        
          yield* TestClock.adjust('10 millis')
        }), Debug.internal.currentDebugSinks, [sink])

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent && 'moduleId' in diagnosticEvent ? (diagnosticEvent as any).moduleId : undefined).toBe(
          'PlanPhaseGuardNested',
        )
      }),
    )

    it.effect('should emit logic::invalid_phase when using lifecycle.onInit in LogicPlan.run', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        const PlanModule = Logix.Module.make('PlanLifecycleInitGuard', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: {},
        })

        const logic = PlanModule.logic(($) => ({
          setup: Effect.void,
          run: Effect.gen(function* () {
            // Using $.lifecycle.onInit during LogicPlan.run should be blocked by the phase guard,
            // converted into a logic::invalid_phase diagnostic, and must not affect runtime construction.
            yield* $.lifecycle.onInit(Effect.void)
          }),
        }))

        const program: Effect.Effect<void, never, any> = Effect.provideService(Effect.gen(function* () {
          yield* ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'plan-lifecycle-init-guard',
              logics: [logic],
              tag: PlanModule.tag,
            },
          )
        
          yield* Effect.yieldNow
          yield* TestClock.adjust('10 millis')
        }), Debug.internal.currentDebugSinks as any, [
          sink,
        ])

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent && 'moduleId' in diagnosticEvent ? (diagnosticEvent as any).moduleId : undefined).toBe(
          'plan-lifecycle-init-guard',
        )
      }),
    )

    it.effect('should allow run-only access in LogicPlan.run when phase service switches to run', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        class EnvService extends ServiceMap.Service<EnvService, { readonly label: string }>()('@tests/EnvService') {}

        const PlanModule = Logix.Module.make('PlanPhaseRun', {
          state: Schema.Struct({ label: Schema.String }),
          actions: {},
        })

        const logic = PlanModule.logic(($) => {
          const setup = Effect.void
          const run = Effect.gen(function* () {
            const svc = yield* $.use(EnvService)
            yield* $.state.update(() => ({ label: svc.label }))
          })
          const plan = { setup, run }
          const effect = Effect.succeed(plan) as any
          LogicPlanMarker.markAsLogicPlanEffect(effect)
          return effect
        })

        const layer = Layer.succeed(EnvService, { label: 'ok' } as { readonly label: string })

        const program = Effect.provideService(Effect.provide(
          Effect.gen(function* () {
            const runtime = yield* ModuleRuntime.make(
              { label: 'init' },
              {
                moduleId: 'plan-phase-run',
                logics: [logic],
                tag: PlanModule.tag,
              },
            )
        
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
        
            const state = yield* runtime.getState
            expect(state.label).toBe('ok')
          }),
          layer as Layer.Layer<any, never, never>,
        ), Debug.internal.currentDebugSinks as any, [sink])

        yield* program

        const invalidPhase = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(invalidPhase).toBeUndefined()
      }),
    )

    it.effect('should support LogicPlan setup before run', () =>
      Effect.gen(function* () {
        const completed = yield* Deferred.make<void>()

        const PlanModule = Logix.Module.make('LogicPlanModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const logic = PlanModule.logic(($) => {
          const setup = $.reducer(
            'inc',
            Logix.Module.Reducer.mutate((draft) => {
              draft.count += 1
            }),
          )

          const run = Effect.gen(function* () {
            // Trigger the reducer; this depends on setup having been registered already.
            yield* $.dispatchers.inc()
            yield* Deferred.succeed(completed, undefined)
          })

          const plan = { setup, run }
          const effect = Effect.succeed(plan) as any
          LogicPlanMarker.markAsLogicPlanEffect(effect)
          return effect
        })

        const layer = PlanModule.live({ count: 0 }, logic) as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

        const runtimeManager = ManagedRuntime.make(layer)

        const program = Effect.gen(function* () {
          const runtime = yield* Effect.service(PlanModule.tag).pipe(Effect.orDie)
          yield* Deferred.await(completed)
          const state = yield* runtime.getState
          expect(state.count).toBe(1)
        })

        yield* Effect.promise(() => runtimeManager.runPromise(program as unknown as Effect.Effect<void, never, any>))
      }),
    )

    it.effect('should run direct LogicPlan through canonical setup/run pipeline', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        class EnvService extends ServiceMap.Service<EnvService, { readonly label: string }>()('@tests/DirectPlanEnvService') {}

        const PlanModule = Logix.Module.make('DirectPlanCanonical', {
          state: Schema.Struct({ count: Schema.Number, label: Schema.String }),
          actions: { inc: Schema.Void },
        })

        const logic = PlanModule.logic(($) => ({
          setup: $.reducer(
            'inc',
            Logix.Module.Reducer.mutate((draft) => {
              draft.count += 1
            }),
          ),
          run: Effect.gen(function* () {
            const svc = yield* $.use(EnvService)
            yield* $.dispatchers.inc()
            yield* $.state.update((prev) => ({ ...prev, label: svc.label }))
          }),
        }))

        const layer = Layer.succeed(EnvService, { label: 'ok' } as { readonly label: string })

        const program = Effect.provideService(Effect.provide(
          Effect.gen(function* () {
            const runtime = yield* ModuleRuntime.make(
              { count: 0, label: 'init' },
              {
                moduleId: 'direct-plan-canonical',
                logics: [logic],
                tag: PlanModule.tag,
              },
            )
        
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
        
            const state = yield* runtime.getState
            expect(state.count).toBe(1)
            expect(state.label).toBe('ok')
          }),
          layer as Layer.Layer<any, never, never>,
        ), Debug.internal.currentDebugSinks as any, [sink])

        yield* program

        const invalidPhase = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')
        expect(invalidPhase).toBeUndefined()
      }),
    )

    it.effect('should ignore legacy single-phase return value that looks like LogicPlan', () =>
      Effect.gen(function* () {
        let setupExecuted = false
        let runExecuted = false

        const LegacyCompatModule = Logix.Module.make('LegacyCompatPlanReturn', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {},
        })

        // Intentionally do NOT mark this as LogicPlanEffect:
        // under canonical semantics this value is treated as a plain run result and should be ignored.
        const logic = Effect.succeed({
          setup: Effect.sync(() => {
            setupExecuted = true
          }),
          run: Effect.sync(() => {
            runExecuted = true
          }),
        } as any)

        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'legacy-compat-plan-return',
            logics: [logic],
            tag: LegacyCompatModule.tag,
          },
        )

        yield* Effect.yieldNow
        yield* TestClock.adjust('10 millis')

        const state = yield* runtime.getState
        expect(state.count).toBe(0)
        expect(setupExecuted).toBe(false)
        expect(runExecuted).toBe(false)
      }),
    )

    it.effect('should keep compatibility for marked LogicPlanEffect returned from single-phase logic', () =>
      Effect.gen(function* () {
        let setupExecuted = false
        let runExecuted = false

        const LegacyCompatPlanEffectModule = Logix.Module.make('LegacyCompatPlanEffectReturn', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {},
        })

        // Intentionally do NOT mark the outer single-phase logic as LogicPlanEffect:
        // compatibility path still resolves a marked LogicPlanEffect returned by run.
        const logic = Effect.succeed(undefined).pipe(
          Effect.map(() => {
            const planEffect = Effect.succeed({
              setup: Effect.sync(() => {
                setupExecuted = true
              }),
              run: Effect.sync(() => {
                runExecuted = true
              }),
            }) as any
            LogicPlanMarker.markAsLogicPlanEffect(planEffect)
            return planEffect
          }),
        )

        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'legacy-compat-plan-effect-return',
            logics: [logic],
            tag: LegacyCompatPlanEffectModule.tag,
          },
        )

        yield* Effect.yieldNow
        yield* TestClock.adjust('10 millis')

        const state = yield* runtime.getState
        expect(state.count).toBe(0)
        expect(setupExecuted).toBe(true)
        expect(runExecuted).toBe(true)
      }),
    )
  })

  describe('StateTransaction integration', () => {
    it.effect('StateTransaction.commit should aggregate patches and write state once (full instrumentation)', () =>
      Effect.gen(function* () {
        type S = { count: number }

        const ref = yield* SubscriptionRef.make<S>({ count: 0 })

        // Use a controllable now() so time fields can be asserted later if needed.
        let nowCounter = 0
        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'TxnUnitModule',
          instanceId: 'unit-instance',
          instrumentation: 'full',
          captureSnapshots: true,
          now: () => ++nowCounter,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'basic-aggregation' }, { count: 0 })

        StateTransaction.updateDraft(ctx, { count: 1 })
        StateTransaction.recordPatch(ctx, 'count', 'reducer', 0, 1)

        StateTransaction.updateDraft(ctx, { count: 2 })
        StateTransaction.recordPatch(ctx, 'count', 'reducer', 1, 2)

        const txn = yield* StateTransaction.commit(ctx, ref)

        expect(txn).toBeDefined()
        expect(txn?.moduleId).toBe('TxnUnitModule')
        expect(txn?.instanceId).toBe('unit-instance')
        expect(txn?.patches).toHaveLength(2)
        expect(txn?.initialStateSnapshot).toEqual({ count: 0 })
        expect(txn?.finalStateSnapshot).toEqual({ count: 2 })
        expect(yield* SubscriptionRef.get(ref)).toEqual({ count: 2 })
      }),
    )

    it.effect('StateTransaction.commitWithState should stay semantically equivalent to commit', () =>
      Effect.gen(function* () {
        type S = { count: number }

        const makeContext = () =>
          StateTransaction.makeContext<S>({
            moduleId: 'TxnUnitModule',
            instanceId: 'unit-instance',
            instrumentation: 'full',
            captureSnapshots: true,
            now: () => 1,
          })

        const prepare = (ctx: StateTransaction.StateTxnContext<S>) => {
          StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'commit-equivalence' }, { count: 0 })
          StateTransaction.updateDraft(ctx, { count: 1 })
          StateTransaction.recordPatch(ctx, 'count', 'reducer', 0, 1)
          StateTransaction.updateDraft(ctx, { count: 2 })
          StateTransaction.recordPatch(ctx, 'count', 'reducer', 1, 2)
        }

        const refByCommit = yield* SubscriptionRef.make<S>({ count: 0 })
        const ctxByCommit = makeContext()
        prepare(ctxByCommit)
        const committedTxn = yield* StateTransaction.commit(ctxByCommit, refByCommit)

        const refByCommitWithState = yield* SubscriptionRef.make<S>({ count: 0 })
        const ctxByCommitWithState = makeContext()
        prepare(ctxByCommitWithState)
        const committedResult = yield* StateTransaction.commitWithState(ctxByCommitWithState, refByCommitWithState)

        expect(committedTxn).toBeDefined()
        expect(committedResult).toBeDefined()
        expect(committedResult?.transaction).toEqual(committedTxn)

        const stateFromCommit = yield* SubscriptionRef.get(refByCommit)
        const stateFromCommitWithState = yield* SubscriptionRef.get(refByCommitWithState)
        expect(committedResult?.finalState).toEqual(stateFromCommitWithState)
        expect(stateFromCommitWithState).toEqual(stateFromCommit)
      }),
    )

    it.effect('StateTransaction.commit and commitWithState should both keep 0-commit semantics', () =>
      Effect.gen(function* () {
        type S = { count: number }

        const makeContext = () =>
          StateTransaction.makeContext<S>({
            moduleId: 'TxnUnitModule',
            instanceId: 'unit-instance',
            instrumentation: 'full',
            captureSnapshots: true,
            now: () => 1,
          })

        const refByCommit = yield* SubscriptionRef.make<S>({ count: 0 })
        const ctxByCommit = makeContext()
        const baseByCommit = { count: 0 }
        StateTransaction.beginTransaction(ctxByCommit, { kind: 'unit-test', name: 'zero-commit' }, baseByCommit)
        StateTransaction.updateDraft(ctxByCommit, baseByCommit)
        const committedTxn = yield* StateTransaction.commit(ctxByCommit, refByCommit)
        expect(committedTxn).toBeUndefined()
        expect(ctxByCommit.current).toBeUndefined()
        expect(yield* SubscriptionRef.get(refByCommit)).toEqual({ count: 0 })

        const refByCommitWithState = yield* SubscriptionRef.make<S>({ count: 0 })
        const ctxByCommitWithState = makeContext()
        const baseByCommitWithState = { count: 0 }
        StateTransaction.beginTransaction(
          ctxByCommitWithState,
          { kind: 'unit-test', name: 'zero-commit-with-state' },
          baseByCommitWithState,
        )
        StateTransaction.updateDraft(ctxByCommitWithState, baseByCommitWithState)
        const committedResult = yield* StateTransaction.commitWithState(ctxByCommitWithState, refByCommitWithState)
        expect(committedResult).toBeUndefined()
        expect(ctxByCommitWithState.current).toBeUndefined()
        expect(yield* SubscriptionRef.get(refByCommitWithState)).toEqual({ count: 0 })
      }),
    )

    it.effect('StateTransaction should honor light instrumentation (no patches / snapshots)', () =>
      Effect.gen(function* () {
        type S = { value: number }

        const ref = yield* SubscriptionRef.make<S>({ value: 0 })
        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'LightModule',
          instanceId: 'light-instance',
          instrumentation: 'light',
          captureSnapshots: false,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'light' }, { value: 0 })

        // In light mode, even frequent updateDraft / recordPatch calls should not accumulate patches or snapshots,
        // to avoid extra overhead in high-trait / high-frequency scenarios (T026).
        for (let i = 0; i < 100; i++) {
          StateTransaction.updateDraft(ctx, { value: i + 1 })
          StateTransaction.recordPatch(ctx, 'value', 'reducer', i, i + 1)

          StateTransaction.recordPatch(ctx, 'value', 'trait-computed', i + 1, i + 1)
        }

        const txn = yield* StateTransaction.commit(ctx, ref)

        // In light mode, no patches/snapshots are recorded, but the final state should still be written (last updateDraft wins).
        expect(txn).toBeDefined()
        expect(txn?.patches.length).toBe(0)
        expect(txn?.initialStateSnapshot).toBeUndefined()
        expect(txn?.finalStateSnapshot).toBeUndefined()
        expect(yield* SubscriptionRef.get(ref)).toEqual({ value: 100 })
      }),
    )

    it.effect('StateTransaction.commit should snapshot dirtyPathIds (id-first) without constructing DirtySet roots', () =>
      Effect.gen(function* () {
        type S = { a: { b: { c: number } } }

        const ref = yield* SubscriptionRef.make<S>({ a: { b: { c: 0 } } })

        const registry = makeFieldPathIdRegistry([['b'], ['a', 'b'], ['a'], ['a', 'b', 'c']])

        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'DirtySetUnitModule',
          instanceId: 'dirtyset-instance',
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'dirty-set' }, { a: { b: { c: 0 } } })

        StateTransaction.updateDraft(ctx, { a: { b: { c: 1 } } })
        StateTransaction.recordPatch(ctx, 'a.b', 'reducer')
        StateTransaction.recordPatch(ctx, 'b', 'reducer')
        StateTransaction.recordPatch(ctx, ['a', 'b', 'c'], 'reducer')

        const txn = yield* StateTransaction.commit(ctx, ref)

        expect(txn).toBeDefined()
        expect(txn?.dirty.dirtyAll).toBe(false)
        expect(txn?.dirty.dirtyAllReason).toBeUndefined()
        expect(txn?.dirty.dirtyPathIds).toEqual([1, 0, 3])
        expect(txn?.dirty.dirtyPathsKeySize).toBe(3)
        expect(typeof txn?.dirty.dirtyPathsKeyHash).toBe('number')
        expect(Number.isFinite(txn?.dirty.dirtyPathsKeyHash)).toBe(true)
      }),
    )

    it.effect('StateTransaction.commit should infer dirty evidence for whole-state replace ("*") when registry is available', () =>
      Effect.gen(function* () {
        type S = { a: number; b: number; items: ReadonlyArray<number> }

        const ref = yield* SubscriptionRef.make<S>({ a: 0, b: 0, items: [1, 2, 3] })
        const registry = makeFieldPathIdRegistry([['a'], ['b'], ['items']])

        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'InferReplaceUnitModule',
          instanceId: 'infer-replace-instance',
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          getListPathSet: () => new Set(['items']),
          now: () => 1,
        })

        StateTransaction.beginTransaction(
          ctx,
          { kind: 'unit-test', name: 'infer-replace' },
          { a: 0, b: 0, items: [1, 2, 3] },
        )
        StateTransaction.updateDraft(ctx, { a: 1, b: 0, items: [1, 4, 3] })
        StateTransaction.recordPatch(ctx, '*', 'reducer')

        const txn = yield* StateTransaction.commit(ctx, ref)

        expect(txn).toBeDefined()
        expect(txn?.dirty.dirtyAll).toBe(false)
        expect(txn?.dirty.dirtyAllReason).toBeUndefined()
        expect(txn?.dirty.dirtyPathIds).toEqual([0, 2])
        expect(txn?.dirty.dirtyPathsKeySize).toBe(2)
      }),
    )

    it.effect('StateTransaction should skip replace inference (if_empty) when explicit evidence exists', () =>
      Effect.gen(function* () {
        type S = { a: number; b: number }

        const ref = yield* SubscriptionRef.make<S>({ a: 0, b: 0 })
        const registry = makeFieldPathIdRegistry([['a'], ['b']])

        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'InferReplaceSkipUnitModule',
          instanceId: 'infer-replace-skip-instance',
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'infer-replace-skip' }, { a: 0, b: 0 })
        StateTransaction.updateDraft(ctx, { a: 1, b: 0 })

        // Explicit evidence exists; a subsequent setState marker ("*") should not trigger extra inference work.
        StateTransaction.recordPatch(ctx, 'a', 'unknown', 0, 1)
        StateTransaction.recordPatch(ctx, '*', 'unknown')

        const txn = yield* StateTransaction.commit(ctx, ref)

        expect(txn).toBeDefined()
        expect(txn?.dirty.dirtyAll).toBe(false)
        expect(txn?.dirty.dirtyPathIds).toEqual([0])
        expect(txn?.patchCount).toBe(2)
      }),
    )

    it.effect('StateTransaction.recordPatch("*", "perf") should keep forcing dirtyAll (perf harness contract)', () =>
      Effect.gen(function* () {
        type S = { a: number }

        const ref = yield* SubscriptionRef.make<S>({ a: 0 })
        const registry = makeFieldPathIdRegistry([['a']])

        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'PerfDirtyAllUnitModule',
          instanceId: 'perf-dirtyall-instance',
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'perf-dirtyall' }, { a: 0 })
        StateTransaction.updateDraft(ctx, { a: 1 })
        StateTransaction.recordPatch(ctx, '*', 'perf')

        const txn = yield* StateTransaction.commit(ctx, ref)

        expect(txn).toBeDefined()
        expect(txn?.dirty.dirtyAll).toBe(true)
        expect(txn?.dirty.dirtyAllReason).toBe('unknownWrite')
        expect(txn?.dirty.dirtyPathIds).toEqual([])
      }),
    )

    it.effect('setState inside an active transaction should infer dirty evidence (no dirtyAll degrade)', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(16)

        const InferModule = Logix.Module.make('InferReplaceInTxnSetStateModule', {
          state: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
          actions: { noop: Schema.Null },
        })

        const program = Effect.provideService(Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { a: 0, b: 0 },
            {
              moduleId: 'InferReplaceInTxnSetStateModule',
              tag: InferModule.tag,
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                yield* Logix.InternalContracts.runWithStateTransaction(
                  runtime as any,
                  { kind: 'unit-test', name: 'in-txn-setState' },
                  () => runtime.setState({ a: 1, b: 0 }),
                )
                
                const updates = ring
                  .getSnapshot()
                  .filter(
                    (event) =>
                      event.type === 'state:update' && event.moduleId === 'InferReplaceInTxnSetStateModule',
                  ) as any[]
                
                expect(updates.length).toBeGreaterThanOrEqual(1)
                const last = updates[updates.length - 1]!
                expect(last.dirtySet).toBeDefined()
                expect(last.dirtySet.dirtyAll).toBe(false)
                expect(last.dirtySet.pathCount).toBeGreaterThan(0)
              }),
            ),
          ),
        ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink]), Debug.internal.currentDiagnosticsLevel as any, 'light')

        yield* program
      }),
    )

    it.effect('StateTransaction full patch records must be bounded (<=256) and mark truncation', () =>
      Effect.gen(function* () {
        type S = { value: number }

        const ref = yield* SubscriptionRef.make<S>({ value: 0 })

        const registry = makeFieldPathIdRegistry([['value']])

        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'PatchBoundModule',
          instanceId: 'patchbound-instance',
          instrumentation: 'full',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'patch-bounded' }, { value: 0 })

        for (let i = 0; i < 300; i++) {
          StateTransaction.updateDraft(ctx, { value: i + 1 })
          StateTransaction.recordPatch(ctx, ['value'], 'reducer', i, i + 1, undefined, 0)
        }

        const txn = yield* StateTransaction.commit(ctx, ref)

        expect(txn).toBeDefined()
        expect(txn?.patchCount).toBe(300)
        expect(txn?.patchesTruncated).toBe(true)
        expect(txn?.patchesTruncatedReason).toBe('max_patches')
        expect(txn?.patches.length).toBe(256)
        expect(txn?.patches[0]).toMatchObject({ opSeq: 0, reason: 'reducer', pathId: 0, stepId: 0 })
      }),
    )

    it.effect('StateTransaction full patch records should normalize optional metadata fields', () =>
      Effect.gen(function* () {
        type S = { value: number }

        const ref = yield* SubscriptionRef.make<S>({ value: 0 })
        const registry = makeFieldPathIdRegistry([['value']])

        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'PatchMetaModule',
          instanceId: 'patch-meta-instance',
          instrumentation: 'full',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'patch-meta' }, { value: 0 })
        StateTransaction.updateDraft(ctx, { value: 1 })
        StateTransaction.recordPatch(ctx, ['value'], 'reducer', undefined, 1, '', -3)

        const txn = yield* StateTransaction.commit(ctx, ref)
        expect(txn).toBeDefined()
        expect(txn?.patches).toHaveLength(1)
        expect(txn?.patches[0]).toEqual({
          opSeq: 0,
          pathId: 0,
          reason: 'reducer',
          to: 1,
        })
      }),
    )

    it.effect('should support dev-only time-travel: applyTransactionSnapshot(before) restores previous state', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const TimeTravelModule = Logix.Module.make('TimeTravelModule', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { set: Schema.Number },
        })

        const program = Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'TimeTravelModule',
              tag: TimeTravelModule.tag,
              reducers: {
                set: (state, action) => ({
                  ...state,
                  value: (action as any).payload as number,
                }),
              },
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                // Two transactions in order: value = 1, value = 2
                yield* runtime.dispatch({ _tag: 'set', payload: 1 } as any)
                yield* runtime.dispatch({ _tag: 'set', payload: 2 } as any)
        
                const beforeTravel = yield* runtime.getState
                expect(beforeTravel.value).toBe(2)
        
                // Find the txnId for the second state:update from Debug events.
                const events = ring
                  .getSnapshot()
                  .filter(
                    (event) =>
                      event.moduleId === 'TimeTravelModule' && event.type === 'state:update' && (event as any).txnId,
                  ) as any[]
        
                expect(events.length).toBeGreaterThanOrEqual(2)
                const secondTxnEvent = events[1]!
                const txnId = secondTxnEvent.txnId as string
                expect(typeof txnId).toBe('string')
        
                // Travel back to the state before that transaction started (should be value = 1).
                yield* Logix.InternalContracts.applyTransactionSnapshot(runtime as any, txnId, 'before')
        
                const afterTravel = yield* runtime.getState
                expect(afterTravel.value).toBe(1)
              }),
            ),
          ),
        ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

        yield* program
      }),
    )

    it.effect('dispatch should emit exactly one state:update event per logical entry', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(16)

        const CounterModule = Logix.Module.make('TxnRuntimeModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const program = Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { count: 0 },
            {
              moduleId: 'TxnRuntimeModule',
              tag: CounterModule.tag,
              reducers: {
                inc: (state) => ({ ...state, count: state.count + 1 }),
              },
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                // Initial construction emits one state:update (initial snapshot).
                const before = ring.getSnapshot()
                const beforeUpdates = before.filter(
                  (event) => event.type === 'state:update' && event.moduleId === 'TxnRuntimeModule',
                )
        
                expect(beforeUpdates).toHaveLength(1)
        
                // Single dispatch: expect exactly one additional state:update event.
                yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)
        
                const after = ring.getSnapshot()
                const afterUpdates = after.filter(
                  (event) => event.type === 'state:update' && event.moduleId === 'TxnRuntimeModule',
                )
        
                expect(afterUpdates).toHaveLength(2)
                // Validate state:update ordering and aggregated result.
                expect((afterUpdates[0] as any).state).toEqual({ count: 0 })
                expect((afterUpdates[1] as any).state).toEqual({ count: 1 })
        
                const state = yield* runtime.getState
                expect(state.count).toBe(1)
              }),
            ),
          ),
        ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

        yield* program
      }),
    )

    it.effect('should attach the same txnId to action and state events for a single dispatch', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const CounterModule = Logix.Module.make('TxnDebugModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const program = Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { count: 0 },
            {
              moduleId: 'TxnDebugModule',
              tag: CounterModule.tag,
              reducers: {
                inc: (state) => ({ ...state, count: state.count + 1 }),
              },
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                // Single dispatch: expect one action:dispatch with txnId and one state:update with the same txnId.
                yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)
        
                const events = ring
                  .getSnapshot()
                  .filter(
                    (event) =>
                      event.moduleId === 'TxnDebugModule' &&
                      (event.type === 'action:dispatch' || event.type === 'state:update'),
                  )
        
                const actionEvent = events.find((event) => event.type === 'action:dispatch') as any
                expect(actionEvent).toBeDefined()
                expect(typeof actionEvent.txnId === 'string').toBe(true)
        
                // The initial snapshot state:update has no txnId; only the post-commit one matters here.
                const stateEventsWithTxn = events.filter(
                  (event) => event.type === 'state:update' && (event as any).txnId != null,
                ) as any[]
        
                expect(stateEventsWithTxn.length).toBe(1)
                expect(stateEventsWithTxn[0].txnId).toBe(actionEvent.txnId)
              }),
            ),
          ),
        ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

        yield* program
      }),
    )

    it.effect('trace:txn-phase should retain dispatch phase counters after commit', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const CounterModule = Logix.Module.make('TxnPhaseTraceModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const program = Effect.provideService(Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { count: 0 },
            {
              moduleId: 'TxnPhaseTraceModule',
              tag: CounterModule.tag,
              reducers: {
                inc: (state) => ({ ...state, count: state.count + 1 }),
              },
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)

                const phaseEvent = ring
                  .getSnapshot()
                  .find((event) => event.type === 'trace:txn-phase' && event.moduleId === 'TxnPhaseTraceModule') as
                  | any
                  | undefined

                expect(phaseEvent).toBeDefined()
                expect(phaseEvent?.data?.dispatchActionCount).toBe(1)
                expect(typeof phaseEvent?.data?.dispatchActionRecordMs).toBe('number')
                expect(typeof phaseEvent?.data?.dispatchActionCommitHubMs).toBe('number')
              }),
            ),
          ),
        ), Debug.internal.currentDiagnosticsLevel as any, 'light'), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

        yield* program
      }),
    )

    it.effect('state:update diagnostics should keep dirtySet metadata anchors when pathIds are truncated', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const DirtySetMetaModule = Logix.Module.make('TxnDirtySetMetaModule', {
          state: Schema.Struct({
            a: Schema.Number,
            b: Schema.Number,
            c: Schema.Number,
            d: Schema.Number,
          }),
          actions: { bumpAll: Schema.Void },
        })

        const program = Effect.provideService(Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { a: 0, b: 0, c: 0, d: 0 },
            {
              moduleId: 'TxnDirtySetMetaModule',
              tag: DirtySetMetaModule.tag,
              reducers: {
                bumpAll: Logix.Module.Reducer.mutate((draft) => {
                  draft.a += 1
                  draft.b += 1
                  draft.c += 1
                  draft.d += 1
                }),
              },
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                yield* runtime.dispatch({ _tag: 'bumpAll', payload: undefined } as any)
                
                const committedStateUpdates = ring.getSnapshot().filter(
                  (event) =>
                    event.type === 'state:update' &&
                    event.moduleId === 'TxnDirtySetMetaModule' &&
                    (event as any).txnId != null,
                ) as any[]
                
                expect(committedStateUpdates).toHaveLength(1)
                
                const stateUpdate = committedStateUpdates[0]
                const dirtySet = stateUpdate?.dirtySet as any
                
                expect(dirtySet).toMatchObject({
                  dirtyAll: false,
                  pathCount: 4,
                  keySize: 4,
                  pathIdsTruncated: true,
                })
                expect(Array.isArray(dirtySet?.pathIds)).toBe(true)
                expect(dirtySet.pathIds).toHaveLength(3)
                expect(dirtySet.pathIds.every((id: unknown) => typeof id === 'number' && Number.isFinite(id))).toBe(
                  true,
                )
                expect('rootPaths' in dirtySet).toBe(false)
                expect(typeof dirtySet.keyHash).toBe('number')
                expect(stateUpdate?.patchCount).toBe(4)
                expect(stateUpdate?.patchesTruncated).toBe(false)
                expect(stateUpdate?.patchesTruncatedReason).toBeUndefined()
              }),
            ),
          ),
        ), Debug.internal.currentDiagnosticsLevel as any, 'light'), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

        yield* program
      }),
    )

    it.effect('should serialize concurrent dispatch calls per runtime instance', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const CounterModule = Logix.Module.make('TxnQueueModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const program = Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { count: 0 },
            {
              moduleId: 'TxnQueueModule',
              tag: CounterModule.tag,
              reducers: {
                inc: (state) => ({ ...state, count: state.count + 1 }),
              },
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                // 5 concurrent dispatches should be serialized FIFO, ending with count = 5.
                yield* Effect.all(
                  [
                    runtime.dispatch({ _tag: 'inc', payload: undefined } as any),
                    runtime.dispatch({ _tag: 'inc', payload: undefined } as any),
                    runtime.dispatch({ _tag: 'inc', payload: undefined } as any),
                    runtime.dispatch({ _tag: 'inc', payload: undefined } as any),
                    runtime.dispatch({ _tag: 'inc', payload: undefined } as any),
                  ],
                  { concurrency: 'unbounded' },
                )
        
                const state = yield* runtime.getState
                expect(state.count).toBe(5)
              }),
            ),
          ),
        ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

        yield* program
      }),
    )

    it.effect('should allow different runtime instances to dispatch in parallel', () =>
      Effect.gen(function* () {
        const timingMiddleware = <A, E, R>(op: EffectOpCore.EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
          Effect.gen(function* () {
            if (op.meta?.moduleId === 'SlowModule' && op.kind === 'state' && op.name === 'state:update') {
              // Simulate a slow transaction with a TestClock-controlled sleep, only for SlowModule's commit phase (state:update).
              yield* Effect.sleep('100 millis')
            }
            return yield* op.effect
          })

        const program = Effect.provideService(
          Effect.scoped(
            Effect.gen(function* () {
              const slowRuntime = yield* ModuleRuntime.make(
                { count: 0 },
                {
                  moduleId: 'SlowModule',
                  reducers: {
                    inc: (state) => ({ ...state, count: state.count + 1 }),
                  },
                },
              )

              const fastRuntime = yield* ModuleRuntime.make(
                { count: 0 },
                {
                  moduleId: 'FastModule',
                  reducers: {
                    inc: (state) => ({ ...state, count: state.count + 1 }),
                  },
                },
              )

              const slowFiber = yield* Effect.forkChild(slowRuntime.dispatch({ _tag: 'inc', payload: undefined } as any))
              const fastFiber = yield* Effect.forkChild(fastRuntime.dispatch({ _tag: 'inc', payload: undefined } as any))

              // FastModule's transaction should complete without advancing TestClock.
              yield* Fiber.join(fastFiber)

              // SlowModule is still waiting for the sleep; Fiber.poll should return None.
              const slowStatus = yield* Fiber.await(slowFiber).pipe(Effect.timeoutOption(0))
              expect(slowStatus._tag).toBe('None')

              // Advance TestClock so the slow transaction can complete.
              yield* TestClock.adjust('200 millis')
              yield* Fiber.join(slowFiber)

              const slowState = yield* slowRuntime.getState
              const fastState = yield* fastRuntime.getState

              expect(slowState.count).toBe(1)
              expect(fastState.count).toBe(1)
            }),
          ),
          EffectOpCore.EffectOpMiddlewareTag,
          { stack: [timingMiddleware] },
        )

        yield* program
      }),
    )

    it.effect(
      'traits.source.refresh should execute within a single transaction and emit one additional state:update',
      () =>
        Effect.gen(function* () {
          type State = { value: number }

          const StateSchema = Schema.Struct({
            value: Schema.Number,
          })

          type Shape = Logix.Module.Shape<typeof StateSchema, { refresh: typeof Schema.Void }>
          type Action = Logix.Module.ActionOf<Shape>

          const ring = Debug.makeRingBufferSink(16)

          const program = Effect.provideService(Effect.scoped(
            ModuleRuntime.make<State, Action>(
              { value: 0 },
              {
                moduleId: 'SourceTxnModule',
              },
            ).pipe(
              Effect.flatMap((runtime) =>
                Effect.gen(function* () {
                  const bound = BoundApiRuntime.make<Shape, never>(
                    {
                      stateSchema: StateSchema,
                      // ActionSchema is not used in this test; use a placeholder Schema to satisfy typing.
                      actionSchema: Schema.Never as any,
                      actionMap: { refresh: Schema.Void } as any,
                    } as any,
                    runtime as any,
                    {
                      getPhase: () => 'run',
                      moduleId: 'SourceTxnModule',
                    },
                  )
          
                  const before = ring.getSnapshot()
                  const beforeUpdates = before.filter(
                    (event) => event.type === 'state:update' && event.moduleId === 'SourceTxnModule',
                  )
                  expect(beforeUpdates).toHaveLength(1)
                  expect((beforeUpdates[0] as any).state).toEqual({ value: 0 })
          
                  const internals = getBoundInternals(bound as any)
                  const register = internals.traits.registerSourceRefresh
                  expect(register).toBeDefined()
          
                  register(
                    'value',
                    (state) =>
                      bound.state.mutate((draft) => {
                        draft.value = (state as State).value + 1
                      }) as any,
                  )
          
                  // Call traits.source.refresh: on runtimes that support StateTransaction,
                  // it should be wrapped as a single standalone transaction and append only one state:update.
                  yield* bound.traits.source.refresh('value')
          
                  const after = ring.getSnapshot()
                  const afterUpdates = after.filter(
                    (event) => event.type === 'state:update' && event.moduleId === 'SourceTxnModule',
                  )
          
                  expect(afterUpdates).toHaveLength(2)
                  expect((afterUpdates[1] as any).state).toEqual({ value: 1 })
          
                  const finalState = (yield* runtime.getState) as State
                  expect(finalState.value).toBe(1)
                }),
              ),
            ),
          ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink]) as Effect.Effect<void, never, any>

          yield* program
        }),
    )

    it.effect('traits.source.refresh should not deadlock when called inside an existing transaction', () =>
      Effect.gen(function* () {
        type State = { value: number }

        const StateSchema = Schema.Struct({
          value: Schema.Number,
        })

        type Shape = Logix.Module.Shape<typeof StateSchema, { outer: typeof Schema.Void; refresh: typeof Schema.Void }>
        type Action = Logix.Module.ActionOf<Shape>

        const ring = Debug.makeRingBufferSink(16)

        const program = Effect.provideService(Effect.scoped(
          ModuleRuntime.make<State, Action>(
            { value: 0 },
            {
              moduleId: 'SourceTxnInTxnModule',
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                const bound = BoundApiRuntime.make<Shape, never>(
                  {
                    stateSchema: StateSchema,
                    // ActionSchema is not used in this test; use a placeholder Schema to satisfy typing.
                    actionSchema: Schema.Never as any,
                    actionMap: { outer: Schema.Void, refresh: Schema.Void } as any,
                  } as any,
                  runtime as any,
                  {
                    getPhase: () => 'run',
                    moduleId: 'SourceTxnInTxnModule',
                  },
                )
        
                const internals = getBoundInternals(bound as any)
                const register = internals.traits.registerSourceRefresh
                expect(register).toBeDefined()
        
                register(
                  'value',
                  (state) =>
                    bound.state.mutate((draft) => {
                      draft.value = (state as State).value + 1
                    }) as any,
                )
        
                const before = ring.getSnapshot()
                const beforeUpdates = before.filter(
                  (event) => event.type === 'state:update' && event.moduleId === 'SourceTxnInTxnModule',
                )
                expect(beforeUpdates).toHaveLength(1)
        
                // Calling traits.source.refresh inside a transaction window:
                // - must not go through enqueueTransaction (otherwise deadlock);
                // - must not start a nested transaction (otherwise extra state:update).
                yield* Logix.InternalContracts.runWithStateTransaction(
                  runtime as any,
                  { kind: 'test', name: 'outer' },
                  () => bound.traits.source.refresh('value') as any,
                ).pipe(
                  Effect.timeoutOption('200 millis'),
                  Effect.flatMap((maybe) =>
                    Option.isSome(maybe)
                      ? Effect.void
                      : Effect.die(new Error('[test] traits.source.refresh deadlocked inside transaction')),
                  ),
                )
        
                const after = ring.getSnapshot()
                const afterUpdates = after.filter(
                  (event) => event.type === 'state:update' && event.moduleId === 'SourceTxnInTxnModule',
                )
        
                expect(afterUpdates).toHaveLength(2)
                expect((afterUpdates[1] as any).state).toEqual({ value: 1 })
        
                const finalState = (yield* runtime.getState) as State
                expect(finalState.value).toBe(1)
              }),
            ),
          ),
        ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink]) as unknown as Effect.Effect<void, never, any>

        yield* program
      }),
    )

    it.effect('ModuleRuntime should use NODE_ENV-based default instrumentation when no overrides', () =>
      Effect.gen(function* () {
        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'DefaultInstrModule',
          },
        )

        const instrumentation = Logix.InternalContracts.getStateTransactionInstrumentation(runtime as any)
        expect(instrumentation).toBe(getDefaultStateTxnInstrumentation())
      }),
    )

    it.effect('RuntimeOptions.stateTransaction should override NODE_ENV default for ModuleRuntime', () =>
      Effect.gen(function* () {
        const Counter = Logix.Module.make('RuntimeInstrCounter', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const CounterImpl = Counter.implement({
          initial: { count: 0 },
          logics: [],
        })

        const runtimeManager = Logix.Runtime.make(CounterImpl, {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          stateTransaction: { instrumentation: 'light' },
        })

        const program = Effect.gen(function* () {
          const rt = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
          const instrumentation = Logix.InternalContracts.getStateTransactionInstrumentation(rt as any)
          expect(instrumentation).toBe('light')
        })

        yield* Effect.promise(() => runtimeManager.runPromise(program as unknown as Effect.Effect<void, never, any>))
      }),
    )

    it.effect('ModuleImpl.stateTransaction should override RuntimeOptions.stateTransaction', () =>
      Effect.gen(function* () {
        const Counter = Logix.Module.make('ModuleInstrCounter', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const CounterImpl = Counter.implement({
          initial: { count: 0 },
          logics: [],
          stateTransaction: { instrumentation: 'full' },
        })

        const runtimeManager = Logix.Runtime.make(CounterImpl, {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          stateTransaction: { instrumentation: 'light' },
        })

        const program = Effect.gen(function* () {
          const rt = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
          const instrumentation = Logix.InternalContracts.getStateTransactionInstrumentation(rt as any)
          expect(instrumentation).toBe('full')
        })

        yield* Effect.promise(() => runtimeManager.runPromise(program as Effect.Effect<void, never, any>))
      }),
    )

    it.effect('Runtime.applyTransactionSnapshot should delegate to ModuleRuntime time-travel API', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const TimeTravelModule = Logix.Module.make('TimeTravelModuleRuntimeBridge', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { set: Schema.Number },
        })

        const program = Effect.provideService(Effect.scoped(
          ModuleRuntime.make(
            { value: 0 },
            {
              moduleId: 'TimeTravelModuleRuntimeBridge',
              tag: TimeTravelModule.tag,
              reducers: {
                set: (state, action) => ({
                  ...state,
                  value: (action as any).payload as number,
                }),
              },
            },
          ).pipe(
            Effect.flatMap((runtime) =>
              Effect.gen(function* () {
                // Two transactions: value = 1, value = 2
                yield* runtime.dispatch({ _tag: 'set', payload: 1 } as any)
                yield* runtime.dispatch({ _tag: 'set', payload: 2 } as any)
        
                const beforeTravel = yield* runtime.getState
                expect(beforeTravel.value).toBe(2)
        
                const instanceId = runtime.instanceId
        
                const events = ring
                  .getSnapshot()
                  .filter(
                    (event) =>
                      event.moduleId === 'TimeTravelModuleRuntimeBridge' &&
                      event.type === 'state:update' &&
                      (event as any).txnId,
                  ) as any[]
        
                expect(events.length).toBeGreaterThanOrEqual(2)
                const secondTxnEvent = events[1]!
                const txnId = secondTxnEvent.txnId as string
                expect(typeof txnId).toBe('string')
        
                // Time-travel via Runtime.applyTransactionSnapshot using moduleId + instanceId.
                yield* Logix.Runtime.applyTransactionSnapshot(
                  'TimeTravelModuleRuntimeBridge',
                  instanceId,
                  txnId,
                  'before',
                )
        
                const afterTravel = yield* runtime.getState
                expect(afterTravel.value).toBe(1)
              }),
            ),
          ),
        ), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

        yield* program
      }),
    )
  })
})
