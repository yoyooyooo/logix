import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Chunk, Context, Effect, Fiber, Layer, Queue, PubSub, Schema, Stream, SubscriptionRef, Deferred } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import type { RuntimeInternals } from '../../../src/internal/runtime/core/RuntimeInternals.js'
import { setRuntimeInternals } from '../../../src/internal/runtime/core/runtimeInternalsAccessor.js'

const CounterState = Schema.Struct({
  count: Schema.Number,
  value: Schema.String,
})

const CounterActions = {
  inc: Schema.Void,
  setValue: Schema.String,
}

const CounterModule = Logix.Module.make('BoundCounter', {
  state: CounterState,
  actions: CounterActions,
})

// Standard pattern for collecting an action stream: subscribe first, then wait for a fixed number of actions (avoid guessing timing with sleep).
const setupActionCollector = <A>(hub: PubSub.PubSub<A>, count: number) =>
  Effect.gen(function* () {
    const ready = yield* Deferred.make<void>()
    const fiber = yield* Effect.forkScoped(
      Effect.gen(function* () {
        const subscription = yield* PubSub.subscribe(hub)
        yield* Deferred.succeed(ready, undefined)
        return yield* Effect.all(
          Array.from({ length: count }, () => Queue.take(subscription)),
          { concurrency: 'unbounded' },
        )
      }),
    )

    yield* Deferred.await(ready)
    return fiber
  })

describe('Bound API (public)', () => {
  it('should handle onAction filter/map/update/mutate', async () => {
    const CounterLogic = CounterModule.logic(($) =>
      Effect.gen(function* () {
        yield* Effect.all(
          [
            $.onAction('inc').update((state) => ({
              ...state,
              count: state.count + 1,
            })),
            $.onAction('setValue')
              .map((a) => a.payload.toUpperCase())
              .update((state, upper) => ({
                ...state,
                value: upper,
              })),
            $.onAction((a): a is Logix.ActionOf<typeof CounterModule.shape> => a._tag === 'inc').mutate((draft) => {
              draft.count += 4
            }),
          ],
          { concurrency: 'unbounded' },
        )
      }),
    )

    const impl = CounterModule.implement({
      initial: { count: 0, value: 'init' },
      logics: [CounterLogic],
    })

    const runtime = Logix.Runtime.make(impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const program = Effect.gen(function* () {
      const rt = yield* CounterModule.tag

      // Wait for logic subscriptions to be installed.
      yield* Effect.sleep('10 millis')

      // inc：update( +1 ) + mutate( +4 ) = +5
      yield* rt.dispatch({ _tag: 'inc', payload: undefined })
      yield* Effect.sleep('10 millis')
      let state = yield* rt.getState
      expect(state.count).toBe(5)

      // setValue: tag-based onAction + map + update
      yield* rt.dispatch({ _tag: 'setValue', payload: 'hello' })
      yield* Effect.sleep('10 millis')
      state = yield* rt.getState
      expect(state.value).toBe('HELLO')
    })

    await runtime.runPromise(program as Effect.Effect<void, never, any>)
  })

  it('should support match and matchTag helpers', async () => {
    const results: Array<string> = []

    const logic = CounterModule.logic(($) =>
      Effect.gen(function* () {
        const v = yield* $.match(10)
          .with(
            (n) => n === 10,
            () => Effect.succeed('ten'),
          )
          .otherwise(() => Effect.succeed('other'))

        const tagged = { _tag: 'A' as const, value: 1 }
        const v2 = yield* $.matchTag(tagged)
          .with('A', (a) => Effect.succeed(`A:${a.value}`))
          .exhaustive()

        results.push(v, v2)
      }),
    )

    const impl = CounterModule.implement({
      initial: { count: 0, value: 'init' },
      logics: [logic],
    })

    const runtime = Logix.Runtime.make(impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const program = Effect.gen(function* () {
      // Entering the logic scope is enough to execute match/matchTag.
      yield* CounterModule.tag
    })

    await runtime.runPromise(program as Effect.Effect<void, never, any>)
    expect(results).toEqual(['ten', 'A:1'])
  })

  it('should expose state.read and state.ref for current module', async () => {
    const values: Array<number> = []

    const logic = CounterModule.logic(($) =>
      Effect.gen(function* () {
        const initial = yield* $.state.read
        values.push(initial.count)

        const ref = $.state.ref()
        const fromRef1 = yield* SubscriptionRef.get(ref)
        values.push(fromRef1.count)

        yield* $.state.update((s) => ({
          ...s,
          count: s.count + 1,
        }))

        const afterUpdate = yield* $.state.read
        const fromRef2 = yield* SubscriptionRef.get(ref)
        values.push(afterUpdate.count, fromRef2.count)
      }),
    )

    const impl = CounterModule.implement({
      initial: { count: 0, value: 'init' },
      logics: [logic],
    })

    const runtime = Logix.Runtime.make(impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    await runtime.runPromise(Effect.sleep('10 millis') as Effect.Effect<void, never, any>)

    expect(values).toEqual([0, 0, 1, 1])
  })

  it('should allow reacting to imported module state via $.use + ModuleHandle', async () => {
    const Source = Logix.Module.make('BoundSource', {
      state: Schema.Struct({ lastCount: Schema.Number }),
      actions: {},
    })

    const Target = Logix.Module.make('BoundTargetRemoteState', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const targetLogic = Target.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction('inc').update((s) => ({ ...s, count: s.count + 1 }))
      }),
    )

    const sourceLogic = Source.logic(($) =>
      Effect.gen(function* () {
        const $Target = yield* $.use(Target)
        yield* $.on($Target.changes((s) => s.count)).run((count) =>
          $.state.update((prev) => ({ ...prev, lastCount: count })),
        )
      }),
    )

    const targetImpl = Target.implement({
      initial: { count: 0 },
      logics: [targetLogic],
    })

    const sourceImpl = Source.implement({
      initial: { lastCount: 0 },
      logics: [sourceLogic],
      imports: [targetImpl.impl],
    })

    const runtime = Logix.Runtime.make(sourceImpl)

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          const sourceRuntime = yield* Source.tag
          const targetRuntime = yield* Target.tag

          // Wait for logic subscriptions to be installed.
          yield* Effect.sleep('50 millis')

          expect(yield* sourceRuntime.getState).toEqual({ lastCount: 0 })
          expect(yield* targetRuntime.getState).toEqual({ count: 0 })

          // Trigger Target.inc
          yield* targetRuntime.dispatch({ _tag: 'inc', payload: undefined })

          // Wait for cross-module propagation.
          yield* Effect.sleep('150 millis')

          expect(yield* targetRuntime.getState).toEqual({ count: 1 })
          expect(yield* sourceRuntime.getState).toEqual({ lastCount: 1 })
        }) as Effect.Effect<void, never, any>,
      )
    } finally {
      await runtime.dispose()
    }
  })

  it('should allow reacting to imported module actions via $.use + ModuleHandle', async () => {
    const Logger = Logix.Module.make('BoundLogger', {
      state: Schema.Struct({ logs: Schema.Array(Schema.String) }),
      actions: {},
    })

    const Counter = Logix.Module.make('BoundRemoteCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const counterLogic = Counter.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction('inc').update((s) => ({ ...s, count: s.count + 1 }))
      }),
    )

    const loggerLogic = Logger.logic(($) =>
      Effect.gen(function* () {
        const $Counter = yield* $.use(Counter)

        yield* $.on($Counter.actions$)
          .filter((a: any) => a._tag === 'inc')
          .run(() =>
            $.state.update((s) => ({
              ...s,
              logs: [...s.logs, 'counter/inc'],
            })),
          )
      }),
    )

    const counterImpl = Counter.implement({
      initial: { count: 0 },
      logics: [counterLogic],
    })

    const loggerImpl = Logger.implement({
      initial: { logs: [] },
      logics: [loggerLogic],
      imports: [counterImpl.impl],
    })

    const runtime = Logix.Runtime.make(loggerImpl)

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          const loggerRuntime = yield* Logger.tag
          const counterRuntime = yield* Counter.tag

          // Wait for logic subscriptions to be installed.
          yield* Effect.sleep('50 millis')

          expect(yield* loggerRuntime.getState).toEqual({ logs: [] })
          expect(yield* counterRuntime.getState).toEqual({ count: 0 })

          // Trigger Counter.inc
          yield* counterRuntime.dispatch({ _tag: 'inc', payload: undefined })

          // Wait for cross-module propagation.
          yield* Effect.sleep('150 millis')

          expect(yield* counterRuntime.getState).toEqual({ count: 1 })
          expect(yield* loggerRuntime.getState).toEqual({
            logs: ['counter/inc'],
          })
        }) as Effect.Effect<void, never, any>,
      )
    } finally {
      await runtime.dispose()
    }
  })

  it('should allow one module to listen to another via $.use + ModuleHandle', async () => {
    const SourceModule = Logix.Module.make('BoundSourceUse', {
      state: Schema.Struct({
        value: Schema.Number,
      }),
      actions: {
        update: Schema.Number,
      },
    })

    const SourceLogic = SourceModule.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction((a): a is { _tag: 'update'; payload: number } => a._tag === 'update').update(
          (s, { payload }) => ({ ...s, value: payload }),
        )
      }),
    )

    const ConsumerModule = Logix.Module.make('BoundConsumerUse', {
      state: Schema.Struct({
        received: Schema.Number,
      }),
      actions: {},
    })

    const ConsumerLogic = ConsumerModule.logic(($) =>
      Effect.gen(function* () {
        const $Source = yield* $.use(SourceModule)

        yield* $.on($Source.changes((s) => s.value)).update((s, value) => ({
          ...s,
          received: value,
        }))
      }),
    )

    const program = Effect.gen(function* () {
      const source = yield* SourceModule.tag
      const consumer = yield* ConsumerModule.tag

      expect((yield* consumer.getState).received).toBe(0)

      // Wait for the logic to start.
      yield* Effect.sleep('50 millis')

      yield* source.dispatch({ _tag: 'update', payload: 42 })

      // Wait for cross-module propagation.
      yield* Effect.sleep('100 millis')

      expect((yield* source.getState).value).toBe(42)
      expect((yield* consumer.getState).received).toBe(42)
    })

    const sourceImpl = SourceModule.implement({
      initial: { value: 0 },
      logics: [SourceLogic],
    })

    const consumerImpl = ConsumerModule.implement({
      initial: { received: 0 },
      logics: [ConsumerLogic],
      imports: [sourceImpl.impl],
    })

    const runtime = Logix.Runtime.make(consumerImpl)

    try {
      await runtime.runPromise(program as Effect.Effect<void, never, any>)
    } finally {
      await runtime.dispose()
    }
  })

  it('should construct services() and advanced onAction builders', () => {
    const ServiceTag = Context.GenericTag<{ readonly label: string }>('@logixjs/test/BoundService')

    const AdvancedModule = Logix.Module.make('BoundAdvanced', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: {
        inc: Schema.Void,
        dec: Schema.Void,
      },
    })

    const IncSchema = Schema.Struct({
      _tag: Schema.Literal('inc'),
      payload: Schema.Void,
    })

    // Use a placeholder runtime: only validate the API shape produced by BoundApiRuntime, without actually running Effects.
    const dummyRuntime = {
      moduleId: 'BoundAdvanced',
      instanceId: 'dummy',
      id: 'dummy',
      getState: Effect.succeed({ count: 0 }),
      setState: () => Effect.void,
      dispatch: () => Effect.void,
      dispatchBatch: () => Effect.void,
      dispatchLowPriority: () => Effect.void,
      actions$: Stream.empty,
      actionsWithMeta$: Stream.empty,
      // Placeholder for typing/shape only; it is never called in this test.
      changes: () => Stream.empty,
      changesWithMeta: () => Stream.empty,
      changesReadQueryWithMeta: () => Stream.empty as any,
      ref: (): SubscriptionRef.SubscriptionRef<any> => ({}) as unknown as SubscriptionRef.SubscriptionRef<any>,
    } as Logix.ModuleRuntime<{ count: number }, any>

    const internals: RuntimeInternals = {
      moduleId: 'BoundAdvanced',
      instanceId: 'dummy',
      lifecycle: {
        registerInitRequired: () => {},
        registerStart: () => {},
        registerDestroy: () => {},
        registerOnError: () => {},
        registerPlatformSuspend: () => {},
        registerPlatformResume: () => {},
        registerPlatformReset: () => {},
      },
      imports: { kind: 'imports-scope', get: () => undefined },
      txn: {
        instrumentation: 'light',
        registerReducer: () => {},
        runWithStateTransaction: (_origin, body) => body(),
        updateDraft: () => {},
        recordStatePatch: () => {},
        recordReplayEvent: () => {},
        applyTransactionSnapshot: () => Effect.void,
      },
      concurrency: {
        resolveConcurrencyPolicy: () =>
          Effect.succeed({
            concurrencyLimit: 16,
            losslessBackpressureCapacity: 0,
            allowUnbounded: false,
            pressureWarningThreshold: { backlogCount: 0, backlogDurationMs: 0 },
            warningCooldownMs: 0,
            configScope: 'builtin',
            concurrencyLimitScope: 'builtin',
            requestedConcurrencyLimit: 16,
            requestedConcurrencyLimitScope: 'builtin',
            allowUnboundedScope: 'builtin',
          }),
      },
      txnLanes: {
        resolveTxnLanePolicy: () =>
          Effect.succeed({
            enabled: false,
            configScope: 'builtin',
            budgetMs: 8,
            debounceMs: 16,
            maxLagMs: 200,
            allowCoalesce: true,
            yieldStrategy: 'baseline',
            queueMode: 'fifo',
          }),
      },
      traits: {
        rowIdStore: {},
        getListConfigs: () => [],
        registerSourceRefresh: () => {},
        getSourceRefreshHandler: () => undefined,
        registerStateTraitProgram: () => {},
        enqueueStateTraitValidateRequest: () => {},
        registerModuleTraitsContribution: () => {},
        freezeModuleTraits: () => {},
        getModuleTraitsContributions: () => [],
        getModuleTraitsSnapshot: () => undefined,
        setModuleTraitsSnapshot: () => {},
      },
      effects: {
        registerEffect: () => Effect.succeed({ sourceKey: 'unknown::h1', duplicate: false }),
      },
      devtools: {
        registerConvergeStaticIr: () => {},
      },
    }
    setRuntimeInternals(dummyRuntime as any, internals)

    const $ = Logix.Bound.make(AdvancedModule.shape, dummyRuntime)

    const svcEffect = $.use(ServiceTag)
    expect(svcEffect).toBe(ServiceTag)

    const builderProp = $.onAction.inc
    const builderValue = $.onAction({
      _tag: 'dec',
      payload: undefined,
    } as any)
    const builderSchema = $.onAction(IncSchema)

    expect(typeof (builderProp as any).run).toBe('function')
    expect(typeof (builderValue as any).run).toBe('function')
    expect(typeof (builderSchema as any).run).toBe('function')
  })

  it('should dispatch actions via $.dispatchers', async () => {
    // Background: sleeping to wait for subscriptions can hide ordering issues; use an explicit subscription + counter to make the chain deterministic.
    const ActionsModule = Logix.Module.make('BoundActions', {
      state: Schema.Struct({
        logs: Schema.Array(Schema.String),
      }),
      actions: {
        foo: Schema.Void,
        bar: Schema.Void,
      },
    })

    const program = Effect.scoped(
      Effect.gen(function* () {
        type ActionsState = Logix.StateOf<typeof ActionsModule.shape>
        const actionHub = yield* PubSub.unbounded<Logix.ActionOf<typeof ActionsModule.shape>>()

        const moduleRuntime = yield* ModuleRuntimeImpl.make<ActionsState, Logix.ActionOf<typeof ActionsModule.shape>>(
          {
            logs: [] as ReadonlyArray<string>,
          } as ActionsState,
          {
            createActionHub: Effect.succeed(actionHub),
          },
        )

        const collectorFiber = yield* setupActionCollector(actionHub, 2)
        const $ = Logix.Bound.make(ActionsModule.shape, moduleRuntime)

        yield* $.dispatchers.foo()
        yield* $.dispatchers.bar()

        const actions = yield* Fiber.join(collectorFiber)
        const tags = actions.map((a: any) => a._tag).sort()

        expect(tags).toEqual(['bar', 'foo'])
      }),
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)
  })

  it('should provide ModuleHandle via $.use and reuse registered runtime', async () => {
    const SimpleModule = Logix.Module.make('BoundUseModule', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const program = Effect.scoped(
      Effect.gen(function* () {
        const runtime = yield* ModuleRuntimeImpl.make(
          { count: 0 },
          {
            tag: SimpleModule.tag,
            reducers: {
              inc: (state) => ({ ...state, count: state.count + 1 }),
            },
          },
        )

        const $ = Logix.Bound.make(SimpleModule.shape, runtime)
        const handle = yield* Effect.provideService($.use(SimpleModule), SimpleModule.tag, runtime)

        expect(yield* handle.read((s) => s.count)).toBe(0)
        expect(handle.actions$).toBe(runtime.actions$)

        // Trigger reducers via handle.actions to ensure the registered runtime is reused.
        yield* handle.actions.inc(undefined as any)
        expect(yield* runtime.getState).toEqual({ count: 1 })
      }),
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)
  })
})
