import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { getRuntimeReadQueryExternalStore } from '../../src/internal/store/RuntimeExternalStore.js'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('RuntimeExternalStore idle teardown', () => {
  it('evicts an unsubscribed readQuery store after the grace window', async () => {
    const State = Schema.Struct({ value: Schema.Number })
    const Actions = { inc: Schema.Void }

    const M = Logix.Module.make('RuntimeExternalStoreIdleTeardown', {
      state: State,
      actions: Actions,
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          draft.value += 1
        }),
      },
    })

    const impl = M.implement({ initial: { value: 0 }, logics: [] })
    const runtime = Logix.Runtime.make(impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const rt: any = runtime.runSync(Effect.service(M.tag).pipe(Effect.orDie))
    const readQuery = Logix.ReadQuery.make({
      selectorId: 'rq_idle_teardown',
      reads: ['value'],
      select: (state: { readonly value: number }) => state.value,
      equalsKind: 'objectIs',
    })

    try {
      const first = getRuntimeReadQueryExternalStore(runtime as any, rt, readQuery as any)
      await sleep(25)
      const second = getRuntimeReadQueryExternalStore(runtime as any, rt, readQuery as any)
      expect(second).not.toBe(first)
    } finally {
      await runtime.dispose()
    }
  })
})
