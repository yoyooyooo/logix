// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { getRuntimeReadQueryExternalStore } from '../../../src/internal/store/RuntimeExternalStore.js'

const settleRuntime = async (hostScheduler: RuntimeContracts.DeterministicHostScheduler): Promise<void> => {
  for (let i = 0; i < 8; i += 1) {
    hostScheduler.flushAll()
    await Promise.resolve()
  }
}

const makeCounterRuntime = () => {
  const hostScheduler = RuntimeContracts.makeDeterministicHostScheduler()
  const State = Schema.Struct({ count: Schema.Number })
  const Actions = { inc: Schema.Void }
  const M = Logix.Module.make('RuntimeExternalStoreRunSyncFallbackContract', {
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
  const readQuery = RuntimeContracts.Selector.compile(
    Object.assign((state: { readonly count: number }) => state.count, {
      fieldPaths: ['count'],
    }) as any,
  )
  const route = RuntimeContracts.Selector.route(readQuery)

  return { runtime, moduleRuntime, readQuery, route, hostScheduler }
}

describe('RuntimeExternalStore runSync fallback contract', () => {
  it('uses committed RuntimeStore snapshot for active readQuery listeners without runSync fallback', async () => {
    const { runtime, moduleRuntime, readQuery, route, hostScheduler } = makeCounterRuntime()
    let runSyncFallbackCount = 0
    let notificationCount = 0

    const wrappedModuleRuntime = {
      ...moduleRuntime,
      getState: Effect.flatMap(
        Effect.sync(() => {
          runSyncFallbackCount += 1
        }),
        () => moduleRuntime.getState,
      ),
    }

    const store = getRuntimeReadQueryExternalStore(runtime as any, wrappedModuleRuntime as any, readQuery as any, route as any)
    const unsubscribe = store.subscribe(() => {
      notificationCount += 1
    })

    try {
      await settleRuntime(hostScheduler)
      notificationCount = 0

      await runtime.runPromise(moduleRuntime.dispatch({ _tag: 'inc', payload: undefined } as any))
      await settleRuntime(hostScheduler)

      expect(store.getSnapshot()).toBe(1)
      expect(runSyncFallbackCount).toBe(0)
      expect(notificationCount).toBe(1)
    } finally {
      unsubscribe()
      await settleRuntime(hostScheduler)
      await runtime.dispose()
    }
  })

  it('does not notify the first listener again when the readQuery snapshot is already committed', async () => {
    const { runtime, moduleRuntime, readQuery, route, hostScheduler } = makeCounterRuntime()
    let notificationCount = 0

    const store = getRuntimeReadQueryExternalStore(runtime as any, moduleRuntime as any, readQuery as any, route as any)
    expect(store.getSnapshot()).toBe(0)

    const unsubscribe = store.subscribe(() => {
      notificationCount += 1
    })

    try {
      await settleRuntime(hostScheduler)
      expect(notificationCount).toBe(0)

      await runtime.runPromise(moduleRuntime.dispatch({ _tag: 'inc', payload: undefined } as any))
      await settleRuntime(hostScheduler)

      expect(store.getSnapshot()).toBe(1)
      expect(notificationCount).toBe(1)
    } finally {
      unsubscribe()
      await settleRuntime(hostScheduler)
      await runtime.dispose()
    }
  })
})
