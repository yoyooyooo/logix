// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { getRuntimeReadQueryExternalStore } from '../../../src/internal/store/RuntimeExternalStore.js'
import { disposeRuntimeExternalStoresForHotLifecycle } from '../../../src/internal/store/RuntimeExternalStore.hotLifecycle.js'

const settleRuntime = async (hostScheduler: RuntimeContracts.DeterministicHostScheduler): Promise<void> => {
  for (let i = 0; i < 8; i += 1) {
    hostScheduler.flushAll()
    await Promise.resolve()
  }
}

const makeRuntimeStoreHarness = () => {
  const hostScheduler = RuntimeContracts.makeDeterministicHostScheduler()
  const State = Schema.Struct({ count: Schema.Number })
  const Actions = { inc: Schema.Void }
  const M = Logix.Module.make('RuntimeExternalStoreTopicRetainReleaseContract', {
    state: State,
    actions: Actions,
    reducers: {
      inc: Logix.Module.Reducer.mutate((draft) => {
        draft.count += 1
      }),
    },
  })

  const program = Logix.Program.make(M, { initial: { count: 0 }, logics: [] })
  const runtime = Logix.Runtime.make(program, {
    hostScheduler,
    layer: Layer.empty as Layer.Layer<any, never, never>,
  })
  const moduleRuntime = runtime.runSync(Effect.service(M.tag).pipe(Effect.orDie)) as any
  const runtimeStore = RuntimeContracts.getRuntimeStore(runtime as any)
  const readQuery = RuntimeContracts.Selector.compile(
    Object.assign((state: { readonly count: number }) => state.count, {
      fieldPaths: ['count'],
    }) as any,
  )
  const route = RuntimeContracts.Selector.route(readQuery)
  const moduleInstanceKey = `${moduleRuntime.moduleId}::${moduleRuntime.instanceId}`
  const topicKey = `${moduleInstanceKey}::rq:${route.selectorFingerprint.value}`

  return { runtime, moduleRuntime, runtimeStore, readQuery, route, moduleInstanceKey, topicKey, hostScheduler }
}

describe('RuntimeExternalStore topic retain/release contract', () => {
  it('releases retained readQuery topic after unmount unsubscribe settles', async () => {
    const { runtime, moduleRuntime, runtimeStore, readQuery, route, moduleInstanceKey, topicKey, hostScheduler } =
      makeRuntimeStoreHarness()

    const store = getRuntimeReadQueryExternalStore(runtime as any, moduleRuntime, readQuery as any, route as any)
    const unsubscribe = store.subscribe(() => {})
    await settleRuntime(hostScheduler)

    expect(runtimeStore.getTopicSubscriberCount(topicKey as any)).toBe(1)
    expect(runtimeStore.getModuleSubscriberCount(moduleInstanceKey as any)).toBe(1)

    unsubscribe()
    await settleRuntime(hostScheduler)

    expect(runtimeStore.getTopicSubscriberCount(topicKey as any)).toBe(0)
    expect(runtimeStore.getModuleSubscriberCount(moduleInstanceKey as any)).toBe(0)
    expect(moduleRuntime.__internalSelectorGraphHasEntries?.()).toBe(false)

    await runtime.dispose()
  })

  it('hot lifecycle disposal leaves no retained RuntimeStore topic for the old instance', async () => {
    const { runtime, moduleRuntime, runtimeStore, readQuery, route, moduleInstanceKey, topicKey, hostScheduler } =
      makeRuntimeStoreHarness()

    const store = getRuntimeReadQueryExternalStore(runtime as any, moduleRuntime, readQuery as any, route as any)
    store.subscribe(() => {})
    await settleRuntime(hostScheduler)

    expect(runtimeStore.getTopicSubscriberCount(topicKey as any)).toBe(1)

    const summary = disposeRuntimeExternalStoresForHotLifecycle(runtime as unknown as object)
    await settleRuntime(hostScheduler)

    expect(summary).toEqual({ closed: 1, failed: 0 })
    expect(runtimeStore.getTopicSubscriberCount(topicKey as any)).toBe(0)
    expect(runtimeStore.getModuleSubscriberCount(moduleInstanceKey as any)).toBe(0)
    expect(moduleRuntime.__internalSelectorGraphHasEntries?.()).toBe(false)

    await runtime.dispose()
  })
})
