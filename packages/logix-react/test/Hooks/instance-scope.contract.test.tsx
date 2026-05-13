import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'
import type { ProgramInstanceOptions } from '../../src/internal/hooks/useModule.js'

const Counter = Logix.Module.make('InstanceScopeContract.Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterLogic = Counter.logic('counter-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run($.state.update((s) => ({ count: s.count + 1 })))
  }),
)

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

const makeRuntime = () => ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

const CounterPanel: React.FC<{
  readonly id: string
  readonly access: 'tag' | 'program'
  readonly options?: ProgramInstanceOptions
}> = ({ id, access, options }) => {
  const ref = access === 'tag' ? useModule(Counter.tag) : options ? useModule(CounterProgram, options) : useModule(CounterProgram)
  const count = useSelector(ref, (s) => s.count)

  return (
    <>
      <button type="button" data-testid={`inc:${id}`} onClick={() => ref.dispatchers.inc()}>
        inc
      </button>
      <span data-testid={`count:${id}`}>{count}</span>
      <span data-testid={`instance:${id}`}>{ref.runtime.instanceId}</span>
    </>
  )
}

describe('React instance scope contract', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    cleanup()
  })

  it('shares ModuleTag lookups within the same provider scope under default suspend policy', async () => {
    const rootRuntime = Logix.Runtime.make(CounterProgram)

    const view = render(
      <RuntimeProvider runtime={rootRuntime}>
        <React.Suspense fallback={null}>
          <CounterPanel id="a" access="tag" />
          <CounterPanel id="b" access="tag" />
        </React.Suspense>
      </RuntimeProvider>,
    )

    try {
      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('0')
        expect(view.getByTestId('count:b').textContent).toBe('0')
        expect(view.getByTestId('instance:a').textContent).toBe(view.getByTestId('instance:b').textContent)
      })

      fireEvent.click(view.getByTestId('inc:a'))

      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('1')
        expect(view.getByTestId('count:b').textContent).toBe('1')
        expect(view.getByTestId('instance:a').textContent).toBe(view.getByTestId('instance:b').textContent)
      })
    } finally {
      view.unmount()
      await rootRuntime.dispose()
    }
  })

  it('keeps unkeyed Program instances private per component under default suspend policy', async () => {
    const runtime = makeRuntime()

    const view = render(
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={null}>
          <CounterPanel id="a" access="program" />
          <CounterPanel id="b" access="program" />
        </React.Suspense>
      </RuntimeProvider>,
    )

    try {
      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('0')
        expect(view.getByTestId('count:b').textContent).toBe('0')
        expect(view.getByTestId('instance:a').textContent).not.toBe(view.getByTestId('instance:b').textContent)
      })

      fireEvent.click(view.getByTestId('inc:a'))

      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('1')
        expect(view.getByTestId('count:b').textContent).toBe('0')
        expect(view.getByTestId('instance:a').textContent).not.toBe(view.getByTestId('instance:b').textContent)
      })
    } finally {
      view.unmount()
      await runtime.dispose()
    }
  })

  it('reuses keyed Program instances across components within one provider scope', async () => {
    const runtime = makeRuntime()

    const view = render(
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={null}>
          <CounterPanel id="a" access="program" options={{ key: 'shared' }} />
          <CounterPanel id="b" access="program" options={{ key: 'shared' }} />
        </React.Suspense>
      </RuntimeProvider>,
    )

    try {
      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('0')
        expect(view.getByTestId('count:b').textContent).toBe('0')
        expect(view.getByTestId('instance:a').textContent).toBe(view.getByTestId('instance:b').textContent)
      })

      fireEvent.click(view.getByTestId('inc:a'))

      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('1')
        expect(view.getByTestId('count:b').textContent).toBe('1')
        expect(view.getByTestId('instance:a').textContent).toBe(view.getByTestId('instance:b').textContent)
      })
    } finally {
      view.unmount()
      await runtime.dispose()
    }
  })

  it('does not share keyed Program instances across different provider runtime scopes', async () => {
    const runtimeA = makeRuntime()
    const runtimeB = makeRuntime()

    const view = render(
      <>
        <RuntimeProvider runtime={runtimeA}>
          <React.Suspense fallback={null}>
            <CounterPanel id="a" access="program" options={{ key: 'shared' }} />
          </React.Suspense>
        </RuntimeProvider>
        <RuntimeProvider runtime={runtimeB}>
          <React.Suspense fallback={null}>
            <CounterPanel id="b" access="program" options={{ key: 'shared' }} />
          </React.Suspense>
        </RuntimeProvider>
      </>,
    )

    try {
      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('0')
        expect(view.getByTestId('count:b').textContent).toBe('0')
        expect(view.getByTestId('instance:a').textContent).not.toBe(view.getByTestId('instance:b').textContent)
      })

      fireEvent.click(view.getByTestId('inc:a'))

      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('1')
        expect(view.getByTestId('count:b').textContent).toBe('0')
        expect(view.getByTestId('instance:a').textContent).not.toBe(view.getByTestId('instance:b').textContent)
      })
    } finally {
      view.unmount()
      await runtimeA.dispose()
      await runtimeB.dispose()
    }
  })

  it('keeps keyed Program instances alive until gcTime after the last holder unmounts', async () => {
    const runtime = makeRuntime()

    const Host: React.FC<{ readonly show: boolean }> = ({ show }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {show ? <CounterPanel id="a" access="program" options={{ key: 'session:A', gcTime: 20 }} /> : null}
      </RuntimeProvider>
    )

    const view = render(<Host show />)

    try {
      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('0')
      })

      const firstInstanceId = view.getByTestId('instance:a').textContent
      fireEvent.click(view.getByTestId('inc:a'))

      await waitFor(() => {
        expect(view.getByTestId('count:a').textContent).toBe('1')
      })

      vi.useFakeTimers()

      await act(async () => {
        view.rerender(<Host show={false} />)
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(19)
      })

      await act(async () => {
        view.rerender(<Host show />)
      })

      expect(view.getByTestId('count:a').textContent).toBe('1')
      expect(view.getByTestId('instance:a').textContent).toBe(firstInstanceId)

      await act(async () => {
        view.rerender(<Host show={false} />)
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(20)
      })

      await act(async () => {
        view.rerender(<Host show />)
      })

      expect(view.getByTestId('count:a').textContent).toBe('0')
      expect(view.getByTestId('instance:a').textContent).not.toBe(firstInstanceId)
    } finally {
      view.unmount()
      vi.useRealTimers()
      await runtime.dispose()
    }
  })
})
