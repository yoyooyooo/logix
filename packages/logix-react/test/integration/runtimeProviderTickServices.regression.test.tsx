// @vitest-environment happy-dom
import React from 'react'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Effect, Layer, ManagedRuntime, Schema, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import { fieldValue, RuntimeProvider, useModule, useRuntime, useSelector } from '../../src/index.js'
import { useProgramRuntimeBlueprint } from '../../src/internal/hooks/useProgramRuntimeBlueprint.js'

const CounterDef = Logix.Module.make('T073.RuntimeProviderTickServices.Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterLogic = CounterDef.logic('counter-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').mutate((s) => {
      ;(s as any).count += 1
    })
  }),
)

const CounterProgram = Logix.Program.make(CounterDef, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

const makeBaseRuntimeWithoutTickServices = () => {
  const baseRuntime = ManagedRuntime.make(RuntimeContracts.getProgramRuntimeBlueprint(CounterProgram).layer as Layer.Layer<any, never, never>)
  expect(() => RuntimeContracts.getRuntimeStore(baseRuntime as any)).toThrow()
  return baseRuntime
}

const makeEmptyBaseRuntimeWithoutTickServices = () => {
  const baseRuntime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
  expect(() => RuntimeContracts.getRuntimeStore(baseRuntime as any)).toThrow()
  return baseRuntime
}

const CounterApp: React.FC = () => {
  const runtime = useRuntime()
  const count = useSelector(CounterDef.tag, (s) => (s as any).count as number)

  const onInc = React.useCallback(() => {
    void runtime.runPromise(
      Effect.flatMap(Effect.service(CounterDef.tag).pipe(Effect.orDie) as any, (counter: any) =>
        counter.dispatch({ _tag: 'inc', payload: undefined }),
      ),
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

const CounterProgramApp: React.FC = () => {
  const counter = useProgramRuntimeBlueprint(RuntimeContracts.getProgramRuntimeBlueprint(CounterProgram), {
    suspend: true,
    key: 'program:strict',
    initTimeoutMs: 5_000,
  })
  const count = useSelector(counter, (s) => (s as any).count as number)

  return (
    <div>
      <div data-testid="program-count">{count}</div>
      <button type="button" onClick={() => counter.dispatchers.inc()}>
        ProgramInc
      </button>
    </div>
  )
}

class StepConfigTag extends ServiceMap.Service<
  StepConfigTag,
  { readonly step: number }
>()('T073.RuntimeProviderTickServices.StepConfig') {}

const BaseStepLayer = Layer.succeed(StepConfigTag, { step: 1 })
const BigStepLayer = Layer.succeed(StepConfigTag, { step: 5 })

const StepCounterPanel: React.FC<{ readonly variant: 'root' | 'nested' }> = ({ variant }) => {
  const runtime = useRuntime()
  const count = useSelector(CounterDef.tag, (s) => (s as any).count as number)

  const onInc = React.useCallback(() => {
    void runtime.runPromise(
      Effect.gen(function* () {
        const cfg = yield* Effect.service(StepConfigTag).pipe(Effect.orDie)
        const counter = yield* Effect.service(CounterDef.tag).pipe(Effect.orDie)
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
  const count = useSelector(CounterDef.tag, (s) => (s as any).count as number)

  const onBatch = React.useCallback(() => {
    void runtime.runPromise(
      Effect.flatMap(Effect.service(CounterDef.tag).pipe(Effect.orDie) as any, (counter: any) =>
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
  const count = useSelector(CounterDef.tag, fieldValue('count')) as number

  const onLowInc = React.useCallback(() => {
    void runtime.runPromise(
      Effect.flatMap(Effect.service(CounterDef.tag).pipe(Effect.orDie) as any, (counter: any) =>
        counter.dispatchLowPriority({ _tag: 'inc', payload: undefined }),
      ),
    )
  }, [runtime])

  return (
    <div>
      <div data-testid="low-count">{count}</div>
      <button type="button" onClick={onLowInc}>
        LowInc
      </button>
    </div>
  )
}

describe('React host adapter tick services auto-binding', () => {
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

  it('should re-render in StrictMode + policy.mode=suspend for keyed ProgramRuntimeBlueprint (base runtime has no tick services)', async () => {
    const baseRuntime = makeEmptyBaseRuntimeWithoutTickServices()

    render(
      <React.StrictMode>
        <RuntimeProvider
          runtime={baseRuntime}
          policy={{ mode: 'suspend', syncBudgetMs: 1000 }}
          fallback={<div data-testid="fallback">loading</div>}
        >
        <CounterProgramApp />
        </RuntimeProvider>
      </React.StrictMode>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('program-count').textContent).toBe('0')
    })

    fireEvent.click(screen.getByRole('button', { name: 'ProgramInc' }))

    await waitFor(() => {
      expect(screen.getByTestId('program-count').textContent).toBe('1')
    })
  })

  it('should apply subtree layer overrides and still re-render immediately (LayerOverrideDemoLayout-like)', async () => {
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
