// @vitest-environment happy-dom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Context, Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useRuntime, useSelector } from '../../src/index.js'

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

const makeBaseRuntimeWithoutTickServices = () => {
  const baseRuntime = ManagedRuntime.make(CounterModule.impl.layer as Layer.Layer<any, never, never>)
  expect(() => Logix.InternalContracts.getRuntimeStore(baseRuntime as any)).toThrow()
  return baseRuntime
}

const makeEmptyBaseRuntimeWithoutTickServices = () => {
  const baseRuntime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
  expect(() => Logix.InternalContracts.getRuntimeStore(baseRuntime as any)).toThrow()
  return baseRuntime
}

const CounterApp: React.FC = () => {
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

const CounterImplApp: React.FC = () => {
  const counter = useModule(CounterModule.impl, {
    suspend: true,
    key: 'impl:strict',
    initTimeoutMs: 5_000,
  })
  const count = useModule(counter, (s) => (s as any).count as number)

  return (
    <div>
      <div data-testid="impl-count">{count}</div>
      <button type="button" onClick={() => counter.actions.inc()}>
        ImplInc
      </button>
    </div>
  )
}

class StepConfigTag extends Context.Tag('T073.RuntimeProviderTickServices.StepConfig')<
  StepConfigTag,
  { readonly step: number }
>() {}

const BaseStepLayer = Layer.succeed(StepConfigTag, { step: 1 })
const BigStepLayer = Layer.succeed(StepConfigTag, { step: 5 })

const StepCounterPanel: React.FC<{ readonly variant: 'root' | 'nested' }> = ({ variant }) => {
  const runtime = useRuntime()
  const count = useModule(CounterDef, (s) => (s as any).count as number)

  const onInc = React.useCallback(() => {
    void runtime.runPromise(
      Effect.gen(function* () {
        const cfg = yield* StepConfigTag
        const counter = yield* CounterDef.tag
        for (let i = 0; i < cfg.step; i++) {
          yield* counter.dispatch({ _tag: 'inc', payload: undefined })
        }
      }),
    )
  }, [runtime])

  return (
    <div>
      <div data-testid={`${variant}-count`}>{count}</div>
      <button type="button" onClick={onInc}>
        {variant === 'root' ? 'RootInc' : 'NestedInc'}
      </button>
    </div>
  )
}

const CounterBatchApp: React.FC = () => {
  const runtime = useRuntime()
  const count = useModule(CounterDef, (s) => (s as any).count as number)

  const onBatch = React.useCallback(() => {
    void runtime.runPromise(
      Effect.flatMap(CounterDef.tag as any, (counter: any) =>
        counter.dispatchBatch([
          { _tag: 'inc', payload: undefined },
          { _tag: 'inc', payload: undefined },
          { _tag: 'inc', payload: undefined },
        ]),
      ),
    )
  }, [runtime])

  return (
    <div>
      <div data-testid="batch-count">{count}</div>
      <button type="button" onClick={onBatch}>
        Batch3
      </button>
    </div>
  )
}

const CounterLowPriorityApp: React.FC = () => {
  const runtime = useRuntime()
  const state = useSelector(CounterDef.tag) as any

  const onLowInc = React.useCallback(() => {
    void runtime.runPromise(
      Effect.flatMap(CounterDef.tag as any, (counter: any) =>
        counter.dispatchLowPriority({ _tag: 'inc', payload: undefined }),
      ),
    )
  }, [runtime])

  return (
    <div>
      <div data-testid="low-count">{(state as any).count as number}</div>
      <button type="button" onClick={onLowInc}>
        LowInc
      </button>
    </div>
  )
}

describe('RuntimeProvider tick services auto-binding', () => {
  it('should re-render immediately when dispatch commits state (base runtime has no tick services)', async () => {
    const baseRuntime = makeBaseRuntimeWithoutTickServices()

    render(
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterApp />
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

  it('should re-render in policy.mode=suspend when base runtime has no tick services', async () => {
    const baseRuntime = makeBaseRuntimeWithoutTickServices()

    render(
      <RuntimeProvider
        runtime={baseRuntime}
        policy={{ mode: 'suspend', syncBudgetMs: 1000 }}
        fallback={<div data-testid="fallback">loading</div>}
      >
        <CounterApp />
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

  it('should re-render in policy.mode=defer (preload tag) when base runtime has no tick services', async () => {
    const baseRuntime = makeBaseRuntimeWithoutTickServices()

    render(
      <RuntimeProvider
        runtime={baseRuntime}
        policy={{ mode: 'defer', syncBudgetMs: 1000, preload: [CounterDef.tag] }}
        fallback={<div data-testid="fallback">loading</div>}
      >
        <CounterApp />
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

  it('should re-render in StrictMode + policy.mode=suspend for keyed ModuleImpl (base runtime has no tick services)', async () => {
    const baseRuntime = makeEmptyBaseRuntimeWithoutTickServices()

    render(
      <React.StrictMode>
        <RuntimeProvider
          runtime={baseRuntime}
          policy={{ mode: 'suspend', syncBudgetMs: 1000 }}
          fallback={<div data-testid="fallback">loading</div>}
        >
          <CounterImplApp />
        </RuntimeProvider>
      </React.StrictMode>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('impl-count').textContent).toBe('0')
    })

    fireEvent.click(screen.getByRole('button', { name: 'ImplInc' }))

    await waitFor(() => {
      expect(screen.getByTestId('impl-count').textContent).toBe('1')
    })
  })

  it('should apply RuntimeProvider.layer overrides and still re-render immediately (LayerOverrideDemoLayout-like)', async () => {
    const baseRuntime = makeBaseRuntimeWithoutTickServices()

    render(
      <RuntimeProvider
        runtime={baseRuntime}
        layer={BaseStepLayer}
        policy={{ mode: 'suspend', syncBudgetMs: 1000 }}
        fallback={<div data-testid="fallback">loading</div>}
      >
        <StepCounterPanel variant="root" />
        <RuntimeProvider layer={BigStepLayer}>
          <StepCounterPanel variant="nested" />
        </RuntimeProvider>
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('root-count').textContent).toBe('0')
      expect(screen.getByTestId('nested-count').textContent).toBe('0')
    })

    fireEvent.click(screen.getByRole('button', { name: 'RootInc' }))

    await waitFor(() => {
      expect(screen.getByTestId('root-count').textContent).toBe('1')
      expect(screen.getByTestId('nested-count').textContent).toBe('1')
    })

    fireEvent.click(screen.getByRole('button', { name: 'NestedInc' }))

    await waitFor(() => {
      expect(screen.getByTestId('root-count').textContent).toBe('6')
      expect(screen.getByTestId('nested-count').textContent).toBe('6')
    })
  })

  it('should re-render for dispatchBatch (base runtime has no tick services)', async () => {
    const baseRuntime = makeBaseRuntimeWithoutTickServices()

    render(
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterBatchApp />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('batch-count').textContent).toBe('0')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Batch3' }))

    await waitFor(() => {
      expect(screen.getByTestId('batch-count').textContent).toBe('3')
    })
  })

  it('should re-render for dispatchLowPriority (base runtime has no tick services)', async () => {
    const baseRuntime = makeBaseRuntimeWithoutTickServices()

    render(
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterLowPriorityApp />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('low-count').textContent).toBe('0')
    })

    fireEvent.click(screen.getByRole('button', { name: 'LowInc' }))

    await waitFor(() => {
      expect(screen.getByTestId('low-count').textContent).toBe('1')
    })
  })
})
