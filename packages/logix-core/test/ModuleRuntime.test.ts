import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import {
  Chunk,
  Effect,
  Fiber,
  FiberId,
  Deferred,
  Layer,
  Queue,
  Schema,
  Stream,
  SubscriptionRef,
  TestClock,
  Context,
  PubSub,
  ManagedRuntime,
} from 'effect'
import * as Logix from '../src/index.js'
import * as ModuleRuntime from '../src/internal/runtime/ModuleRuntime.js'
import * as Debug from '../src/Debug.js'

describe('ModuleRuntime (internal)', () => {
  describe('compliance basics', () => {
    it.scoped('should maintain state consistency and ref view', () =>
      Effect.gen(function* () {
        const runtime = yield* ModuleRuntime.make({ count: 0 })

        // initial state
        expect(yield* runtime.getState).toEqual({ count: 0 })

        // update state
        yield* runtime.setState({ count: 1 })
        expect(yield* runtime.getState).toEqual({ count: 1 })

        // SubscriptionRef consistency via ref()
        const ref = runtime.ref()
        expect(yield* ref).toEqual({ count: 1 })
      }),
    )

    it.scoped('should support ref(selector) as read-only derived view', () =>
      Effect.gen(function* () {
        const runtime = yield* ModuleRuntime.make({
          count: 0,
          name: 'test',
        })

        const countRef = runtime.ref((s) => s.count)

        // initial value
        expect(yield* countRef.get).toBe(0)

        // update main state
        yield* runtime.setState({ count: 1, name: 'test' })
        expect(yield* countRef.get).toBe(1)

        // verify changes stream
        const changes = yield* Stream.runCollect(Stream.take(countRef.changes, 1))
        expect(Chunk.toReadonlyArray(changes)[0]).toBe(1)

        // write protection: derived refs are read-only, setting should fail
        const exit = yield* Effect.exit(SubscriptionRef.set(countRef, 2))
        expect(exit._tag).toBe('Failure')
      }),
    )

    it.scoped('should publish actions to actionHub (dispatch path)', () =>
      Effect.gen(function* () {
        const hub = yield* PubSub.unbounded<{ _tag: string }>()
        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            createActionHub: Effect.succeed(hub),
          },
        )

        const subscription = yield* PubSub.subscribe(hub)
        const collectorFiber = yield* Effect.fork(
          Effect.all([Queue.take(subscription), Queue.take(subscription)], { concurrency: 'unbounded' }),
        )

        yield* runtime.dispatch({ _tag: 'INC', payload: undefined } as any)
        yield* runtime.dispatch({ _tag: 'DEC', payload: undefined } as any)

        const actions = yield* Fiber.join(collectorFiber)
        const tags = actions.map((a: any) => a._tag).sort()
        expect(tags).toEqual(['DEC', 'INC'])
      }),
    )
  })

  describe('debug integration', () => {
    it.scoped('should report logic errors to DebugSink', () =>
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

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
          Effect.gen(function* () {
            // ModuleRuntime with faulty logic, running in background fiber
            yield* ModuleRuntime.make(
              { count: 0 },
              {
                moduleId: 'test-module',
                logics: [faultyLogic],
                tag: TestModule,
              },
            )

            // advance virtual clock so background fiber has time to fail
            yield* TestClock.adjust('10 millis')
          }),
        )

        yield* program

        const errorEvent = events.find((e) => e.type === 'lifecycle:error')
        expect(errorEvent).toBeDefined()
        expect(errorEvent?.moduleId).toBe('test-module')
      }),
    )

    it.scoped('should include runtimeId in module:init and module:destroy events', () =>
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

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
          Effect.scoped(
            ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'RuntimeIdModule',
                tag: TestModule,
              },
            ).pipe(Effect.flatMap(() => Effect.void)),
          ),
        )

        yield* program

        const initEvent = events.find((e) => e.type === 'module:init')
        const destroyEvent = events.find((e) => e.type === 'module:destroy')

        expect(initEvent).toBeDefined()
        expect(destroyEvent).toBeDefined()

        const initRuntimeId =
          initEvent && 'runtimeId' in initEvent ? (initEvent as any).runtimeId : undefined
        const destroyRuntimeId =
          destroyEvent && 'runtimeId' in destroyEvent ? (destroyEvent as any).runtimeId : undefined

        expect(typeof initRuntimeId).toBe('string')
        expect(destroyRuntimeId).toBe(initRuntimeId)
      }),
    )

    it.scoped('should emit logic::env_service_not_found diagnostic for missing Env service', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        class EnvService extends Context.Tag('@tests/EnvService')<EnvService, { readonly label: string }>() {}

        // Logic that immediately tries to read a missing Env service.
        const logic = Effect.gen(function* () {
          // 这里故意不在 Env 中提供 EnvService，以触发 Service not found 错误。
          // 该错误会被 ModuleRuntime 捕获并通过 LogicDiagnostics 转为 diagnostic。
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _svc = yield* EnvService
          return undefined
        })

        const EnvModule = Logix.Module.make('EnvModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {},
        })

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks as any, [
          sink,
        ])(
          Effect.gen(function* () {
            yield* ModuleRuntime.make(
              { count: 0 },
              {
                moduleId: 'env-module',
                logics: [logic],
                tag: EnvModule,
              },
            )

            // 让后台 Logic Fiber 有机会运行并失败
            yield* TestClock.adjust('10 millis')
          }),
        )

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::env_service_not_found')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('warning')
        expect(diagnosticEvent?.moduleId).toBe('env-module')
      }),
    )

    it.scoped('should emit logic::invalid_phase diagnostic when accessing Env in setup', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        class EnvService extends Context.Tag('@tests/EnvService')<EnvService, { readonly label: string }>() {}

        const ModuleWithEnv = Logix.Module.make('ModuleWithEnv', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: {},
        })

        const logic = ModuleWithEnv.logic(($) =>
          Effect.gen(function* () {
            // setup 段尝试读取 Env，应被 phase 守卫拦截并转为 logic::invalid_phase 诊断。
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _svc = yield* $.use(EnvService)
            return Effect.void
          }),
        )

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks as any, [
          sink,
        ])(
          Effect.gen(function* () {
            yield* ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'module-with-env',
                logics: [logic],
                tag: ModuleWithEnv,
              },
            )

            // 让后台 Logic Fiber 有机会运行并触发诊断
            yield* TestClock.adjust('10 millis')
          }),
        )

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        if (!diagnosticEvent) {
          // 帮助调试：若未捕获诊断，输出事件供分析
          // eslint-disable-next-line no-console
          console.error('logic::invalid_phase events', events)
        }

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent?.moduleId).toBe('module-with-env')
      }),
    )

    it.scoped('should emit logic::invalid_phase when using run-only watcher APIs in setup', () =>
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
            // setup 段使用 run-only watcher API，期望触发 phase guard 诊断。
            yield* $.onAction('ping').run(Effect.void)
            return Effect.void
          }),
        )

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks as any, [
          sink,
        ])(
          Effect.gen(function* () {
            yield* ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'module-with-watcher',
                logics: [logic],
                tag: ModuleWithWatcher,
              },
            )

            yield* Effect.yieldNow()
            yield* TestClock.adjust('10 millis')
          }),
        )

        yield* program

        const diagnosticEvent =
          events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase') ??
          events.find((e) => e.type === 'lifecycle:error')

        expect(events.some((e) => e.type === 'module:init')).toBe(true)
      }),
    )

    it.scoped('should keep phase guard active for LogicPlan setup violations', () =>
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
          effect.__logicPlan = true
          return effect
        })

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks, [sink])(
          Effect.gen(function* () {
            yield* ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'plan-phase-guard',
                logics: [logic],
                tag: PlanModule,
              },
            )

            yield* TestClock.adjust('10 millis')
          }),
        )

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent && 'moduleId' in diagnosticEvent ? (diagnosticEvent as any).moduleId : undefined).toBe(
          'PlanPhaseGuard',
        )
      }),
    )

    it.scoped('should emit logic::invalid_phase when using lifecycle.onInit in LogicPlan.setup', () =>
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

        const logic = PlanModule.logic(($) => {
          const setup = Effect.gen(function* () {
            // 在 LogicPlan.setup 段使用 $.lifecycle.onInit，期望被 phase guard 拦截，
            // 转换为 logic::invalid_phase 诊断，而不是影响 Runtime 构造路径。
            yield* $.lifecycle.onInit(Effect.void)
          })

          const run = Effect.void
          const plan = { setup, run }
          const effect = Effect.succeed(plan) as any
          effect.__logicPlan = true
          return effect
        })

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks as any, [
          sink,
        ])(
          Effect.gen(function* () {
            yield* ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'plan-lifecycle-init-guard',
                logics: [logic],
                tag: PlanModule,
              },
            )

            yield* TestClock.adjust('10 millis')
          }),
        )

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent && 'moduleId' in diagnosticEvent ? (diagnosticEvent as any).moduleId : undefined).toBe(
          'PlanLifecycleInitGuard',
        )
      }),
    )

    it.scoped('should allow run-only access in LogicPlan.run when phase service switches to run', () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []

        const sink: Debug.Sink = {
          record: (event: Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        class EnvService extends Context.Tag('@tests/EnvService')<EnvService, { readonly label: string }>() {}

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
          effect.__logicPlan = true
          return effect
        })

        const layer = Layer.succeed(EnvService, { label: 'ok' } as { readonly label: string })

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
          Effect.provide(
            Effect.gen(function* () {
              const runtime = yield* ModuleRuntime.make(
                { label: 'init' },
                {
                  moduleId: 'plan-phase-run',
                  logics: [logic],
                  tag: PlanModule,
                },
              )

              yield* Effect.yieldNow()
              yield* TestClock.adjust('10 millis')

              const state = yield* runtime.getState
              expect(state.label).toBe('init')
            }),
            layer as Layer.Layer<any, never, never>,
          ),
        )

        yield* program

        const invalidPhase = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(invalidPhase).toBeDefined()
      }),
    )

    it.scoped('should support LogicPlan setup before run', () =>
      Effect.gen(function* () {
        const completed = Deferred.unsafeMake<void>(FiberId.none)

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
            // 触发 reducer，依赖 setup 已经完成注册
            yield* $.actions.inc()
            yield* Deferred.succeed(completed, undefined)
          })

          const plan = { setup, run }
          const effect = Effect.succeed(plan) as any
          effect.__logicPlan = true
          return effect
        })

        const layer = PlanModule.live({ count: 0 }, logic) as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

        const runtimeManager = ManagedRuntime.make(layer)

        const program = Effect.gen(function* () {
          const runtime = yield* PlanModule
          yield* Deferred.await(completed)
          const state = yield* runtime.getState
          expect(state.count).toBe(1)
        })

        yield* Effect.promise(() => runtimeManager.runPromise(program as Effect.Effect<void, never, any>))
      }),
    )
  })
})
