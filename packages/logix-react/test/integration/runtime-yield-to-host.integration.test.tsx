import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import React from 'react'
import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'
import { useProgramRuntimeBlueprint } from '../../src/internal/hooks/useProgramRuntimeBlueprint.js'

const flushAllHostScheduler = (
  scheduler: RuntimeContracts.DeterministicHostScheduler,
  options?: { readonly maxTurns?: number; readonly settleYields?: number },
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const maxTurns = options?.maxTurns ?? 1_000
    const settleYields = options?.settleYields ?? 8

    for (let turn = 0; turn < maxTurns; turn += 1) {
      yield* Effect.sync(() => {
        scheduler.flushAll({ maxTurns })
      })

      yield* Effect.yieldNow

      const { microtasks, macrotasks } = scheduler.getQueueSize()
      if (microtasks !== 0 || macrotasks !== 0) {
        continue
      }

      for (let i = 0; i < settleYields; i += 1) {
        yield* Effect.yieldNow
      }

      const after = scheduler.getQueueSize()
      if (after.microtasks === 0 && after.macrotasks === 0) {
        return
      }
    }

    const { microtasks, macrotasks } = scheduler.getQueueSize()
    throw new Error(
      `[runtime-yield-to-host.flushAllHostScheduler] Exceeded maxTurns=${maxTurns} (microtasks=${microtasks}, macrotasks=${macrotasks}).`,
    )
  }).pipe(Effect.asVoid)

describe('TickScheduler yield-to-host (React integration)', () => {
  it('should allow React to commit local updates while tick continues on a macrotask boundary; Source->Target remains consistent', async () => {
    CoreDebug.clearDevtoolsEvents()

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

    const SourceValueRead = RuntimeContracts.Selector.make({
      selectorId: 'rq_yield_to_host_source_value',
      debugKey: 'YieldToHost.Source.value',
      reads: ['value'],
      select: (s: { readonly value: number }) => s.value,
      equalsKind: 'objectIs',
    })

    const Target = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('T063.YieldToHost.Target', {
  state: TargetState,
  actions: {}
}), FieldContracts.fieldFrom(TargetState)({
        fromSource: FieldContracts.fieldExternalStore({
          store: RuntimeContracts.ExternalInput.fromModule(Source, SourceValueRead),
        }),
      }))

    const Noise = Logix.Module.make('T063.YieldToHost.Noise', {
      state: Schema.Struct({ n: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          ;(draft as any).n += 1
        }),
      },
    })

    const SourceProgram = Logix.Program.make(Source, {
      initial: { value: 0 },
    })
    const TargetProgram = Logix.Program.make(Target, {
      initial: { fromSource: 0 },
      capabilities: {
        imports: [SourceProgram],
      },
    })
    const NoiseProgram = Logix.Program.make(Noise, { initial: { n: 0 } })
    const NoiseBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(NoiseProgram)

    const Root = Logix.Module.make('T063.YieldToHost.Root', { state: Schema.Void, actions: {} })
    const RootProgram = Logix.Program.make(Root, {
      initial: undefined,
      capabilities: {
        imports: [TargetProgram],
      },
    })

    const hostScheduler = RuntimeContracts.makeDeterministicHostScheduler()

    const tickLayer = RuntimeContracts.tickSchedulerTestLayer({
      maxSteps: 1,
      urgentStepCap: 64,
      maxDrainRounds: 4,
      microtaskChainDepthLimit: 32,
    })

    const runtime = Logix.Runtime.make(RootProgram, {
      hostScheduler,
      devtools: { diagnosticsLevel: 'light' },
      layer: tickLayer,
    })

    const runtimeStore = RuntimeContracts.getRuntimeStore(runtime) as unknown as { readonly getTickSeq: () => number }

    const metrics = {
      source: undefined as any,
      noise1: undefined as any,
      noise2: undefined as any,
      history: [] as Array<{ readonly tickSeq: number; readonly source: number; readonly target: number; readonly local: number }>,
    }

    const App: React.FC = () => {
      const source = useModule(Source.tag) as any
      const target = useModule(Target.tag) as any
      const noise1 = useProgramRuntimeBlueprint(NoiseBlueprint, { key: 'n1' }) as any
      const noise2 = useProgramRuntimeBlueprint(NoiseBlueprint, { key: 'n2' }) as any

      const [local, setLocal] = React.useState(0)

      React.useEffect(() => {
        metrics.source = source
        metrics.noise1 = noise1.runtime
        metrics.noise2 = noise2.runtime
      }, [source, noise1, noise2])

      const sourceValue = useSelector(source, (s) => (s as any).value as number)
      const targetValue = useSelector(target, (s) => (s as any).fromSource as number)

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

      expect(metrics.noise1.instanceId).not.toBe(metrics.noise2.instanceId)

      // Enqueue: two non-urgent commits (forces budget defer with maxSteps=1) + one urgent Source update (must settle into Target).
      runtime.runFork((metrics.noise1 as any).dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))
      runtime.runFork((metrics.noise2 as any).dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))
      ;(metrics.source as any).actions.set(1)

      // Run the first tick (microtask boundary) but keep the forced continuation (macrotask) pending.
        await runtime.runPromise(
          Effect.gen(function* () {
            yield* Effect.sync(() => {
              hostScheduler.flushMicrotasks()
            })
            yield* Effect.yieldNow
          }) as any,
        )

      // React should be able to commit a local state update before the continuation runs.
      fireEvent.click(screen.getByRole('button', { name: 'LocalInc' }))
      await waitFor(() => {
        expect(screen.getByText('Local: 1')).toBeTruthy()
      })

      // Drain the rest of the host tasks (including the forced macrotask tick continuation).
      await runtime.runPromise(flushAllHostScheduler(hostScheduler) as any)

      await waitFor(() => {
        expect(screen.getByText('Source: 1')).toBeTruthy()
        expect(screen.getByText('Target: 1')).toBeTruthy()
      })

      // Evidence: we should have started at least one tick on a macrotask boundary due to budget deferral.
      const events = CoreDebug.getDevtoolsSnapshot().events
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
