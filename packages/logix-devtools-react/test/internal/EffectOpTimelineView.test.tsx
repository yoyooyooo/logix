// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logix/react'
import { LogixDevtools } from '../../src/LogixDevtools.js'
import { devtoolsLayer, clearDevtoolsEvents, clearDevtoolsSnapshotOverride } from '../../src/DevtoolsLayer.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

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
      showTraitEvents: true,
      showReactRenderEvents: true,
      sampling: { reactRenderSampleRate: 1 },
    },
  })
})

afterEach(() => {
  cleanup()
  clearDevtoolsSnapshotOverride()
  clearDevtoolsEvents()
})

// A minimal Counter Module used to drive the Devtools timeline and produce EffectOp / Debug events.
const DEFERRED_STEPS = 64
const counterFields: Record<string, Schema.Schema.Any> = { count: Schema.Number }
for (let i = 0; i < DEFERRED_STEPS; i++) {
  counterFields[`d${i}`] = Schema.Number
}
type CounterState = { count: number } & Record<string, number>
const CounterStateSchema = Schema.Struct(counterFields) as unknown as Schema.Schema<CounterState>

const counterTraits: Record<string, any> = {}
for (let i = 0; i < DEFERRED_STEPS; i++) {
  const key = `d${i}`
  counterTraits[key] = Logix.StateTrait.computed({
    deps: ['count'] as any,
    get: (count: any) => (count as number) + i,
    scheduling: 'deferred',
  } as any)
}

const CounterModule = Logix.Module.make('DevtoolsTimelineCounter', {
  state: CounterStateSchema,
  actions: {
    increment: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
  traits: Logix.StateTrait.from(CounterStateSchema as any)(counterTraits as any),
})

const CounterImpl = CounterModule.implement({
  initial: {
    count: 0,
    ...Object.fromEntries(Array.from({ length: DEFERRED_STEPS }, (_, i) => [`d${i}`, i])),
  } as CounterState,
  logics: [
    CounterModule.logic(($) =>
      Effect.gen(function* () {
        // Record a visible trace event via DebugSink so it's easy to locate in the timeline.
        yield* $.onAction('increment').run(() =>
          Logix.Debug.record({
            type: 'trace:increment',
            moduleId: CounterModule.id,
            data: { source: 'EffectOpTimelineView.test' },
          }),
        )
      }),
    ),
  ],
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'DevtoolsTimelineRuntime',
  layer: devtoolsLayer as Layer.Layer<any, never, never>,
  stateTransaction: {
    traitConvergeMode: 'dirty',
    traitConvergeBudgetMs: 100_000,
    traitConvergeDecisionBudgetMs: 100_000,
    traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
    txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
  },
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

describe('@logix/devtools-react · EffectOpTimelineView & Inspector behavior', () => {
  it('shows latest event details by default, and toggles to selected event details on click', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // Trigger multiple increments to ensure the timeline contains multiple events.
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // Wait for the Devtools panel to render and for the Inspector to show "Latest Event" details.
    await waitFor(() => {
      // The panel title appearing means the panel is open.
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
      expect(screen.getByText(/Latest Event/i)).not.toBeNull()
    })

    // The Inspector should show a summary for the current transaction.
    expect(screen.getByText(/Transaction Summary/i)).not.toBeNull()

    // By default there should be no "Selected Event" section.
    expect(screen.queryByText(/Selected Event/i)).toBeNull()

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
    const lastRef = lastEntry.event as Logix.Debug.RuntimeDebugEventRef
    const targetLabel = lastRef.label

    // Find the corresponding event row in the timeline and click to select it.
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

    // The Inspector should switch to the "Selected Event" view.
    await waitFor(() => {
      expect(screen.getByText(/Selected Event/i)).not.toBeNull()
    })

    // Click the same row again to clear selection and return to "Latest Event" mode.
    fireEvent.click(eventRow)

    await waitFor(() => {
      expect(screen.getByText(/Latest Event/i)).not.toBeNull()
      expect(screen.queryByText(/Selected Event/i)).toBeNull()
    })
  })

  it('normalizes timeline events to RuntimeDebugEventRef and supports filtering by kind + txnId', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // Trigger multiple increments to generate multiple transactions (each interaction = one StateTransaction).
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // Wait for the DevtoolsModule to derive timeline data.
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    const state = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
    ) as DevtoolsState

    // Normalize Debug events in the timeline into RuntimeDebugEventRef
    // so we can filter transactions by kind + txnId.
    const refs = state.timeline
      .map((entry) => entry.event as Logix.Debug.RuntimeDebugEventRef | undefined)
      .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null)

    // There should be at least one `state` event with a txnId.
    const stateEventsWithTxn = refs.filter((ref) => ref.kind === 'state' && ref.txnId != null)
    expect(stateEventsWithTxn.length).toBeGreaterThan(0)

    const targetTxnId = stateEventsWithTxn[0].txnId!

    // Filter all events under the same txnId.
    // Expect at least action + state, proving we can aggregate a transaction view by kind + txnId.
    const eventsForTxn = refs.filter((ref) => ref.txnId === targetTxnId)
    expect(eventsForTxn.length).toBeGreaterThanOrEqual(2)

    const kindsForTxn = new Set(eventsForTxn.map((ref) => ref.kind))
    expect(kindsForTxn.has('state')).toBe(true)
    expect(kindsForTxn.has('action')).toBe(true)
  })

  it('visualizes react-render events and supports View kind filter', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // Trigger multiple increments to produce a few transactions and render events.
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // Wait for the DevtoolsModule to derive timeline data.
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    const state = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
    ) as DevtoolsState

    const refs = state.timeline
      .map((entry) => entry.event as Logix.Debug.RuntimeDebugEventRef | undefined)
      .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null)

    const renderEvents = refs.filter((ref) => ref.kind === 'react-render')
    expect(renderEvents.length).toBeGreaterThan(0)
    const targetRenderLabel = renderEvents[0].label

    // Switch to the View kind filter to keep only react-render events.
    const viewFilterButton = screen.getAllByRole('button', {
      name: /^View$/i,
    })[0]
    fireEvent.click(viewFilterButton)

    await waitFor(() => {
      // At least one react-render event row should exist (labels are normalized; no longer rely on trace:* types).
      const viewRows = screen.getAllByRole('button', {
        name: new RegExp(targetRenderLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      })
      expect(viewRows.length).toBeGreaterThan(0)
    })
  })

  it('renders selector lane summary (static/dynamic + fallbackTop)', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    await waitFor(() => {
      expect(screen.getAllByText(/selectorLane: static \d+, dynamic \d+/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/fallbackTop:/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/txnBacklog: pending \d+, age/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/txnReasons:/i).length).toBeGreaterThan(0)
    })
  })
})
