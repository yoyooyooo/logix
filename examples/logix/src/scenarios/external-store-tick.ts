/**
 * @scenario Runtime External Input Seam + Tick（Route/State/Query-like chain）
 * @description
 *   用最少代码演示 “外部输入 seam → state.inputs → computed(queryKey) → 订阅观测” 的链路，
 *   当前统一使用更窄的 runtime seam owner：
 *   - `RuntimeContracts.ExternalInput.fromService`：宿主注入，例如 router/session/flags
 *   - `RuntimeContracts.ExternalInput.fromSubscriptionRef`：同步纯读的 SubscriptionRef
 *   - `RuntimeContracts.ExternalInput.fromStream`：必须提供 initial/current
 *   - `RuntimeContracts.ExternalInput.fromModule`：Module-as-Source，依赖 selector input 语义
 *
 *   最后用 `tickSeq` 作为观测锚点展示 “一次 batch 内的多次外部信号 → 同一次 tick flush”。
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/external-store-tick.ts
 */
import { Effect, Layer, Queue, Schema, ServiceMap, Stream, SubscriptionRef } from 'effect'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '@logixjs/core'

export class UsersRepo extends ServiceMap.Service<UsersRepo, {}>()('Accounts/UsersRepo') {}

export const UsersRepoLive = Layer.succeed(UsersRepo, {})

type Listener = () => void

const makeSignalStore = <T>(initial: T) => {
  let current = initial
  const listeners = new Set<Listener>()

  const store: RuntimeContracts.ExternalInput.ExternalStore<T> = {
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
  readonly location: RuntimeContracts.ExternalInput.ExternalStore<{ readonly pathname: string }>
}

class DemoHostServiceTag extends ServiceMap.Service<DemoHostServiceTag, DemoHostService>()('ExternalStoreTickDemoHost') { }

const DemoHostLive = Layer.succeed(DemoHostServiceTag, {
  location: LocationStore.store,
})

const main = Effect.scoped(
  Effect.gen(function* () {
    const userIdRef = yield* SubscriptionRef.make('u1')
    const flagQueue = yield* Queue.unbounded<string>()
    const flag$ = Stream.fromQueue(flagQueue)

    const LocationInput = RuntimeContracts.ExternalInput.fromService(DemoHostServiceTag, (svc) => svc.location)
    const UserIdInput = RuntimeContracts.ExternalInput.fromSubscriptionRef({
      get: SubscriptionRef.get(userIdRef),
      changes: SubscriptionRef.changes(userIdRef),
    })
    const FeatureFlagInput = RuntimeContracts.ExternalInput.fromStream(flag$, { initial: 'flag:off' })

    const SourceState = Schema.Struct({ value: Schema.Number })

    const Source = Logix.Module.make('ExternalStoreTickSource', {
      state: SourceState,
      actions: { setValue: Schema.Number },
      reducers: {
        setValue: Logix.Module.Reducer.mutate<{ value: number }, { payload: number }>((draft, payload) => {
          draft.value = payload
        }),
      },
    })

    const SourceProgram = Logix.Program.make(Source, {
      initial: { value: 0 },
    })

    const SourceValueSelector = RuntimeContracts.Selector.make({
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

    const Demo = Logix.Module.make('ExternalStoreTickDemo', {
      state: State,
      actions: {},
    })

    const DemoFields = FieldContracts.fieldFrom(State)({
      'inputs.pathname': FieldContracts.fieldExternalStore({
        store: LocationInput,
        select: (snap) => snap.pathname,
      }),
      'inputs.userId': FieldContracts.fieldExternalStore({
        store: UserIdInput,
      }),
      'inputs.featureFlag': FieldContracts.fieldExternalStore({
        store: FeatureFlagInput,
      }),
      'inputs.sourceValue': FieldContracts.fieldExternalStore({
        store: RuntimeContracts.ExternalInput.fromModule(Source, SourceValueSelector),
      }),
      routeKey: FieldContracts.fieldComputed({
        deps: ['inputs.pathname'],
        get: (pathname) => `route:${pathname}`,
      }),
      queryKey: FieldContracts.fieldComputed({
        deps: ['routeKey', 'inputs.userId', 'inputs.featureFlag', 'inputs.sourceValue'],
        get: (routeKey, userId, featureFlag, sourceValue) =>
          `${routeKey}?user=${userId}&flag=${featureFlag}&source=${sourceValue}`,
      }),
    })

    const DemoFieldsLogic = Demo.logic('external-store-tick-fields', ($) => {
      $.fields(DemoFields)
      return Effect.void
    })

    const DemoProgram = Logix.Program.make(Demo, {
      initial: {
        inputs: { pathname: '/', userId: 'u1', featureFlag: 'flag:off', sourceValue: 0 },
        routeKey: 'route:/',
        queryKey: 'route:/?user=u1&flag=flag:off&source=0',
      },
      logics: [DemoFieldsLogic],
      capabilities: {
        imports: [SourceProgram],
      },
    })

    const Root = Logix.Module.make('ExternalStoreTickRoot', {
      state: Schema.Void,
      actions: {},
    })

    const RootProgram = Logix.Program.make(Root, {
      initial: undefined,
      capabilities: {
        imports: [DemoProgram],
      },
    })

    const runtime = Logix.Runtime.make(RootProgram, { layer: DemoHostLive })
    const runtimeStore: any = RuntimeContracts.getRuntimeStore(runtime as any)

    const QueryKeySelector = RuntimeContracts.Selector.make({
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
            const demo: any = yield* Effect.service(Demo.tag).pipe(Effect.orDie)
            const source: any = RuntimeContracts.getImportsScope(demo as any).get(Source.tag)
            if (!source) {
              return yield* Effect.die(
                new Error(
                  '[external-store-tick] Missing Source import: DemoProgram must include SourceProgram in `capabilities.imports` for Module-as-Source.',
                ),
              )
            }

            const demoModuleInstanceKey = `${demo.moduleId}::${demo.instanceId}`
            const sourceModuleInstanceKey = `${source.moduleId}::${source.instanceId}`
            const selectorTopicKey = `${demoModuleInstanceKey}::rq:${QueryKeySelector.selectorId}`

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
