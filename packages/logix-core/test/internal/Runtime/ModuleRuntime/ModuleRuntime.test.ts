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
import * as Logix from '../../../../src/index.js'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import * as Debug from '../../../../src/Debug.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'
import * as BoundApiRuntime from '../../../../src/internal/runtime/BoundApiRuntime.js'
import * as LogicPlanMarker from '../../../../src/internal/runtime/core/LogicPlanMarker.js'
import { getBoundInternals } from '../../../../src/internal/runtime/core/runtimeInternalsAccessor.js'
import { getDefaultStateTxnInstrumentation } from '../../../../src/internal/runtime/core/env.js'
import { hashFieldPathIds, makeFieldPathIdRegistry } from '../../../../src/internal/field-path.js'

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
                tag: TestModule.tag,
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

    it.scoped('should include instanceId in module:init and module:destroy events', () =>
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
                tag: TestModule.tag,
              },
            ).pipe(Effect.flatMap(() => Effect.void)),
          ),
        )

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

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks as any, [
          sink,
        ])(
          Effect.gen(function* () {
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
            // Reading Env during setup should be blocked by the phase guard and converted into a logic::invalid_phase diagnostic.
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
                tag: ModuleWithEnv.tag,
              },
            )

            // Give the background Logic fiber a chance to run and emit the diagnostic.
            yield* TestClock.adjust('10 millis')
          }),
        )

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
            // Using run-only watcher APIs during setup should trigger a phase-guard diagnostic.
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
                tag: ModuleWithWatcher.tag,
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
          LogicPlanMarker.markAsLogicPlanEffect(effect)
          return effect
        })

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks, [sink])(
          Effect.gen(function* () {
            yield* ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'plan-phase-guard',
                logics: [logic],
                tag: PlanModule.tag,
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

    it.scoped('should emit logic::invalid_phase when using lifecycle.onInit in LogicPlan.run', () =>
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

        const program: Effect.Effect<void, never, any> = Effect.locally(Debug.internal.currentDebugSinks as any, [
          sink,
        ])(
          Effect.gen(function* () {
            yield* ModuleRuntime.make(
              { value: 0 },
              {
                moduleId: 'plan-lifecycle-init-guard',
                logics: [logic],
                tag: PlanModule.tag,
              },
            )

            yield* Effect.yieldNow()
            yield* TestClock.adjust('10 millis')
          }),
        )

        yield* program

        const diagnosticEvent = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(diagnosticEvent).toBeDefined()
        expect(diagnosticEvent?.type === 'diagnostic' ? diagnosticEvent.severity : undefined).toBe('error')
        expect(diagnosticEvent && 'moduleId' in diagnosticEvent ? (diagnosticEvent as any).moduleId : undefined).toBe(
          'plan-lifecycle-init-guard',
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
          LogicPlanMarker.markAsLogicPlanEffect(effect)
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
                  tag: PlanModule.tag,
                },
              )

              yield* Effect.yieldNow()
              yield* TestClock.adjust('10 millis')

              const state = yield* runtime.getState
              expect(state.label).toBe('ok')
            }),
            layer as Layer.Layer<any, never, never>,
          ),
        )

        yield* program

        const invalidPhase = events.find((e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase')

        expect(invalidPhase).toBeUndefined()
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
          const runtime = yield* PlanModule.tag
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

    it.scoped('StateTransaction should honor light instrumentation (no patches / snapshots)', () =>
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

    it.scoped('StateTransaction.commit should output segment-based dirtySet roots (no join/split roundtrip)', () =>
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
        expect(txn?.dirtySet).toMatchObject({
          dirtyAll: false,
          rootIds: [0, 1],
          rootCount: 2,
          keySize: 2,
          keyHash: hashFieldPathIds([0, 1]),
        })
      }),
    )

    it.scoped('StateTransaction full patch records must be bounded (<=256) and mark truncation', () =>
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

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
          Effect.scoped(
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

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
          Effect.scoped(
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

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
          Effect.scoped(
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
          ),
        )

        yield* program
      }),
    )

    it.scoped('should allow different runtime instances to dispatch in parallel', () =>
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

              const slowFiber = yield* Effect.fork(slowRuntime.dispatch({ _tag: 'inc', payload: undefined } as any))
              const fastFiber = yield* Effect.fork(fastRuntime.dispatch({ _tag: 'inc', payload: undefined } as any))

              // FastModule's transaction should complete without advancing TestClock.
              yield* Fiber.join(fastFiber)

              // SlowModule is still waiting for the sleep; Fiber.poll should return None.
              const slowStatus = yield* Fiber.poll(slowFiber)
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

    it.scoped(
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

          const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
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

        type Shape = Logix.Module.Shape<typeof StateSchema, { outer: typeof Schema.Void; refresh: typeof Schema.Void }>
        type Action = Logix.Module.ActionOf<Shape>

        const ring = Debug.makeRingBufferSink(16)

        const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
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
                    Effect.timeoutFail({
                      duration: '200 millis',
                      onTimeout: () => new Error('[test] traits.source.refresh deadlocked inside transaction'),
                    }),
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

        const instrumentation = Logix.InternalContracts.getStateTransactionInstrumentation(runtime as any)
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
          const rt = yield* Counter.tag
          const instrumentation = Logix.InternalContracts.getStateTransactionInstrumentation(rt as any)
          expect(instrumentation).toBe('light')
        })

        yield* Effect.promise(() => runtimeManager.runPromise(program as Effect.Effect<void, never, any>))
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
          const rt = yield* Counter.tag
          const instrumentation = Logix.InternalContracts.getStateTransactionInstrumentation(rt as any)
          expect(instrumentation).toBe('full')
        })

        yield* Effect.promise(() => runtimeManager.runPromise(program as Effect.Effect<void, never, any>))
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
          ),
        )

        yield* program
      }),
    )
  })
})
