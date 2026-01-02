import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from '@testing-library/react'
import * as Logix from '@logix/core'
import { Schema, ManagedRuntime, Layer, Effect } from 'effect'
import React from 'react'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useLocalModule, useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

const incrementLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').run(() => $.state.update((s) => ({ count: s.count + 1 })))
  }),
)

  describe('useLocalModule', () => {
    let rootRuntime: ManagedRuntime.ManagedRuntime<any, any>
  // Vitest's type inference is strict for spy generics; use a loose `any` to keep the test focused on behavior.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let useIdSpy: any

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <React.StrictMode>
      <RuntimeProvider runtime={rootRuntime}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    </React.StrictMode>
  )

  beforeEach(() => {
    rootRuntime = ManagedRuntime.make(Layer.empty as unknown as Layer.Layer<any, any, never>)
    // In tests, React.useId behaves slightly differently than in production; fix the return value
    // to avoid projecting runner-specific behavior onto the production key design.
    useIdSpy = vi.spyOn(React, 'useId').mockImplementation(() => 'test-local-id')
  })

  afterEach(async () => {
    await rootRuntime.dispose()
    useIdSpy?.mockRestore()
    useIdSpy = undefined
  })

  it('should create local runtime from module options', async () => {
    const useTest = () => {
      const counter = useLocalModule(Counter, {
        initial: { count: 0 },
        logics: [incrementLogic],
      })
      const count = useModule(counter, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      return { counter, count }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current?.count).toBe(0)
    })

    await act(async () => {
      result.current.counter.actions.increment()
    })

    await waitFor(() => {
      expect(result.current?.count).toBe(1)
    })
  })

  it('should re-create runtime when deps change', async () => {
    const useTest = (userId: string) => {
      const counter = useLocalModule(Counter, {
        initial: { count: Number(userId) },
        logics: [incrementLogic],
        deps: [userId],
      })
      return useModule(counter, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
    }

    const { result, rerender } = renderHook(({ id }) => useTest(id), {
      initialProps: { id: '1' },
      wrapper,
    })

    await waitFor(() => {
      expect(result.current).toBe(1)
    })

    rerender({ id: '5' })

    await waitFor(() => {
      expect(result.current).toBe(5)
    })
  })
})
