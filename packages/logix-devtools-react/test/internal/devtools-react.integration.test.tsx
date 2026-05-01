import * as CoreEvidence from '@logixjs/core/repo-internal/evidence-api'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logixjs/react'
import { LogixDevtools } from '../../src/internal/ui/shell/LogixDevtools.js'
import {
  getDevtoolsSnapshot,
  clearDevtoolsEvents,
  clearDevtoolsSnapshotOverride,
} from '../../src/internal/snapshot/index.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

// A minimal Counter Module used to verify integration behavior across @logixjs/core + @logixjs/react + devtools.
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

const CounterProgram = Logix.Program.make(CounterModule, {
  initial: { count: 0 },
  logics: [
    CounterModule.logic('counter-increment-trace', ($) =>
      Effect.gen(function* () {
        // Record one debug event to verify the Debug Sink receives events.
        yield* $.onAction('increment').run(() =>
          CoreDebug.record({
            type: 'trace:increment',
            moduleId: CounterModule.id,
            data: { source: 'devtools-react.integration.test' },
          }),
        )
      }),
    ),
  ],
})

const runtime = Logix.Runtime.make(CounterProgram, {
  label: 'DevtoolsIntegrationRuntime',
  layer: CoreDebug.devtoolsHubLayer() as Layer.Layer<any, never, never>,
})

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterProgram.tag)
  const count = useSelector(runtimeHandle, (s) => s.count)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <button type="button" onClick={() => dispatch({ _tag: 'increment', payload: undefined })}>
      count: {count}
    </button>
  )
}

const waitForStartup = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 20)
  })

const refreshDevtoolsState = async () => {
  await devtoolsRuntime.runPromise(devtoolsModuleRuntime.dispatch({ _tag: 'toggleOpen', payload: undefined }) as any)
  await devtoolsRuntime.runPromise(devtoolsModuleRuntime.dispatch({ _tag: 'toggleOpen', payload: undefined }) as any)
}

describe('@logixjs/devtools-react integration with @logixjs/react', () => {
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
    await waitForStartup()

    // Trigger one increment
    fireEvent.click(button)
    await refreshDevtoolsState()

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
    await refreshDevtoolsState()

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

      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
    })

    fireEvent.click(screen.getAllByRole('button', { name: /^inspector$/i })[0] as HTMLButtonElement)

    await waitFor(() => {
      expect(screen.getByText(/Transaction Summary/i)).not.toBeNull()
    })
  })

  it('imports EvidencePackage JSON and shows errorSummary + downgrade reason in Inspector', async () => {
    render(<LogixDevtools position="bottom-left" initialOpen={true} />)

    const protocolVersion = CoreEvidence.protocolVersion

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

    fireEvent.click(screen.getAllByRole('button', { name: /^inspector$/i })[0] as HTMLButtonElement)

    await waitFor(() => {
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
      expect(screen.getByText(/Error Summary/i)).not.toBeNull()
      expect(screen.getAllByText(/boom/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Degraded:\s*Not serializable/i)).not.toBeNull()
    })
  })

  it('materializes dirty rootPaths from canonical staticIrDigest + staticIrByDigest.fieldPaths on evidence import', async () => {
    render(<LogixDevtools position="bottom-left" initialOpen={true} />)

    const protocolVersion = CoreEvidence.protocolVersion
    const digest = 'digest-light-1'

    const evidence = {
      protocolVersion,
      runId: 'run-root-paths',
      createdAt: 2,
      source: { host: 'test' },
      summary: {
        converge: {
          staticIrByDigest: {
            [digest]: {
              fieldPaths: [['profile'], ['profile', 'name']],
            },
          },
        },
      },
      events: [
        {
          protocolVersion,
          runId: 'run-root-paths',
          seq: 1,
          timestamp: 2,
          type: 'debug:event',
          payload: {
            eventSeq: 1,
            eventId: 'i1::e1',
            timestamp: 2,
            kind: 'state',
            label: 'state:update',
            moduleId: 'M',
            instanceId: 'i1',
            runtimeLabel: 'R',
            txnSeq: 1,
            txnId: 'txn-1',
            meta: {
              staticIrDigest: digest,
              dirtySet: {
                dirtyAll: false,
                pathIds: [1],
                pathCount: 1,
                keySize: 1,
                keyHash: 123,
                pathIdsTruncated: false,
              },
            },
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
      const snapshot = getDevtoolsSnapshot()
      const imported = snapshot.events.find((event) => event.kind === 'state' && event.label === 'state:update') as any
      expect(imported).toBeDefined()

      const rootPaths = imported?.meta?.dirtySet?.rootPaths as any
      expect(Array.isArray(rootPaths)).toBe(true)
      expect(rootPaths).toEqual([['profile', 'name']])
    })
  })

  it('strips payload historical rootPaths and keeps id-first when digest is missing or not matched', async () => {
    render(<LogixDevtools position="bottom-left" initialOpen={true} />)

    const protocolVersion = CoreEvidence.protocolVersion
    const evidence = {
      protocolVersion,
      runId: 'run-root-paths-miss',
      createdAt: 3,
      source: { host: 'test' },
      summary: {
        converge: {
          staticIrByDigest: {
            digest_available: {
              fieldPaths: [['a']],
            },
          },
        },
      },
      events: [
        {
          protocolVersion,
          runId: 'run-root-paths-miss',
          seq: 1,
          timestamp: 3,
          type: 'debug:event',
          payload: {
            eventSeq: 1,
            eventId: 'i1::e2',
            timestamp: 3,
            kind: 'state',
            label: 'state:update',
            moduleId: 'M',
            instanceId: 'i1',
            runtimeLabel: 'R',
            txnSeq: 2,
            txnId: 'txn-2',
            meta: {
              dirtySet: {
                dirtyAll: false,
                rootIds: [0],
                rootCount: 1,
                keySize: 1,
                keyHash: 456,
                rootIdsTruncated: false,
                rootPaths: [['historical', 'state']],
              },
            },
          },
        },
        {
          protocolVersion,
          runId: 'run-root-paths-miss',
          seq: 2,
          timestamp: 4,
          type: 'debug:event',
          payload: {
            eventSeq: 2,
            eventId: 'i1::e3',
            timestamp: 4,
            kind: 'field:converge',
            label: 'trace:field:converge',
            moduleId: 'M',
            instanceId: 'i1',
            runtimeLabel: 'R',
            txnSeq: 3,
            txnId: 'txn-3',
            meta: {
              staticIrDigest: 'digest_missing',
              dirty: {
                dirtyAll: false,
                rootIds: [0],
                rootIdsTruncated: false,
                rootPaths: [['historical', 'trait']],
              },
            },
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
      const snapshot = getDevtoolsSnapshot()
      const importedState = snapshot.events.find(
        (event) => event.kind === 'state' && event.label === 'state:update',
      ) as any
      expect(importedState).toBeDefined()
      expect(importedState?.meta?.dirtySet?.rootPaths).toBeUndefined()

      const importedTrait = snapshot.events.find((event) => event.kind === 'field:converge') as any
      expect(importedTrait).toBeDefined()
      expect(importedTrait?.meta?.dirty?.rootPaths).toBeUndefined()
    })
  })

  it('materializes field:converge dirty.rootPaths on evidence import', async () => {
    render(<LogixDevtools position="bottom-left" initialOpen={true} />)

    const protocolVersion = CoreEvidence.protocolVersion
    const digest = 'digest-trait-1'
    const evidence = {
      protocolVersion,
      runId: 'run-trait-root-paths',
      createdAt: 4,
      source: { host: 'test' },
      summary: {
        converge: {
          staticIrByDigest: {
            [digest]: {
              fieldPaths: [['profile'], ['profile', 'email']],
            },
          },
        },
      },
      events: [
        {
          protocolVersion,
          runId: 'run-trait-root-paths',
          seq: 1,
          timestamp: 4,
          type: 'debug:event',
          payload: {
            eventSeq: 1,
            eventId: 'i1::e3',
            timestamp: 4,
            kind: 'field:converge',
            label: 'trace:field:converge',
            moduleId: 'M',
            instanceId: 'i1',
            runtimeLabel: 'R',
            txnSeq: 3,
            txnId: 'txn-3',
            meta: {
              staticIrDigest: digest,
              dirty: {
                dirtyAll: false,
                rootIds: [1],
                rootIdsTruncated: false,
              },
            },
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
      const snapshot = getDevtoolsSnapshot()
      const imported = snapshot.events.find((event) => event.kind === 'field:converge') as any
      expect(imported).toBeDefined()
      expect(imported?.meta?.dirty?.rootPaths).toEqual([['profile', 'email']])
    })
  })
})
