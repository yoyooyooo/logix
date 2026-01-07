/**
 * @scenario ExternalStore + Tick（Route/State/Query-like chain）
 * @description
 *   用最少代码演示 “外部输入 → state.inputs → computed(queryKey) → 订阅观测” 的链路，
 *   并覆盖本次能力的四种 sugar：
 *   - `ExternalStore.fromService`（宿主注入，例如 router/session/flags）
 *   - `ExternalStore.fromSubscriptionRef`（同步纯读的 SubscriptionRef）
 *   - `ExternalStore.fromStream`（必须提供 initial/current）
 *   - `ExternalStore.fromModule`（Module-as-Source：IR 可识别的跨模块输入）
 *
 *   最后用 `tickSeq` 作为观测锚点展示 “一次 batch 内的多次外部信号 → 同一次 tick flush”。
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/external-store-tick.ts
 */
import { Context, Effect, Layer, Queue, Schema, Stream, SubscriptionRef } from 'effect'
import * as Logix from '@logix/core'

export class UsersRepo extends Effect.Service<UsersRepo>()('Accounts/UsersRepo', {
  effect: Effect.gen(function* () {
    return {} as const
  }),
  dependencies: [],
}) {}

type Listener = () => void

const makeSignalStore = <T>(initial: T) => {
  let current = initial
  const listeners = new Set<Listener>()

  const store: Logix.ExternalStore.ExternalStore<T> = {
    getSnapshot: () => current,
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  return {
    store,
    set: (next: T) => {
      current = next
      for (const l of listeners) l()
    },
  }
}

const LocationStore = makeSignalStore({ pathname: '/' })

type DemoHostService = {
  readonly location: Logix.ExternalStore.ExternalStore<{ readonly pathname: string }>
}

class DemoHostServiceTag extends Context.Tag('ExternalStoreTickDemoHost')<DemoHostServiceTag, DemoHostService>() {}

const DemoHostLive = Layer.succeed(DemoHostServiceTag, {
  location: LocationStore.store,
})

const main = Effect.scoped(
  Effect.gen(function* () {
    const userIdRef = yield* SubscriptionRef.make('u1')
    const flagQueue = yield* Queue.unbounded<string>()
    const flag$ = Stream.fromQueue(flagQueue)

    const LocationExternalStore = Logix.ExternalStore.fromService(DemoHostServiceTag, (svc) => svc.location)
    const UserIdExternalStore = Logix.ExternalStore.fromSubscriptionRef(userIdRef)
    const FeatureFlagExternalStore = Logix.ExternalStore.fromStream(flag$, { initial: 'flag:off' })

    const SourceState = Schema.Struct({ value: Schema.Number })

    const SourceDef = Logix.Module.make('ExternalStoreTickSource', {
      state: SourceState,
      actions: { setValue: Schema.Number },
      reducers: {
        setValue: Logix.Module.Reducer.mutate<{ value: number }, { payload: number }>((draft, payload) => {
          draft.value = payload
        }),
      },
    })

    const SourceModule = SourceDef.implement({
      initial: { value: 0 },
    })

    const SourceValueReadQuery = Logix.ReadQuery.make({
      selectorId: 'rq_external_store_tick_source_value',
      debugKey: 'ExternalStoreTickSource.value',
      reads: ['value'],
      select: (s: Schema.Schema.Type<typeof SourceState>) => s.value,
      equalsKind: 'objectIs',
    })

    const State = Schema.Struct({
      inputs: Schema.Struct({
        pathname: Schema.String,
        userId: Schema.String,
        featureFlag: Schema.String,
        sourceValue: Schema.Number,
      }),
      routeKey: Schema.String,
      queryKey: Schema.String,
    })

    const DemoDef = Logix.Module.make('ExternalStoreTickDemo', {
      state: State,
      actions: {},
      traits: Logix.StateTrait.from(State)({
        'inputs.pathname': Logix.StateTrait.externalStore({
          store: LocationExternalStore,
          select: (snap) => snap.pathname,
        }),
        'inputs.userId': Logix.StateTrait.externalStore({
          store: UserIdExternalStore,
        }),
        'inputs.featureFlag': Logix.StateTrait.externalStore({
          store: FeatureFlagExternalStore,
        }),
        'inputs.sourceValue': Logix.StateTrait.externalStore({
          store: Logix.ExternalStore.fromModule(SourceDef, SourceValueReadQuery),
        }),
        routeKey: Logix.StateTrait.computed({
          deps: ['inputs.pathname'],
          get: (pathname) => `route:${pathname}`,
        }),
        queryKey: Logix.StateTrait.computed({
          deps: ['routeKey', 'inputs.userId', 'inputs.featureFlag', 'inputs.sourceValue'],
          get: (routeKey, userId, featureFlag, sourceValue) =>
            `${routeKey}?user=${userId}&flag=${featureFlag}&source=${sourceValue}`,
        }),
      }),
    })

    const DemoModule = DemoDef.implement({
      initial: {
        inputs: { pathname: '/', userId: 'u1', featureFlag: 'flag:off', sourceValue: 0 },
        routeKey: 'route:/',
        queryKey: 'route:/?user=u1&flag=flag:off&source=0',
      },
      logics: [],
      imports: [SourceModule.impl],
    })

    const RootDef = Logix.Module.make('ExternalStoreTickRoot', {
      state: Schema.Void,
      actions: {},
    })

    const RootImpl = RootDef.implement({
      initial: undefined,
      imports: [DemoModule.impl],
    })

    const runtime = Logix.Runtime.make(RootImpl, { layer: DemoHostLive })
    const runtimeStore: any = Logix.InternalContracts.getRuntimeStore(runtime as any)

    const QueryKeyReadQuery = Logix.ReadQuery.make({
      selectorId: 'rq_demo_queryKey',
      debugKey: 'ExternalStoreTickDemo.queryKey',
      reads: ['queryKey'],
      select: (s: Schema.Schema.Type<typeof State>) => s.queryKey,
      equalsKind: 'objectIs',
    })

    try {
      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const demo: any = yield* DemoDef.tag
            const source: any = Logix.InternalContracts.getImportsScope(demo as any).get(SourceDef.tag)
            if (!source) {
              return yield* Effect.dieMessage(
                '[external-store-tick] Missing Source import: DemoModule must include SourceModule.impl in `imports` for Module-as-Source.',
              )
            }

            const demoModuleInstanceKey = `${demo.moduleId}::${demo.instanceId}`
            const sourceModuleInstanceKey = `${source.moduleId}::${source.instanceId}`
            const selectorTopicKey = `${demoModuleInstanceKey}::rq:${QueryKeyReadQuery.selectorId}`

            const logSnapshot = (label: string) => {
              const tickSeq = runtimeStore.getTickSeq()
              const demoState = runtimeStore.getModuleState(demoModuleInstanceKey) as any
              const sourceState = runtimeStore.getModuleState(sourceModuleInstanceKey) as any

              // eslint-disable-next-line no-console
              console.log(
                `[${label}] tickSeq=${tickSeq} pathname=${demoState.inputs.pathname} userId=${demoState.inputs.userId} ` +
                  `flag=${demoState.inputs.featureFlag} source=${sourceState.value} sourceValue=${demoState.inputs.sourceValue} ` +
                  `queryKey=${demoState.queryKey}`,
              )
            }

            const unsubModule = runtimeStore.subscribeTopic(demoModuleInstanceKey, () => logSnapshot('module-topic'))
            const unsubSelector = runtimeStore.subscribeTopic(selectorTopicKey, () => logSnapshot('selector-topic'))
            const unsubSource = runtimeStore.subscribeTopic(sourceModuleInstanceKey, () => logSnapshot('source-topic'))

            try {
              logSnapshot('initial')

              // 1) 一次 batch 内同步触发多个外部输入变化：最终在同一次 tick flush 中稳定化（tickSeq 只跳一次）。
              Logix.Runtime.batch(() => {
                LocationStore.set({ pathname: '/products' })
                Effect.runSync(SubscriptionRef.set(userIdRef, 'u2'))
                Effect.runSync(Queue.offer(flagQueue, 'flag:on'))
              })

              yield* Effect.sleep(30)

              // 2) Module-as-Source：更新 Source，Demo.inputs.sourceValue 会在同一 tick 内稳定化。
              yield* source.dispatch({ _tag: 'setValue', payload: 42 } as any)
              yield* Effect.sleep(30)

              // 3) 单独更新 router：只触发一条链路的 recompute（queryKey 仍会变化，但依赖可解释）。
              LocationStore.set({ pathname: '/cart' })
              yield* Effect.sleep(30)
            } finally {
              unsubSource()
              unsubSelector()
              unsubModule()
            }
          }) as any,
        ),
      )
    } finally {
      yield* Effect.promise(() => runtime.dispose())
    }
  }),
)

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
