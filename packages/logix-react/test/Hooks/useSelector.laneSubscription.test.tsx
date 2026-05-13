import { describe, it, expect } from 'vitest'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { ManagedRuntime, Schema, Layer } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'

const Counter = Logix.Module.make('useSelectorLaneSubscriptionCounter', {
  state: Schema.Struct({ count: Schema.Number, other: Schema.Number }),
  actions: { inc: Schema.Void, bumpOther: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
    bumpOther: Logix.Module.Reducer.mutate((draft) => {
      draft.other += 1
    }),
  },
})

describe('useSelector(lane subscription)', () => {
  it('static lane avoids recompute on unrelated dirtyRoots and dynamic lane is rejected', async () => {
    const layer = Counter.live({ count: 0, other: 0 })
    const tickServicesLayer = RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, any>
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        tickServicesLayer,
        Layer.provide(layer as Layer.Layer<any, never, any>, tickServicesLayer),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let staticCalls = 0

    const staticSelector = Object.assign(
      (s: { readonly count: number; readonly other: number }) => {
        staticCalls += 1
        return s.count
      },
      { fieldPaths: ['count'] },
    )

    const useTest = () => {
      const rt = useModule(Counter.tag)
      const other = useSelector(rt, (s: any) => s.other)
      const staticCount = useSelector(rt, staticSelector as any)
      return { rt, other, staticCount }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.other).toBe(0)
      expect(result.current.staticCount).toBe(0)
    })

    const baselineStaticCalls = staticCalls

    await act(async () => {
      result.current.rt.dispatchers.bumpOther()
    })

    await waitFor(() => {
      expect(result.current.other).toBe(1)
    })

    expect(staticCalls).toBe(baselineStaticCalls)
  })

  it('rejects dynamic selector fallback at the core route gate', () => {
    const dynamicSelector = (s: { readonly count: number; readonly other: number }) => s.count + 1
    const decision = RuntimeContracts.Selector.route(
      RuntimeContracts.Selector.compile(dynamicSelector),
    )

    expect(decision.kind).toBe('reject')
    expect(decision.failureCode).toBe('selector.dynamic_fallback')
  })
})
