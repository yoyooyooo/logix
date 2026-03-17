import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { Duration, Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'

const AsyncPreloadState = Schema.Struct({ count: Schema.Number })
const AsyncPreloadActions = { inc: Schema.Void }

const AsyncPreloadModule = Logix.Module.make('RuntimeProviderDeferPreloadPlan.AsyncModule', {
  state: AsyncPreloadState,
  actions: AsyncPreloadActions,
})

const BaseAsyncPreloadImpl = AsyncPreloadModule.implement({
  initial: { count: 0 },
  logics: [],
}).impl

describe('RuntimeProvider defer preload plan', () => {
  it('builds preload factory plan once across render and effect for the same async ModuleImpl handle', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    let layerAccessCount = 0

    const InstrumentedAsyncImpl = new Proxy(BaseAsyncPreloadImpl, {
      get(target, prop, receiver) {
        if (prop === 'layer') {
          layerAccessCount += 1
          const moduleService = Reflect.get(target, 'module', receiver) as any
          return Layer.effect(
            moduleService,
            Effect.sleep(Duration.millis(1)).pipe(
              Effect.as({
                instanceId: `async-preload-${layerAccessCount}`,
              } as any),
            ),
          )
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as typeof BaseAsyncPreloadImpl

    const App = () => <div data-testid="ready">ready</div>

    let unmount: (() => void) | undefined
    await act(async () => {
      const view = render(
        <RuntimeProvider
          runtime={runtime}
          policy={{ mode: 'defer', syncBudgetMs: 1000, preload: [InstrumentedAsyncImpl] }}
          fallback={<div data-testid="fallback">fallback</div>}
        >
          <App />
        </RuntimeProvider>,
      )
      unmount = view.unmount
    })

    await waitFor(() => {
      expect(screen.getByTestId('ready').textContent).toBe('ready')
    })

    expect(layerAccessCount).toBe(1)

    await act(async () => {
      unmount?.()
      await runtime.dispose()
    })
  })
})
