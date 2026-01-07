import React from 'react'
import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as LogixTest from '@logix/test'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

describe('TickScheduler yield-to-host (React integration)', () => {
  it('should allow React to commit local updates while tick continues on a macrotask boundary; Source->Target remains consistent', async () => {
    Logix.Debug.clearDevtoolsEvents()

    const TargetState = Schema.Struct({ fromSource: Schema.Number })

    const Source = Logix.Module.make('T063.YieldToHost.Source', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { set: Schema.Number },
      reducers: {
        set: Logix.Module.Reducer.mutate((draft, payload: number) => {
          ;(draft as any).value = payload
        }),
      },
    })

    const SourceValueRead = Logix.ReadQuery.make({
      selectorId: 'rq_yield_to_host_source_value',
      debugKey: 'YieldToHost.Source.value',
      reads: ['value'],
      select: (s: { readonly value: number }) => s.value,
      equalsKind: 'objectIs',
    })

    const Target = Logix.Module.make('T063.YieldToHost.Target', {
      state: TargetState,
      actions: {},
      traits: Logix.StateTrait.from(TargetState)({
        fromSource: Logix.StateTrait.externalStore({
          store: Logix.ExternalStore.fromModule(Source, SourceValueRead),
        }),
      }),
    })

    const Noise = Logix.Module.make('T063.YieldToHost.Noise', {
      state: Schema.Struct({ n: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          ;(draft as any).n += 1
        }),
      },
    })

    const TargetImpl = Target.implement({
      initial: { fromSource: 0 },
      imports: [Source.implement({ initial: { value: 0 } }).impl],
    })
    const NoiseImpl = Noise.implement({ initial: { n: 0 } })

    const Root = Logix.Module.make('T063.YieldToHost.Root', { state: Schema.Void, actions: {} })
    const RootImpl = Root.implement({
      initial: undefined,
      imports: [TargetImpl.impl, NoiseImpl.impl],
    })

    const hostScheduler = LogixTest.Act.makeTestHostScheduler()
    const hostLayer = LogixTest.Act.testHostSchedulerLayer(hostScheduler)
    const tickLayer = LogixTest.Act.tickSchedulerTestLayer({
      maxSteps: 1,
      urgentStepCap: 64,
      maxDrainRounds: 4,
      microtaskChainDepthLimit: 32,
    }).pipe(Layer.provide(hostLayer))

    const runtime = Logix.Runtime.make(RootImpl, {
      devtools: { diagnosticsLevel: 'light' },
      layer: Layer.mergeAll(hostLayer, tickLayer, Layer.empty) as Layer.Layer<any, never, never>,
    })

    const runtimeStore = Logix.InternalContracts.getRuntimeStore(runtime) as unknown as { readonly getTickSeq: () => number }

    const metrics = {
      source: undefined as any,
      noise1: undefined as any,
      noise2: undefined as any,
      history: [] as Array<{ readonly tickSeq: number; readonly source: number; readonly target: number; readonly local: number }>,
    }

    const App: React.FC = () => {
      const source = useModule(Source.tag) as any
      const target = useModule(Target.tag) as any
      const noise1 = useModule(NoiseImpl.impl, { key: 'n1' }) as any
      const noise2 = useModule(NoiseImpl.impl, { key: 'n2' }) as any

      const [local, setLocal] = React.useState(0)

      React.useEffect(() => {
        metrics.source = source
        metrics.noise1 = noise1.runtime
        metrics.noise2 = noise2.runtime
      }, [source, noise1, noise2])

      const sourceValue = useModule(source, (s) => (s as any).value as number)
      const targetValue = useModule(target, (s) => (s as any).fromSource as number)

      React.useEffect(() => {
        metrics.history.push({ tickSeq: runtimeStore.getTickSeq(), source: sourceValue, target: targetValue, local })
      }, [sourceValue, targetValue, local])

      return (
        <div>
          <p>Tick: {runtimeStore.getTickSeq()}</p>
          <p>Source: {sourceValue}</p>
          <p>Target: {targetValue}</p>
          <p>Local: {local}</p>
          <button type="button" onClick={() => setLocal((x) => x + 1)}>
            LocalInc
          </button>
        </div>
      )
    }

    const view = render(
      <RuntimeProvider runtime={runtime}>
        <App />
      </RuntimeProvider>,
    )

    try {
      await waitFor(() => {
        expect(screen.getByText('Source: 0')).toBeTruthy()
        expect(screen.getByText('Target: 0')).toBeTruthy()
      })

      await waitFor(() => {
        expect(metrics.noise1).toBeDefined()
        expect(metrics.noise2).toBeDefined()
        expect(metrics.source).toBeDefined()
      })

      // Enqueue: two non-urgent commits (forces budget defer with maxSteps=1) + one urgent Source update (must settle into Target).
      await runtime.runPromise((metrics.noise1 as any).dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))
      await runtime.runPromise((metrics.noise2 as any).dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))
      ;(metrics.source as any).actions.set(1)

      // Run the first tick (microtask boundary) but keep the forced continuation (macrotask) pending.
      await runtime.runPromise(
        Effect.gen(function* () {
          yield* Effect.sync(() => {
            hostScheduler.flushMicrotasks()
          })
          yield* Effect.yieldNow()
        }) as any,
      )

      expect(hostScheduler.getQueueSize().macrotasks).toBeGreaterThan(0)

      // React should be able to commit a local state update before the continuation runs.
      fireEvent.click(screen.getByRole('button', { name: 'LocalInc' }))
      await waitFor(() => {
        expect(screen.getByText('Local: 1')).toBeTruthy()
      })

      // Drain the rest of the host tasks (including the forced macrotask tick continuation).
      await runtime.runPromise(LogixTest.Act.flushAllHostScheduler(hostScheduler) as any)

      await waitFor(() => {
        expect(screen.getByText('Source: 1')).toBeTruthy()
        expect(screen.getByText('Target: 1')).toBeTruthy()
      })

      // Evidence: we should have started at least one tick on a macrotask boundary due to budget deferral.
      const events = Logix.Debug.getDevtoolsSnapshot().events
      const forced = events
        .filter((e) => e.label === 'trace:tick')
        .map((e) => (e.meta ?? {}) as any)
        .filter((m) => m.phase === 'start')
        .find((m) => m.schedule?.forcedMacrotask && m.schedule?.reason === 'budget')

      expect(forced).toBeTruthy()

      // No tearing for the Source->Target chain: they should always match in React commits (tickSeq as the anchor).
      expect(metrics.history.length).toBeGreaterThan(0)
      expect(metrics.history.some((e) => e.source !== e.target)).toBe(false)
    } finally {
      view.unmount()
      await runtime.dispose()
    }
  })
})
