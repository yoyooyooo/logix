import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logix/core'
import { ManagedRuntime, Schema, Layer } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('useSelectorStructMemoCounter', {
  state: Schema.Struct({ count: Schema.Number, age: Schema.Number, other: Schema.Number }),
  actions: { inc: Schema.Void, bumpAge: Schema.Void, bumpOther: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
    bumpAge: Logix.Module.Reducer.mutate((draft) => {
      draft.age += 1
    }),
    bumpOther: Logix.Module.Reducer.mutate((draft) => {
      draft.other += 1
    }),
  },
})

describe('useSelector(struct memo)', () => {
  it('reuses object reference when unrelated fields change', async () => {
    const layer = Counter.live({ count: 0, age: 0, other: 0 })
    const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        tickServicesLayer,
        Layer.provide(layer as Layer.Layer<any, never, any>, tickServicesLayer),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const useTest = () => {
      const rt = useModule(Counter.tag)
      const other = useModule(Counter.tag, (s: any) => s.other)
      const view = useModule(Counter.tag, (s: any) => ({ count: s.count, age: s.age }))
      return { rt, other, view }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.view).toEqual({ count: 0, age: 0 })
      expect(result.current.other).toBe(0)
    })

    const first = result.current.view

    await act(async () => {
      result.current.rt.dispatchers.bumpOther()
    })

    await waitFor(() => {
      expect(result.current.other).toBe(1)
    })

    expect(result.current.view).toBe(first)
  })
})
