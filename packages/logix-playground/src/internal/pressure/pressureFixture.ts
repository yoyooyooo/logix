import type { PlaygroundDriver, PlaygroundScenario } from '../../Project.js'
import type { WorkbenchBottomTab, WorkbenchInspectorTab } from '../state/workbenchTypes.js'

export interface VisualPressureFixture {
  readonly id: string
  readonly activeInspectorTab: 'Actions' | 'Drivers' | 'Diagnostics'
  readonly activeBottomTab: WorkbenchBottomTab
  readonly dataProfile: Readonly<Record<string, number>>
}

export interface PressureStateRow {
  readonly key: string
  readonly value: string
  readonly depth: number
}

export interface PressureTraceRow {
  readonly seq: number
  readonly time: string
  readonly op: string
  readonly source: string
  readonly event: string
  readonly delta: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isBottomTab = (value: unknown): value is WorkbenchBottomTab =>
  value === 'Console' || value === 'Diagnostics' || value === 'Trace' || value === 'Snapshot' || value === 'Scenario'

const isInspectorTab = (value: unknown): value is VisualPressureFixture['activeInspectorTab'] =>
  value === 'Actions' || value === 'Drivers' || value === 'Diagnostics'

const toNumberRecord = (value: unknown): Readonly<Record<string, number>> => {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  )
}

export const resolveVisualPressureFixture = (fixtures: unknown): VisualPressureFixture | undefined => {
  if (!isRecord(fixtures) || !isRecord(fixtures.pressure)) return undefined
  const pressure = fixtures.pressure
  const id = typeof pressure.id === 'string' ? pressure.id : undefined
  const activeInspectorTab = isInspectorTab(pressure.activeInspectorTab) ? pressure.activeInspectorTab : undefined
  const activeBottomTab = isBottomTab(pressure.activeBottomTab) ? pressure.activeBottomTab : undefined
  if (!id || !activeInspectorTab || !activeBottomTab) return undefined

  return {
    id,
    activeInspectorTab,
    activeBottomTab,
    dataProfile: toNumberRecord(pressure.dataProfile),
  }
}

export const pressureInspectorTab = (fixture: VisualPressureFixture | undefined): WorkbenchInspectorTab | undefined => {
  if (!fixture) return undefined
  switch (fixture.activeInspectorTab) {
    case 'Actions':
      return 'actions'
    case 'Drivers':
      return 'drivers'
    case 'Diagnostics':
      return 'diagnostics'
  }
}

export const makePressureStateRows = (fixture: VisualPressureFixture | undefined): ReadonlyArray<PressureStateRow> => {
  if (!fixture) return []
  const stateNodes = fixture.dataProfile.stateNodes ?? fixture.dataProfile.actions ?? 16
  const maxDepth = fixture.dataProfile.maxDepth ?? 5
  const visibleRows = Math.min(Math.max(stateNodes, 18), 160)

  return Array.from({ length: visibleRows }, (_, index) => {
    const depth = index === 0 ? 0 : (index % maxDepth) + 1
    const key = index === 0
      ? 'state'
      : fixture.id === 'state-large'
        ? `cart.items[${index}].pricing.discount.${index % 7}`
        : `${fixture.id}.node.${index}`
    const value = index === 0
      ? `{ nodes: ${stateNodes}, pressure: "${fixture.id}" }`
      : index % 5 === 0
        ? `"${fixture.id}-${String(index).padStart(3, '0')}"`
        : String((index * 17) % 997)
    return { key, value, depth }
  })
}

export const makePressureTraceRows = (fixture: VisualPressureFixture | undefined): ReadonlyArray<PressureTraceRow> => {
  const count = fixture?.dataProfile.traceEvents ?? 0
  if (!fixture || count <= 0) return []

  return Array.from({ length: count }, (_, index) => {
    const seq = index + 1
    const phase = seq % 4 === 0 ? 'effect' : seq % 3 === 0 ? 'state' : 'dispatch'
    return {
      seq,
      time: `12:43:${String(Math.floor(seq / 20)).padStart(2, '0')}.${String((seq * 137) % 1000).padStart(3, '0')}`,
      op: phase,
      source: phase === 'dispatch' ? `scenario.ts:${40 + (seq % 80)}` : `runtime/state.ts:${100 + (seq % 140)}`,
      event: phase === 'state' ? 'state.patch' : phase === 'effect' ? 'effect.complete' : 'worker.progress',
      delta: `{"worker":"w${seq % 4}","progress":${(seq * 7) % 100},"seq":${seq}}`,
    }
  })
}

export const makePressureDrivers = (fixture: VisualPressureFixture | undefined): ReadonlyArray<PlaygroundDriver> => {
  const count = fixture?.dataProfile.drivers ?? 0
  if (!fixture || count <= 0) return []

  return Array.from({ length: count }, (_, index) => {
    const country = ['JP', 'US', 'DE', 'SG', 'BR', 'IN'][index % 6]!
    return {
      id: `pressure-driver-${index + 1}`,
      label: index === 0 ? 'Submit form' : index === 1 ? 'Change country' : `Driver ${index + 1}`,
      description: index === 0 ? 'Submits the current form data' : `Runs pressure payload ${index + 1}`,
      operation: 'dispatch',
      actionTag: `action${String((index % 18) + 1).padStart(2, '0')}`,
      payload: {
        kind: 'json',
        value: { country, city: `city-${index + 1}`, attempt: index + 1 },
      },
      examples: [
        {
          id: 'default',
          label: country,
          payload: { country, city: `city-${index + 1}`, attempt: index + 1 },
        },
      ],
      readAnchors: [{ id: 'state', label: 'state.form', target: 'state' }],
    }
  })
}

export const makePressureScenarios = (fixture: VisualPressureFixture | undefined): ReadonlyArray<PlaygroundScenario> => {
  const count = fixture?.dataProfile.scenarioSteps ?? 0
  if (!fixture || count <= 0) return []

  const steps: PlaygroundScenario['steps'] = Array.from({ length: count }, (_, index) => {
    if (index % 4 === 0) {
      return {
        id: `step-${index + 1}`,
        kind: 'driver',
        driverId: `pressure-driver-${(index % Math.max(fixture.dataProfile.drivers ?? 1, 1)) + 1}`,
      }
    }
    if (index % 4 === 1) return { id: `step-${index + 1}`, kind: 'settle', timeoutMs: 800 }
    if (index % 4 === 2) return { id: `step-${index + 1}`, kind: 'observe', target: 'state' }
    return { id: `step-${index + 1}`, kind: 'expect', target: 'state', assertion: 'exists' }
  })

  return [
    {
      id: 'pressure-scenario',
      label: 'Async form flow',
      description: 'Runs the pressure driver and scenario surface.',
      steps,
    },
  ]
}
