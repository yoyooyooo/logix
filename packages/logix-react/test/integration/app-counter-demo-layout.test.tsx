// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

describe('App-like counter demo layout (AppDemoLayout-style)', () => {
  const CounterModule = Logix.Module.make('AppDemoCounter', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {
      increment: Schema.Void,
      decrement: Schema.Void,
    },
    reducers: {
      increment: (s) => ({ ...s, count: s.count + 1 }),
      decrement: (s) => ({ ...s, count: s.count - 1 }),
    },
  })

  const CounterLogic = CounterModule.logic(($) => {
    // setup-only: register a global fallback error handler.
    $.lifecycle.onError((cause) => Effect.logError('AppDemoCounter logic error', cause))

    return Effect.gen(function* () {
      // Normal business log
      yield* Effect.log('AppDemoCounter logic setup')

      // Regular watcher: log once to prove dispatch works.
      yield* $.onAction('increment').run(() => Effect.log('increment dispatched from AppDemoCounter'))

      // Trace watcher: emit a trace:* Debug event on each increment.
      yield* $.onAction('increment').run(() =>
        Logix.Debug.record({
          type: 'trace:increment',
          moduleId: CounterModule.id,
          data: { source: 'app-counter-demo-layout.test' },
        }),
      )
    })
  })

  const CounterImpl = CounterModule.implement({
    initial: { count: 0 },
    logics: [CounterLogic],
  })

  const CounterView: React.FC = () => {
    const counter = useModule(CounterImpl)
    const count = useModule(counter, (s) => (s as { count: number }).count)

    return (
      <div>
        <span data-testid="count">{count}</span>
        <button type="button" onClick={() => counter.actions.decrement()}>
          dec
        </button>
        <button type="button" onClick={() => counter.actions.increment()}>
          inc
        </button>
      </div>
    )
  }

  it('should update count via Runtime.make + RuntimeProvider + hooks chain', async () => {
    const appRuntime = Logix.Runtime.make(CounterImpl, {
      // Do not inject an extra DebugSink here; only verify the Runtime -> Provider -> hooks chain works.
      // Debug.trace behavior is covered by runtime-debug-trace-integration.test.tsx.
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const { getByTestId, getByText } = render(
      <RuntimeProvider runtime={appRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('0')
    })

    fireEvent.click(getByText('inc'))

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('1')
    })

    fireEvent.click(getByText('dec'))

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('0')
    })
  })
})
