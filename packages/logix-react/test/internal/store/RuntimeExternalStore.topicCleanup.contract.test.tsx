// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { getRuntimeReadQueryExternalStore } from '../../../src/internal/store/RuntimeExternalStore.js'

const waitMicrotask = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('RuntimeExternalStore topic cleanup contract', () => {
  it('releases RuntimeStore topic subscription and selector retain after unsubscribe', async () => {
    const State = Schema.Struct({ count: Schema.Number })
    const Actions = { inc: Schema.Void }
    const M = Logix.Module.make('RuntimeExternalStoreTopicCleanup', {
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
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })
    const moduleRuntime: any = runtime.runSync(Effect.service(M.tag).pipe(Effect.orDie))
    const runtimeStore = RuntimeContracts.getRuntimeStore(runtime as any)
    const readQuery = RuntimeContracts.Selector.compile(
      Object.assign((state: { readonly count: number }) => state.count, {
        fieldPaths: ['count'],
      }) as any,
    )
    const route = RuntimeContracts.Selector.route(readQuery)
    const moduleInstanceKey = `${moduleRuntime.moduleId}::${moduleRuntime.instanceId}`
    const topicKey = `${moduleInstanceKey}::rq:${route.selectorFingerprint.value}`

    const store = getRuntimeReadQueryExternalStore(runtime as any, moduleRuntime, readQuery as any, route as any)
    const unsubscribe = store.subscribe(() => {})

    await waitMicrotask()
    expect(runtimeStore.getTopicSubscriberCount(topicKey as any)).toBe(1)
    expect(moduleRuntime.__internalSelectorGraphHasEntries?.()).toBe(true)

    unsubscribe()
    await waitMicrotask()
    await waitMicrotask()

    expect(runtimeStore.getTopicSubscriberCount(topicKey as any)).toBe(0)
    expect(runtimeStore.getModuleSubscriberCount(moduleInstanceKey as any)).toBe(0)
    expect(moduleRuntime.__internalSelectorGraphHasEntries?.()).toBe(false)

    await runtime.dispose()
  })
})
