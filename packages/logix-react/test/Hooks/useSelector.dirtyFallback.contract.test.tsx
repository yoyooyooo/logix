import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as Logix from '@logixjs/core'
import { Effect, Layer, Schema } from 'effect'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '../../src/index.js'

const Counter = Logix.Module.make('useSelectorDirtyFallbackCounter', {
  state: Schema.Struct({ count: Schema.Number, other: Schema.Number }),
  actions: { bumpOther: Schema.Void },
  reducers: {
    bumpOther: Logix.Module.Reducer.mutate((draft) => {
      draft.other += 1
    }),
  },
})

describe('useSelector dirty fallback contract', () => {
  it('does not wake exact read-query selectors for unrelated dirty paths', async () => {
    const events: CoreDebug.Event[] = []
    const runtime = Logix.Runtime.make(
      Logix.Program.make(Counter, {
        initial: { count: 0, other: 0 },
      }),
      {
        layer: CoreDebug.replace([
          {
            record: (event) =>
              Effect.sync(() => {
                events.push(event)
              }),
          },
        ]) as Layer.Layer<any, never, never>,
      },
    )
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let countRenders = 0

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter.tag)
        const count = useSelector(counter, fieldValue('count'))
        countRenders += 1
        return { counter, count }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    const baseline = countRenders

    await act(async () => {
      result.current.counter.dispatchers.bumpOther()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    expect(countRenders).toBe(baseline)
    expect(events.some((event) => (event as any).kind === 'selector_dirty_fallback')).toBe(false)
  })
})
