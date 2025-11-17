// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logix/react'
import { LogixDevtools } from '../../src/LogixDevtools.js'
import {
  devtoolsLayer,
  getDevtoolsSnapshot,
  clearDevtoolsEvents,
  clearDevtoolsSnapshotOverride,
} from '../../src/DevtoolsLayer.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

// A minimal Counter Module used to verify integration behavior across @logix/core + @logix/react + devtools.
const CounterModule = Logix.Module.make('DevtoolsTestCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const CounterImpl = CounterModule.implement({
  initial: { count: 0 },
  logics: [
    CounterModule.logic(($) =>
      Effect.gen(function* () {
        // Record one debug event to verify the Debug Sink receives events.
        yield* $.onAction('increment').run(() =>
          Logix.Debug.record({
            type: 'trace:increment',
            moduleId: CounterModule.id,
            data: { source: 'devtools-react.integration.test' },
          }),
        )
      }),
    ),
  ],
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'DevtoolsIntegrationRuntime',
  layer: devtoolsLayer as Layer.Layer<any, never, never>,
})

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterImpl.tag)
  const count = useSelector(runtimeHandle, (s) => s.count)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <button type="button" onClick={() => dispatch({ _tag: 'increment', payload: undefined })}>
      count: {count}
    </button>
  )
}

describe('@logix/devtools-react integration with @logix/react', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined') {
      // Add a minimal `matchMedia` polyfill for jsdom to avoid theme detection failures in DevtoolsShell.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
  })

  beforeEach(() => {
    clearDevtoolsSnapshotOverride()
    clearDevtoolsEvents()
  })

  afterEach(() => {
    clearDevtoolsSnapshotOverride()
    cleanup()
  })

  it('collects Debug events and state updates from a React-driven module', async () => {
    const { getByText } = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
      </RuntimeProvider>,
    )

    const button = getByText(/count:/i)

    // Initial state
    expect(button.textContent).toContain('count: 0')

    // Trigger one increment
    fireEvent.click(button)

    // Wait for Effect/Debug Sink to process this event and update the snapshot.
    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      expect(snapshot.events.length).toBeGreaterThan(0)

      const firstEvent = snapshot.events[0] as any
      expect(typeof firstEvent.instanceId).toBe('string')

      const state = devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any) as DevtoolsState
      const instanceId = firstEvent.instanceId as string
      expect(state.runtimes.some((r) => r.modules.some((m) => m.instances.includes(instanceId)))).toBe(true)

      expect(Array.from(snapshot.instances.keys()).some((key) => key.includes('DevtoolsIntegrationRuntime'))).toBe(true)
    })

    // Trigger two more increments to verify state:update snapshots are preserved in order on the timeline.
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      const stateUpdates = snapshot.events.filter((e) => {
        if (e.kind !== 'state' || e.label !== 'state:update') return false
        const meta = e.meta as any
        return meta && typeof meta === 'object' && 'state' in meta
      })

      // At least 3 updates (3 increments).
      expect(stateUpdates.length).toBeGreaterThanOrEqual(3)

      const counts = stateUpdates.map((e) => ((e.meta as any).state as any).count)
      // Require counts to be non-decreasing so each state:update carries its own snapshot (not overwritten to latest).
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
      }
    })
  })

  it('exposes transaction-level summary for the latest txn in Inspector', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const button = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // Trigger a few increments to produce multiple transactions and render events.
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      const stateUpdates = snapshot.events.filter((e) => e.kind === 'state' && e.label === 'state:update')
      expect(stateUpdates.length).toBeGreaterThanOrEqual(2)

      // The Devtools panel is open and the Inspector shows a Transaction Summary overview.
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
      expect(screen.getByText(/Transaction Summary/i)).not.toBeNull()
    })
  })

  it('imports EvidencePackage JSON and shows errorSummary + downgrade reason in Inspector', async () => {
    render(<LogixDevtools position="bottom-left" initialOpen={true} />)

    const protocolVersion = Logix.Observability.protocolVersion

    const evidence = {
      protocolVersion,
      runId: 'run-test',
      createdAt: 1,
      source: { host: 'test' },
      events: [
        {
          protocolVersion,
          runId: 'run-test',
          seq: 1,
          timestamp: 1,
          type: 'debug:event',
          payload: {
            eventSeq: 1,
            eventId: 'i1::e1',
            timestamp: 1,
            kind: 'lifecycle',
            label: 'lifecycle:error',
            moduleId: 'M',
            instanceId: 'i1',
            runtimeLabel: 'R',
            txnSeq: 0,
            meta: {},
            errorSummary: { name: 'Error', message: 'boom' },
            downgrade: { reason: 'non_serializable' },
          },
        },
      ],
    }

    devtoolsRuntime.runFork(
      devtoolsModuleRuntime.dispatch({
        _tag: 'importEvidenceJson',
        payload: JSON.stringify(evidence),
      }) as any,
    )

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any) as DevtoolsState
      expect(state.selectedRuntime).toBe('R')
      expect(state.selectedModule).toBe('M')
      expect(state.selectedInstance).toBe('i1')
    })

    await waitFor(() => {
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
      expect(screen.getByText(/Error Summary/i)).not.toBeNull()
      expect(screen.getAllByText(/boom/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/已降级：不可序列化/i)).not.toBeNull()
    })
  })
})
