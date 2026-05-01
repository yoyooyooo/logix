import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'

describe('AppDemoLayout-style runtime + Debug.traceLayer + Suspense', () => {
  //
  // This test largely mirrors examples/logix-react/src/demos/AppDemoLayout.tsx and verifies:
  // - Runtime.make + Debug.layer({ mode: 'dev' }) + Debug.traceLayer does not trigger AsyncFiberException;
  // - Under React.StrictMode + Suspense, useProgramRuntimeBlueprint(..., { suspend: true, key }) initializes correctly and responds to clicks.
  //

  const AppCounterModule = Logix.Module.make('AppCounterDemoTest', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {
      increment: Schema.Void,
      decrement: Schema.Void,
    },
    reducers: {
      increment: Logix.Module.Reducer.mutate((draft) => {
        draft.count += 1
      }),
      decrement(s) {
        return { ...s, count: s.count - 1 }
      },
    },
  })

  const AppCounterLogic = AppCounterModule.logic('app-counter-logic', ($) =>
    Effect.gen(function* () {
      yield* Effect.log('AppCounterLogic (test) setup')

      // On each increment, emit one business log + one trace:* Debug event.
      yield* $.onAction('increment').run(() =>
        Effect.gen(function* () {
          yield* Effect.log('increment dispatched from AppCounterLogic (test)')
          yield* CoreDebug.record({
            type: 'trace:increment',
            moduleId: AppCounterModule.id,
            data: { source: 'app-demo-layout-trace-suspend.test' },
          })
        }),
      )
    }),
  )

  const AppCounterProgram = Logix.Program.make(AppCounterModule, {
    initial: { count: 0 },
    logics: [AppCounterLogic],
  })

  // App-level Runtime: same as AppDemoLayout, with Debug.layer + Debug.traceLayer.
  const appRuntime = Logix.Runtime.make(AppCounterProgram, {
    layer: CoreDebug.traceLayer(CoreDebug.layer({ mode: 'dev' })) as Layer.Layer<any, never, never>,
  })

  const AppCounterView: React.FC = () => {
    const counter = useModule(AppCounterProgram, {
      suspend: true,
      key: 'app-runtime-demo-test',
      initTimeoutMs: 5_000,
    })
    const count = useSelector(counter, (s) => (s as { count: number }).count)

    return (
      <div>
        <span data-testid="count">{count}</span>
        <button type="button" onClick={() => counter.actions.increment()}>
          inc
        </button>
        <button type="button" onClick={() => counter.actions.decrement()}>
          dec
        </button>
      </div>
    )
  }

  it('should initialize and update without throwing AsyncFiberException', async () => {
    const { getByTestId, getByText } = render(
      <React.StrictMode>
        <RuntimeProvider runtime={appRuntime}>
          <React.Suspense fallback={<div>loading...</div>}>
            <AppCounterView />
          </React.Suspense>
        </RuntimeProvider>
      </React.StrictMode>,
    )

    // Initial render: after Suspense resolves, count should be 0.
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('0')
    })

    // Click inc; expect count to increment to 1.
    fireEvent.click(getByText('inc'))
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('1')
    })

    // Click dec to return to 0, proving ModuleRuntime works.
    fireEvent.click(getByText('dec'))
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('0')
    })
  })
})
