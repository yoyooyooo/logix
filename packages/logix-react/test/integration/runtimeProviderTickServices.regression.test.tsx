// @vitest-environment happy-dom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useRuntime } from '../../src/index.js'

describe('RuntimeProvider tick services auto-binding', () => {
  it('should re-render immediately when dispatch commits state (base runtime has no tick services)', async () => {
    const CounterDef = Logix.Module.make('T073.RuntimeProviderTickServices.Counter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const CounterLogic = CounterDef.logic(($) => ({
      setup: Effect.void,
      run: Effect.gen(function* () {
        yield* $.onAction('inc').mutate((s) => {
          ;(s as any).count += 1
        })
      }),
    }))

    const CounterModule = CounterDef.implement({
      initial: { count: 0 },
      logics: [CounterLogic],
    })

    const baseRuntime = ManagedRuntime.make(CounterModule.impl.layer as Layer.Layer<any, never, never>)
    expect(() => Logix.InternalContracts.getRuntimeStore(baseRuntime as any)).toThrow()

    const App: React.FC = () => {
      const runtime = useRuntime()
      const count = useModule(CounterDef, (s) => (s as any).count as number)

      const onInc = React.useCallback(() => {
        void runtime.runPromise(
          Effect.flatMap(CounterDef.tag as any, (counter: any) => counter.dispatch({ _tag: 'inc', payload: undefined })),
        )
      }, [runtime])

      return (
        <div>
          <div data-testid="count">{count}</div>
          <button type="button" onClick={onInc}>
            Inc
          </button>
        </div>
      )
    }

    render(
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Inc' }))

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1')
    })
  })
})
