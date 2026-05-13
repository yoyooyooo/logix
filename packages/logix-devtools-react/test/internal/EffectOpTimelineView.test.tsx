import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useDispatch, useRuntime, useSelector } from '@logixjs/react'
import { LogixDevtools } from '../../src/internal/ui/shell/LogixDevtools.js'
import { clearDevtoolsEvents, clearDevtoolsSnapshotOverride } from '../../src/internal/snapshot/index.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'
import { emptyDevtoolsState } from '../../src/internal/state/model.js'

// jsdom does not provide a stable `matchMedia` by default; add a minimal polyfill for tests
// to avoid DevtoolsShell theme detection throwing outside a browser environment.
if (typeof window !== 'undefined') {
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

const dispatchDevtools = async (action: any) => {
  await devtoolsRuntime.runPromise(devtoolsModuleRuntime.dispatch(action) as Effect.Effect<any, any, any>)
}

beforeEach(async () => {
  clearDevtoolsSnapshotOverride()
  clearDevtoolsEvents()

  await dispatchDevtools({
    _tag: 'updateSettings',
    payload: {
      mode: 'deep',
      showFieldEvents: true,
      showReactRenderEvents: true,
      sampling: { reactRenderSampleRate: 1 },
    },
  })
})

afterEach(async () => {
  cleanup()
  clearDevtoolsSnapshotOverride()
  clearDevtoolsEvents()
  await devtoolsRuntime.runPromise(devtoolsModuleRuntime.setState(emptyDevtoolsState as any) as any)
})

// A minimal Counter Module used to drive the Devtools timeline and produce EffectOp / Debug events.
const DEFERRED_STEPS = 64
const counterFields: Record<string, Schema.Top> = { count: Schema.Number }
for (let i = 0; i < DEFERRED_STEPS; i++) {
  counterFields[`d${i}`] = Schema.Number
}
type CounterState = { count: number } & Record<string, number>
const CounterStateSchema = Schema.Struct(counterFields) as unknown as Schema.Schema<CounterState>

const counterTraits: Record<string, any> = {}
for (let i = 0; i < DEFERRED_STEPS; i++) {
  const key = `d${i}`
  counterTraits[key] = FieldContracts.fieldComputed({
    deps: ['count'] as any,
    get: (count: any) => (count as number) + i,
    scheduling: 'deferred',
  } as any)
}

const CounterModule = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('DevtoolsTimelineCounter', {
  state: CounterStateSchema,
  actions: {
    increment: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  }
}), FieldContracts.fieldFrom(CounterStateSchema as any)(counterTraits as any))

const CounterProgram = Logix.Program.make(CounterModule, {
  initial: {
    count: 0,
    ...Object.fromEntries(Array.from({ length: DEFERRED_STEPS }, (_, i) => [`d${i}`, i])),
  } as CounterState,
  logics: [
    CounterModule.logic('counter-increment-trace', ($) =>
      Effect.gen(function* () {
        // Record a visible trace event via DebugSink so it's easy to locate in the timeline.
        yield* $.onAction('increment').run(() =>
          CoreDebug.record({
            type: 'trace:increment',
            moduleId: CounterModule.id,
            data: { source: 'EffectOpTimelineView.test' },
          }),
        )
      }),
    ),
  ],
})

const makeRuntime = () =>
  Logix.Runtime.make(CounterProgram, {
    label: 'DevtoolsTimelineRuntime',
    layer: CoreDebug.devtoolsHubLayer() as Layer.Layer<any, never, never>,
    stateTransaction: {
      fieldConvergeMode: 'dirty',
      fieldConvergeBudgetMs: 100_000,
      fieldConvergeDecisionBudgetMs: 100_000,
      fieldConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
      txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
    },
  })

const waitForStartup = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 20)
  })

const refreshDevtoolsState = async () => {
  await devtoolsRuntime.runPromise(devtoolsModuleRuntime.dispatch({ _tag: 'toggleOpen', payload: undefined }) as any)
  await devtoolsRuntime.runPromise(devtoolsModuleRuntime.dispatch({ _tag: 'toggleOpen', payload: undefined }) as any)
}

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterProgram.tag)
  const count = useSelector(runtimeHandle, (s) => s.count)
  const dispatch = useDispatch(runtimeHandle)
  const runtimeBase = useRuntime()

  React.useEffect(() => {
    runtimeBase.runFork(
      CoreDebug.record({
        type: 'trace:react-render',
        moduleId: runtimeHandle.runtime.moduleId,
        instanceId: runtimeHandle.runtime.instanceId,
        data: {
          componentLabel: 'CounterView',
          strictModePhase: 'commit',
        },
      }) as Effect.Effect<void, never, never>,
    )
  })

  return (
    <button type="button" onClick={() => dispatch({ _tag: 'increment', payload: undefined })}>
      count: {count}
    </button>
  )
}

describe('@logixjs/devtools-react · EffectOpTimelineView & Inspector behavior', () => {
  it('shows latest event details by default, and toggles to selected event details on click', async () => {
    const runtime = makeRuntime()

    try {
      render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    await waitForStartup()

    // Trigger multiple increments to ensure the timeline contains multiple events.
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    await refreshDevtoolsState()

    // Wait for the Devtools panel to render and for the Inspector to show "Latest Event" details.
    await waitFor(() => {
      // The panel title appearing means the panel is open.
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
      expect(screen.getByLabelText('SelectedSessionWorkbench')).not.toBeNull()
    })

    // Wait for the DevtoolsModule to derive timeline data.
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    const stateAfterEvents = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
    ) as DevtoolsState
    const lastEntry = stateAfterEvents.timeline[stateAfterEvents.timeline.length - 1]
    const lastRef = lastEntry.event as CoreDebug.RuntimeDebugEventRef
    const targetLabel = lastRef.label

    // Find the corresponding event row in the timeline and click to select it.
    fireEvent.click(screen.getAllByRole('button', { name: /^timeline$/i })[0] as HTMLButtonElement)
    let eventRow: HTMLElement | undefined
    await waitFor(() => {
      const rows = screen.getAllByRole('button', {
        name: new RegExp(targetLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      })
      expect(rows.length).toBeGreaterThan(0)
      eventRow = rows[0] as HTMLElement
    })
    if (!eventRow) {
      throw new Error('Timeline event row not found')
    }
    fireEvent.click(eventRow)
    fireEvent.click(screen.getAllByRole('button', { name: /^inspector$/i })[0] as HTMLButtonElement)

    // The Inspector should switch to the "Selected Event" view.
    await waitFor(() => {
      expect(screen.getByText(/Selected Event/i)).not.toBeNull()
    })

    // Click the same row again to clear selection and return to "Latest Event" mode.
    fireEvent.click(screen.getAllByRole('button', { name: /^timeline$/i })[0] as HTMLButtonElement)
    let rowForClear: HTMLElement | undefined
    await waitFor(() => {
      const rows = screen.getAllByRole('button', {
        name: new RegExp(targetLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      })
      expect(rows.length).toBeGreaterThan(0)
      rowForClear = rows[0] as HTMLElement
    })
    if (!rowForClear) {
      throw new Error('Timeline event row for clearing not found')
    }
    fireEvent.click(rowForClear)
    fireEvent.click(screen.getAllByRole('button', { name: /^inspector$/i })[0] as HTMLButtonElement)

    await waitFor(() => {
      expect(screen.getByText(/Latest Event/i)).not.toBeNull()
      expect(screen.queryByText(/Selected Event/i)).toBeNull()
    })
    } finally {
      await runtime.dispose()
    }
  })

  it('normalizes timeline events to RuntimeDebugEventRef and supports filtering by kind + txnId', async () => {
    const runtime = makeRuntime()

    try {
      render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    await waitForStartup()

    // Trigger multiple increments to generate multiple transactions (each interaction = one StateTransaction).
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    await refreshDevtoolsState()

    let targetTxnId: string | undefined

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState

      const refs = state.timeline
        .map((entry) => entry.event as CoreDebug.RuntimeDebugEventRef | undefined)
        .filter((ref): ref is CoreDebug.RuntimeDebugEventRef => ref != null)

      const stateEventsWithTxn = refs.filter((ref) => ref.kind === 'state' && ref.txnId != null)
      expect(stateEventsWithTxn.length).toBeGreaterThan(0)
      targetTxnId = stateEventsWithTxn[0]?.txnId
    })

    const state = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
    ) as DevtoolsState

    const refs = state.timeline
      .map((entry) => entry.event as CoreDebug.RuntimeDebugEventRef | undefined)
      .filter((ref): ref is CoreDebug.RuntimeDebugEventRef => ref != null)

    const resolvedTxnId = targetTxnId
    if (!resolvedTxnId) {
      throw new Error('state event with txnId not found')
    }

    // Filter all events under the same txnId.
    // Expect at least action + state, proving we can aggregate a transaction view by kind + txnId.
    const eventsForTxn = refs.filter((ref) => ref.txnId === resolvedTxnId)
    expect(eventsForTxn.length).toBeGreaterThanOrEqual(2)

    const kindsForTxn = new Set(eventsForTxn.map((ref) => ref.kind))
    expect(kindsForTxn.has('state')).toBe(true)
    expect(kindsForTxn.has('action')).toBe(true)
    } finally {
      await runtime.dispose()
    }
  })

  it('visualizes react-render events and supports View kind filter', async () => {
    const runtime = makeRuntime()

    try {
      render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    await waitForStartup()

    // Trigger multiple increments to produce a few transactions and render events.
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    await refreshDevtoolsState()

    let targetRenderLabel: string | undefined

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState

      const refs = state.timeline
        .map((entry) => entry.event as CoreDebug.RuntimeDebugEventRef | undefined)
        .filter((ref): ref is CoreDebug.RuntimeDebugEventRef => ref != null)

      const renderEvents = refs.filter((ref) => ref.kind === 'react-render')
      expect(renderEvents.length).toBeGreaterThan(0)
      targetRenderLabel = renderEvents[0]?.label
    })

    if (!targetRenderLabel) {
      throw new Error('react-render event not found')
    }

    // Switch to the View kind filter to keep only react-render events.
    const viewFilterButton = screen.getAllByRole('button', {
      name: /^View$/i,
    })[0]
    fireEvent.click(viewFilterButton)

    await waitFor(() => {
      // At least one react-render event row should exist (labels are normalized; no longer rely on trace:* types).
      const viewRows = screen.getAllByRole('button', {
        name: new RegExp(targetRenderLabel!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      })
      expect(viewRows.length).toBeGreaterThan(0)
    })
    } finally {
      await runtime.dispose()
    }
  })

  it('shows selector eval evidence through the inspector drilldown', async () => {
    const runtime = makeRuntime()

    try {
      render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    await waitForStartup()

    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    await refreshDevtoolsState()

    let selectorEventLabel: string | undefined

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      const refs = state.timeline
        .map((entry) => entry.event as CoreDebug.RuntimeDebugEventRef | undefined)
        .filter((ref): ref is CoreDebug.RuntimeDebugEventRef => ref != null)
      const selectorEval = refs.find((ref) => ref.label === 'trace:selector:eval')
      expect(selectorEval).toBeDefined()
      selectorEventLabel = selectorEval?.label
    })

    if (!selectorEventLabel) {
      throw new Error('selector eval event not found')
    }

    fireEvent.click(screen.getAllByRole('button', { name: /^timeline$/i })[0] as HTMLButtonElement)
    let selectorRow: HTMLElement | undefined
    await waitFor(() => {
      const selectorRows = screen.getAllByRole('button', {
        name: new RegExp(selectorEventLabel!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      })
      expect(selectorRows.length).toBeGreaterThan(0)
      selectorRow = selectorRows[0] as HTMLElement
    })
    if (!selectorRow) {
      throw new Error('selector eval row not found')
    }
    fireEvent.click(selectorRow)
    fireEvent.click(screen.getAllByRole('button', { name: /^inspector$/i })[0] as HTMLButtonElement)

    await waitFor(() => {
      expect(screen.getByText(/Selected Event/i)).not.toBeNull()
      expect(screen.getAllByText(/trace:selector:eval/i).length).toBeGreaterThan(0)
    })
    } finally {
      await runtime.dispose()
    }
  })
})
