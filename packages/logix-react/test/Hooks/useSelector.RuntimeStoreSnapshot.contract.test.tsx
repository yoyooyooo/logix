import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { getRuntimeReadQueryExternalStore } from '../../src/internal/store/RuntimeExternalStore.js'

describe('useSelector runtimeStore snapshot contract', () => {
  it('prefers runtimeStore snapshot even when active listener exists', async () => {
    const State = Schema.Struct({ count: Schema.Number })
    const Actions = { inc: Schema.Void }

    const M = Logix.Module.make('RuntimeStoreSnapshotContract', {
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

    const rt: any = runtime.runSync(Effect.service(M.tag).pipe(Effect.orDie))
    const readQuery = RuntimeContracts.Selector.compile(
      Object.assign((state: { readonly count: number }) => state.count, {
        fieldPaths: ['count'],
      }) as any,
    )
    const route = RuntimeContracts.Selector.route(readQuery)

    let syncFallbackCount = 0
    let legacyStreamDrainCount = 0
    let notificationCount = 0
    const moduleRuntime = {
      ...rt,
      getState: Effect.flatMap(
        Effect.sync(() => {
          syncFallbackCount += 1
        }),
        () => rt.getState,
      ),
      changesReadQueryWithMeta: (...args: any[]) => {
        legacyStreamDrainCount += 1
        return rt.changesReadQueryWithMeta(...args)
      },
    }

    const store = getRuntimeReadQueryExternalStore(runtime as any, moduleRuntime as any, readQuery as any, route as any)
    const unsubscribe = store.subscribe(() => {
      notificationCount += 1
    })

    try {
      await runtime.runPromise(rt.dispatch({ _tag: 'inc', payload: undefined } as any))
      await new Promise((resolve) => setTimeout(resolve, 0))
      const snapshot = store.getSnapshot()
      expect(snapshot).toBe(1)
      expect(syncFallbackCount).toBe(0)
      expect(legacyStreamDrainCount).toBe(0)
      expect(notificationCount).toBeGreaterThan(0)
    } finally {
      unsubscribe()
      await runtime.dispose()
    }
  })
})
