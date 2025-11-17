// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { ReactPlatform } from '../../src/ReactPlatform.js'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'

describe('ReactPlatform', () => {
  it('should expose RuntimeProvider as Provider', () => {
    expect(ReactPlatform.Provider).toBe(RuntimeProvider)
  })

  it('createRoot should provide runtime for hooks', async () => {
    const Counter = Logix.Module.make('ReactPlatformTestCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          draft.count += 1
        }),
      },
    })

    const impl = Counter.implement({ initial: { count: 0 } })
    const runtime = Logix.Runtime.make(impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const Root = ReactPlatform.createRoot(runtime)

    const wrapper = ({ children }: { children: React.ReactNode }) => <Root>{children}</Root>

    const { result } = renderHook(
      () => {
        const counter = ReactPlatform.useModule(Counter.tag)
        const count = ReactPlatform.useSelector(counter, (s: any) => s.count) as number
        return { count }
      },
      { wrapper },
    )

    await waitFor(() => expect(result.current.count).toBe(0))

    await act(async () => {
      await runtime.runPromise(
        Effect.gen(function* () {
          const rt: any = yield* Counter.tag
          yield* rt.dispatch({ _tag: 'inc', payload: undefined } as any)
        }),
      )
    })

    await waitFor(() => expect(result.current.count).toBe(1))
    await runtime.dispose()
  })
})
