import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { ManagedRuntime, Schema } from 'effect'
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
  it('static lane avoids recompute on unrelated dirtyRoots, dynamic lane still recomputes', async () => {
    const layer = Counter.live({ count: 0, other: 0 })
    const runtime = ManagedRuntime.make(layer as import('effect').Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let staticCalls = 0
    let dynamicCalls = 0

    const staticSelector = Object.assign(
      (s: { readonly count: number; readonly other: number }) => {
        staticCalls += 1
        return s.count
      },
      { fieldPaths: ['count'] },
    )

    const dynamicSelector = (s: { readonly count: number; readonly other: number }) => {
      dynamicCalls += 1
      return s.count + 1
    }

    const useTest = () => {
      const rt = useModule(Counter.tag)
      const other = useSelector(rt, (s: any) => s.other)
      const staticCount = useSelector(rt, staticSelector as any)
      const dynamicCount = useSelector(rt, dynamicSelector as any)
      return { rt, other, staticCount, dynamicCount }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.other).toBe(0)
      expect(result.current.staticCount).toBe(0)
      expect(result.current.dynamicCount).toBe(1)
    })

    const baselineStaticCalls = staticCalls
    const baselineDynamicCalls = dynamicCalls

    await act(async () => {
      result.current.rt.dispatchers.bumpOther()
    })

    await waitFor(() => {
      expect(result.current.other).toBe(1)
    })

    expect(staticCalls).toBe(baselineStaticCalls)
    expect(dynamicCalls).toBeGreaterThan(baselineDynamicCalls)
  })
})
