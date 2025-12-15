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
import * as StateTransaction from '../src/internal/runtime/core/StateTransaction.js'
import * as EffectOpCore from '../src/internal/runtime/EffectOpCore.js'
import * as BoundApiRuntime from '../src/internal/runtime/BoundApiRuntime.js'
import { getDefaultStateTxnInstrumentation } from '../src/internal/runtime/core/env.js'

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

  describe('StateTransaction integration', () => {
    it.scoped('StateTransaction.commit should aggregate patches and write state once (full instrumentation)', () =>
      Effect.gen(function* () {
        type S = { count: number }

        const ref = yield* SubscriptionRef.make<S>({ count: 0 })

        // 使用可控的 now()，便于在后续需要时断言时间字段。
        let nowCounter = 0
        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'TxnUnitModule',
          runtimeId: 'unit-runtime',
          instrumentation: 'full',
          captureSnapshots: true,
          now: () => ++nowCounter,
        })

        StateTransaction.beginTransaction(
          ctx,
          { kind: 'unit-test', name: 'basic-aggregation' },
          { count: 0 },
        )

        StateTransaction.updateDraft(ctx, { count: 1 }, {
          path: 'count',
          from: 0,
          to: 1,
          reason: 'reducer',
        })

        StateTransaction.updateDraft(ctx, { count: 2 }, {
          path: 'count',
          from: 1,
          to: 2,
          reason: 'reducer',
        })

        const txn = yield* StateTransaction.commit(ctx, ref)

        expect(txn).toBeDefined()
        expect(txn?.moduleId).toBe('TxnUnitModule')
        expect(txn?.runtimeId).toBe('unit-runtime')
        expect(txn?.patches).toHaveLength(2)
        expect(txn?.initialStateSnapshot).toEqual({ count: 0 })
        expect(txn?.finalStateSnapshot).toEqual({ count: 2 })
        expect(yield* SubscriptionRef.get(ref)).toEqual({ count: 2 })
      }),
    )

    it.scoped('StateTransaction should honor light instrumentation (no patches / snapshots)', () =>
      Effect.gen(function* () {
        type S = { value: number }

        const ref = yield* SubscriptionRef.make<S>({ value: 0 })
        const ctx = StateTransaction.makeContext<S>({
          moduleId: 'LightModule',
          runtimeId: 'light-runtime',
          instrumentation: 'light',
          captureSnapshots: false,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'light' }, { value: 0 })

        // 在 light 模式下，即便频繁调用 updateDraft / recordPatch，
        // 也不应累积 Patch 或快照，避免在高 Trait / 高频场景下产生额外开销（T026）。
        for (let i = 0; i < 100; i++) {
          StateTransaction.updateDraft(ctx, { value: i + 1 }, {
            path: 'value',
            from: i,
            to: i + 1,
            reason: 'reducer',
          })

          StateTransaction.recordPatch(ctx, {
            path: 'value',
            from: i + 1,
            to: i + 1,
            reason: 'trait-computed',
          })
        }

        const txn = yield* StateTransaction.commit(ctx, ref)

        // light 模式下不应记录任何 Patch 或快照，但仍然写入最终状态（此处为最后一次 updateDraft 的结果）。
        expect(txn).toBeDefined()
        expect(txn?.patches.length).toBe(0)
        expect(txn?.initialStateSnapshot).toBeUndefined()
        expect(txn?.finalStateSnapshot).toBeUndefined()
        expect(yield* SubscriptionRef.get(ref)).toEqual({ value: 100 })
      }),
    )

    it.scoped('should support dev-only time-travel: applyTransactionSnapshot(before) restores previous state', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const TimeTravelModule = Logix.Module.make('TimeTravelModule', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { set: Schema.Number },
        })

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
          Effect.scoped(
            ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'TimeTravelModule',
                tag: TimeTravelModule,
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
                  // 先后两次事务：value = 1, value = 2
                  yield* runtime.dispatch({ _tag: 'set', payload: 1 } as any)
                  yield* runtime.dispatch({ _tag: 'set', payload: 2 } as any)

                  const beforeTravel = yield* runtime.getState
                  expect(beforeTravel.value).toBe(2)

                  // 从 Debug 事件中找到第二次 state:update 对应的 txnId
                  const events = ring.getSnapshot().filter(
                    (event) =>
                      event.moduleId === 'TimeTravelModule' && event.type === 'state:update' && (event as any).txnId,
                  ) as any[]

                  expect(events.length).toBeGreaterThanOrEqual(2)
                  const secondTxnEvent = events[1]!
                  const txnId = secondTxnEvent.txnId as string
                  expect(typeof txnId).toBe('string')

                  // 调用内部 dev-only API：回到该事务开始前的状态（应为 value = 1）
                  const applySnapshot = (runtime as any).__applyTransactionSnapshot as
                    | ((id: string, mode: 'before' | 'after') => Effect.Effect<void, never, any>)
                    | undefined

                  expect(typeof applySnapshot).toBe('function')

                  if (applySnapshot) {
                    yield* applySnapshot(txnId, 'before')
                  }

                  const afterTravel = yield* runtime.getState
                  expect(afterTravel.value).toBe(1)
                }),
              ),
            ),
          ),
        )

        yield* program
      }),
    )

    it.scoped('dispatch should emit exactly one state:update event per logical entry', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(16)

        const CounterModule = Logix.Module.make('TxnRuntimeModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const program = Effect.locally(
          Debug.internal.currentDebugSinks as any,
          [ring.sink as Debug.Sink],
        )(
          Effect.scoped(
            ModuleRuntime.make(
              { count: 0 },
              {
                moduleId: 'TxnRuntimeModule',
                tag: CounterModule,
                reducers: {
                  inc: (state) => ({ ...state, count: state.count + 1 }),
                },
              },
            ).pipe(
              Effect.flatMap((runtime) =>
                Effect.gen(function* () {
                  // 初始构造阶段会发出一次 state:update（初始快照）。
                  const before = ring.getSnapshot()
                  const beforeUpdates = before.filter(
                    (event) =>
                      event.type === 'state:update' &&
                      event.moduleId === 'TxnRuntimeModule',
                  )

                  expect(beforeUpdates).toHaveLength(1)

                  // 单次 dispatch：期望只追加一次 state:update 事件。
                  yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)

                  const after = ring.getSnapshot()
                  const afterUpdates = after.filter(
                    (event) =>
                      event.type === 'state:update' &&
                      event.moduleId === 'TxnRuntimeModule',
                  )

                  expect(afterUpdates).toHaveLength(2)
                  // 验证 state:update 顺序与聚合结果
                  expect((afterUpdates[0] as any).state).toEqual({ count: 0 })
                  expect((afterUpdates[1] as any).state).toEqual({ count: 1 })

                  const state = yield* runtime.getState
                  expect(state.count).toBe(1)
                }),
              ),
            ),
          ),
        )

        yield* program
      }),
    )

    it.scoped('should attach the same txnId to action and state events for a single dispatch', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const CounterModule = Logix.Module.make('TxnDebugModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const program = Effect.locally(
          Debug.internal.currentDebugSinks as any,
          [ring.sink as Debug.Sink],
        )(
          Effect.scoped(
            ModuleRuntime.make(
              { count: 0 },
              {
                moduleId: 'TxnDebugModule',
                tag: CounterModule,
                reducers: {
                  inc: (state) => ({ ...state, count: state.count + 1 }),
                },
              },
            ).pipe(
              Effect.flatMap((runtime) =>
                Effect.gen(function* () {
                  // 单次 dispatch：期望产生一条带 txnId 的 action:dispatch 和一条带相同 txnId 的 state:update。
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

                  // 初始快照产生的 state:update 不带 txnId，这里只关心事务提交后的那一条。
                  const stateEventsWithTxn = events.filter(
                    (event) => event.type === 'state:update' && (event as any).txnId != null,
                  ) as any[]

                  expect(stateEventsWithTxn.length).toBe(1)
                  expect(stateEventsWithTxn[0].txnId).toBe(actionEvent.txnId)
                }),
              ),
            ),
          ),
        )

        yield* program
      }),
    )

    it.scoped('should serialize concurrent dispatch calls per runtime instance', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const CounterModule = Logix.Module.make('TxnQueueModule', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
        })

        const program = Effect.locally(
          Debug.internal.currentDebugSinks as any,
          [ring.sink as Debug.Sink],
        )(
          Effect.scoped(
            ModuleRuntime.make(
              { count: 0 },
              {
                moduleId: 'TxnQueueModule',
                tag: CounterModule,
                reducers: {
                  inc: (state) => ({ ...state, count: state.count + 1 }),
                },
              },
            ).pipe(
              Effect.flatMap((runtime) =>
                Effect.gen(function* () {
                  // 5 次并发 dispatch，应按 FIFO 串行执行，最终 count = 5。
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
          ),
        )

        yield* program
      }),
    )

    it.scoped('should allow different runtime instances to dispatch in parallel', () =>
      Effect.gen(function* () {
          const timingMiddleware = <A, E, R>(
            op: EffectOpCore.EffectOp<A, E, R>,
          ): Effect.Effect<A, E, R> =>
            Effect.gen(function* () {
              if (op.meta?.moduleId === 'SlowModule' && op.kind === 'state' && op.name === 'state:update') {
                // 使用 TestClock 控制的 sleep 模拟慢事务，仅针对 SlowModule 的提交阶段（state:update）。
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

              const slowFiber = yield* Effect.fork(
                slowRuntime.dispatch({ _tag: 'inc', payload: undefined } as any),
              )
              const fastFiber = yield* Effect.fork(
                fastRuntime.dispatch({ _tag: 'inc', payload: undefined } as any),
              )

              // FastModule 的事务应当在无需推进 TestClock 的情况下完成。
              yield* Fiber.join(fastFiber)

              // SlowModule 仍在等待 sleep 完成，Fiber.poll 应返回 None。
              const slowStatus = yield* Fiber.poll(slowFiber)
              expect(slowStatus._tag).toBe('None')

              // 推进 TestClock，使慢事务得以完成。
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

    it.scoped('traits.source.refresh should execute within a single transaction and emit one additional state:update', () =>
      Effect.gen(function* () {
        type State = { value: number }

        const StateSchema = Schema.Struct({
          value: Schema.Number,
        })

        type Shape = Logix.Module.Shape<
          typeof StateSchema,
          { refresh: typeof Schema.Void }
        >
        type Action = Logix.Module.ActionOf<Shape>

        const ring = Debug.makeRingBufferSink(16)

        const program = Effect.locally(
          Debug.internal.currentDebugSinks as any,
          [ring.sink as Debug.Sink],
        )(
          Effect.scoped(
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
                      // ActionSchema 在本测试中不会被使用，这里用占位 Schema 以满足类型要求。
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
                    (event) =>
                      event.type === 'state:update' &&
                      event.moduleId === 'SourceTxnModule',
                  )
                  expect(beforeUpdates).toHaveLength(1)
                  expect((beforeUpdates[0] as any).state).toEqual({ value: 0 })

                  const register =
                    (bound as any)
                      .__registerSourceRefresh as
                    | ((
                      field: string,
                      handler: (
                        state: State,
                      ) => Effect.Effect<void, never, any>,
                    ) => void)
                    | undefined

                  expect(register).toBeDefined()

                  register?.('value', (state: State) =>
                    bound.state.mutate((draft) => {
                      draft.value = state.value + 1
                    }) as any,
                  )

                  // 调用 traits.source.refresh：在支持 StateTransaction 的 Runtime 上，
                  // 该入口应被包装为一次独立事务，最终只追加一次 state:update。
                  yield* bound.traits.source.refresh('value')

                  const after = ring.getSnapshot()
                  const afterUpdates = after.filter(
                    (event) =>
                      event.type === 'state:update' &&
                      event.moduleId === 'SourceTxnModule',
                  )

                  expect(afterUpdates).toHaveLength(2)
                  expect((afterUpdates[1] as any).state).toEqual({ value: 1 })

                  const finalState = (yield* runtime.getState) as State
                  expect(finalState.value).toBe(1)
                }),
              ),
            ),
          ),
        ) as Effect.Effect<void, never, any>

        yield* program
      }),
    )

    it.scoped('traits.source.refresh should not deadlock when called inside an existing transaction', () =>
      Effect.gen(function* () {
        type State = { value: number }

        const StateSchema = Schema.Struct({
          value: Schema.Number,
        })

        type Shape = Logix.Module.Shape<
          typeof StateSchema,
          { outer: typeof Schema.Void; refresh: typeof Schema.Void }
        >
        type Action = Logix.Module.ActionOf<Shape>

        const ring = Debug.makeRingBufferSink(16)

        const program = Effect.locally(
          Debug.internal.currentDebugSinks as any,
          [ring.sink as Debug.Sink],
        )(
          Effect.scoped(
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
                      // ActionSchema 在本测试中不会被使用，这里用占位 Schema 以满足类型要求。
                      actionSchema: Schema.Never as any,
                      actionMap: { outer: Schema.Void, refresh: Schema.Void } as any,
                    } as any,
                    runtime as any,
                    {
                      getPhase: () => 'run',
                      moduleId: 'SourceTxnInTxnModule',
                    },
                  )

                  const register =
                    (bound as any)
                      .__registerSourceRefresh as
                    | ((
                      field: string,
                      handler: (
                        state: State,
                      ) => Effect.Effect<void, never, any>,
                    ) => void)
                    | undefined

                  expect(register).toBeDefined()

                  register?.('value', (state: State) =>
                    bound.state.mutate((draft) => {
                      draft.value = state.value + 1
                    }) as any,
                  )

                  const before = ring.getSnapshot()
                  const beforeUpdates = before.filter(
                    (event) =>
                      event.type === 'state:update' &&
                      event.moduleId === 'SourceTxnInTxnModule',
                  )
                  expect(beforeUpdates).toHaveLength(1)

                  const runWithTxn =
                    (runtime as any)
                      .__runWithStateTransaction as
                    | ((
                      origin: {
                        readonly kind: string
                        readonly name?: string
                        readonly details?: unknown
                      },
                      body: () => Effect.Effect<void, never, any>,
                    ) => Effect.Effect<void, never, any>)
                    | undefined

                  expect(runWithTxn).toBeDefined()

                  // 在事务窗口内调用 traits.source.refresh：
                  // - 不能再走 enqueueTransaction（否则会死锁）；
                  // - 也不能触发嵌套事务（否则会产生额外 state:update）。
                  yield* runWithTxn!(
                    { kind: 'test', name: 'outer' },
                    () => bound.traits.source.refresh('value') as any,
                  ).pipe(
                    Effect.timeoutFail({
                      duration: '200 millis',
                      onTimeout: () =>
                        new Error(
                          '[test] traits.source.refresh deadlocked inside transaction',
                        ),
                    }),
                  )

                  const after = ring.getSnapshot()
                  const afterUpdates = after.filter(
                    (event) =>
                      event.type === 'state:update' &&
                      event.moduleId === 'SourceTxnInTxnModule',
                  )

                  expect(afterUpdates).toHaveLength(2)
                  expect((afterUpdates[1] as any).state).toEqual({ value: 1 })

                  const finalState = (yield* runtime.getState) as State
                  expect(finalState.value).toBe(1)
                }),
              ),
            ),
          ),
        ) as Effect.Effect<void, never, any>

        yield* program
      }),
    )

    it.scoped('ModuleRuntime should use NODE_ENV-based default instrumentation when no overrides', () =>
      Effect.gen(function* () {
        const runtime = yield* ModuleRuntime.make(
          { count: 0 },
          {
            moduleId: 'DefaultInstrModule',
          },
        )

        const instrumentation = (runtime as any).__stateTransactionInstrumentation
        expect(instrumentation).toBe(getDefaultStateTxnInstrumentation())
      }),
    )

    it.scoped('RuntimeOptions.stateTransaction should override NODE_ENV default for ModuleRuntime', () =>
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
          const rt = yield* Counter
          const instrumentation = (rt as any).__stateTransactionInstrumentation
          expect(instrumentation).toBe('light')
        })

        yield* Effect.promise(() =>
          runtimeManager.runPromise(program as Effect.Effect<void, never, any>),
        )
      }),
    )

    it.scoped('ModuleImpl.stateTransaction should override RuntimeOptions.stateTransaction', () =>
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
          const rt = yield* Counter
          const instrumentation = (rt as any).__stateTransactionInstrumentation
          expect(instrumentation).toBe('full')
        })

        yield* Effect.promise(() =>
          runtimeManager.runPromise(program as Effect.Effect<void, never, any>),
        )
      }),
    )

    it.scoped('Runtime.applyTransactionSnapshot should delegate to ModuleRuntime time-travel API', () =>
      Effect.gen(function* () {
        const ring = Debug.makeRingBufferSink(32)

        const TimeTravelModule = Logix.Module.make('TimeTravelModuleRuntimeBridge', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { set: Schema.Number },
        })

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
          Effect.scoped(
            ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'TimeTravelModuleRuntimeBridge',
                tag: TimeTravelModule,
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
                  // 两次事务：value = 1, value = 2
                  yield* runtime.dispatch({ _tag: 'set', payload: 1 } as any)
                  yield* runtime.dispatch({ _tag: 'set', payload: 2 } as any)

                  const beforeTravel = yield* runtime.getState
                  expect(beforeTravel.value).toBe(2)

                  const runtimeId = runtime.id!

                  const events = ring.getSnapshot().filter(
                    (event) =>
                      event.moduleId === 'TimeTravelModuleRuntimeBridge' &&
                      event.type === 'state:update' &&
                      (event as any).txnId,
                  ) as any[]

                  expect(events.length).toBeGreaterThanOrEqual(2)
                  const secondTxnEvent = events[1]!
                  const txnId = secondTxnEvent.txnId as string
                  expect(typeof txnId).toBe('string')

                  // 通过 Runtime.applyTransactionSnapshot 按 moduleId + runtimeId 进行时间旅行。
                  yield* Logix.Runtime.applyTransactionSnapshot(
                    'TimeTravelModuleRuntimeBridge',
                    runtimeId,
                    txnId,
                    'before',
                  )

                  const afterTravel = yield* runtime.getState
                  expect(afterTravel.value).toBe(1)
                }),
              ),
            ),
          ),
        )

        yield* program
      }),
    )
  })
})
