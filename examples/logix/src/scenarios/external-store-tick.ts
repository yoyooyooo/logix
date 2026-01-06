/**
 * @scenario ExternalStore + Tick（Route/State/Query-like chain）
 * @description
 *   用最少代码演示 “外部输入 → state.inputs → computed(queryKey) → 订阅观测” 的链路，
 *   并用 `tickSeq` 作为观测锚点展示 “一次 batch 内的多次外部信号 → 同一次 tick flush”。
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/external-store-tick.ts
 */
import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

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
const UserIdStore = makeSignalStore('u1')

const State = Schema.Struct({
  inputs: Schema.Struct({
    pathname: Schema.String,
    userId: Schema.String,
  }),
  routeKey: Schema.String,
  queryKey: Schema.String,
})

const DemoDef = Logix.Module.make('ExternalStoreTickDemo', {
  state: State,
  actions: {},
  traits: Logix.StateTrait.from(State)({
    'inputs.pathname': Logix.StateTrait.externalStore({
      store: LocationStore.store,
      select: (snap) => snap.pathname,
    }),
    'inputs.userId': Logix.StateTrait.externalStore({
      store: UserIdStore.store,
    }),
    routeKey: Logix.StateTrait.computed({
      deps: ['inputs.pathname'],
      get: (pathname) => `route:${pathname}`,
    }),
    queryKey: Logix.StateTrait.computed({
      deps: ['routeKey', 'inputs.userId'],
      get: (routeKey, userId) => `${routeKey}?user=${userId}`,
    }),
  }),
})

const DemoModule = DemoDef.implement({
  initial: {
    inputs: { pathname: '/', userId: 'u1' },
    routeKey: 'route:/',
    queryKey: 'route:/?user=u1',
  },
  logics: [],
})

const runtime = Logix.Runtime.make(DemoModule)

const QueryKeyReadQuery = Logix.ReadQuery.make({
  selectorId: 'rq_demo_queryKey',
  debugKey: 'ExternalStoreTickDemo.queryKey',
  reads: ['queryKey'],
  select: (s: Schema.Schema.Type<typeof State>) => s.queryKey,
  equalsKind: 'objectIs',
})

const main = Effect.gen(function* () {
  const runtimeStore: any = Logix.InternalContracts.getRuntimeStore(runtime as any)

  try {
    yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const rt: any = yield* DemoDef.tag

          const moduleInstanceKey = `${rt.moduleId}::${rt.instanceId}`
          const selectorTopicKey = `${moduleInstanceKey}::rq:${QueryKeyReadQuery.selectorId}`

          const logSnapshot = (label: string) => {
            const tickSeq = runtimeStore.getTickSeq()
            const state = runtimeStore.getModuleState(moduleInstanceKey) as any
            // eslint-disable-next-line no-console
            console.log(
              `[${label}] tickSeq=${tickSeq} pathname=${state.inputs.pathname} userId=${state.inputs.userId} queryKey=${state.queryKey}`,
            )
          }

          const unsubModule = runtimeStore.subscribeTopic(moduleInstanceKey, () => logSnapshot('module-topic'))
          const unsubSelector = runtimeStore.subscribeTopic(selectorTopicKey, () => logSnapshot('selector-topic'))

          try {
            logSnapshot('initial')

            // 1) 一次 batch 内同步触发多个外部输入变化：最终在同一次 tick flush 中稳定化。
            Logix.Runtime.batch(() => {
              LocationStore.set({ pathname: '/products' })
              UserIdStore.set('u2')
            })

            yield* Effect.sleep(30)

            // 2) 单独更新 router：只触发一条链路的 recompute（queryKey 仍会变化，但依赖可解释）。
            LocationStore.set({ pathname: '/cart' })
            yield* Effect.sleep(30)
          } finally {
            unsubSelector()
            unsubModule()
          }
        }) as any,
      ),
    )
  } finally {
    yield* Effect.promise(() => runtime.dispose())
  }
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
