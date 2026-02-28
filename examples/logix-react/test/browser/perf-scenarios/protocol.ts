export type ScenarioPriority = 'P1' | 'P2' | 'P3'

export type Primitive = string | number | boolean

export const scenarioIds = [
  'route-switch',
  'query-list-refresh',
  'form-cascade-validate',
  'dense-interaction-burst',
  'external-push-sync',
] as const

export type ScenarioId = (typeof scenarioIds)[number]

export const scenarioLoadLevels = ['low', 'medium', 'high'] as const

export type ScenarioLoadLevel = (typeof scenarioLoadLevels)[number]

export const diagnosticsLevels = ['off', 'light', 'sampled', 'full'] as const

export type DiagnosticsLevel = (typeof diagnosticsLevels)[number]

export type AbsoluteBudget = {
  readonly type: 'absolute'
  readonly id: string
  readonly metric: string
  readonly p95Ms: number
}

export type RelativeBudget = {
  readonly type: 'relative'
  readonly id: string
  readonly metric: string
  readonly maxRatio: number
  readonly minDeltaMs?: number
  readonly numeratorRef: string
  readonly denominatorRef: string
}

export type ScenarioBudget = AbsoluteBudget | RelativeBudget

export type ScenarioSuite = {
  readonly id: string
  readonly title: string
  readonly priority: ScenarioPriority
  readonly primaryAxis: string
  readonly axes: Readonly<Record<string, ReadonlyArray<Primitive>>>
  readonly metrics: ReadonlyArray<string>
  readonly budgets: ReadonlyArray<ScenarioBudget>
  readonly requiredEvidence: ReadonlyArray<string>
}

const requiredEvidenceBase = [
  'instanceId',
  'txnSeq',
  'opSeq',
  'traceDigest',
  'diagnostics.level',
  'diagnostics.overheadLevel',
  'diagnostics.overheadMs',
  'diagnostics.overheadRatio',
  'budget.cutOffCount',
  'memory.heapStartBytes',
  'memory.heapEndBytes',
  'memory.heapDriftBytes',
  'memory.heapDriftRatio',
  'memory.gcSupported',
] as const

const defaultMetrics = ['runtime.txnCommitMs', 'workflow.scenarioMs'] as const

const defaultBudgets: ReadonlyArray<ScenarioBudget> = [
  {
    type: 'absolute',
    id: 'commit.p95<=50ms',
    metric: 'runtime.txnCommitMs',
    p95Ms: 50,
  },
  {
    type: 'relative',
    id: 'high<=medium*1.20',
    metric: 'runtime.txnCommitMs',
    maxRatio: 1.2,
    minDeltaMs: 0.5,
    numeratorRef: 'loadLevel=high',
    denominatorRef: 'loadLevel=medium',
  },
]

const makeScenarioSuite = (args: {
  readonly id: ScenarioId
  readonly title: string
  readonly priority: ScenarioPriority
}): ScenarioSuite => ({
  id: args.id,
  title: args.title,
  priority: args.priority,
  primaryAxis: 'loadLevel',
  axes: {
    loadLevel: scenarioLoadLevels,
  },
  metrics: defaultMetrics,
  budgets: defaultBudgets,
  requiredEvidence: requiredEvidenceBase,
})

export const perfScenarioSuites: ReadonlyArray<ScenarioSuite> = [
  makeScenarioSuite({
    id: 'route-switch',
    title: 'Route Switch Baseline',
    priority: 'P1',
  }),
  makeScenarioSuite({
    id: 'query-list-refresh',
    title: 'Query List Refresh',
    priority: 'P1',
  }),
  makeScenarioSuite({
    id: 'form-cascade-validate',
    title: 'Form Cascade Validate',
    priority: 'P1',
  }),
  makeScenarioSuite({
    id: 'dense-interaction-burst',
    title: 'Dense Interaction Burst',
    priority: 'P1',
  }),
  makeScenarioSuite({
    id: 'external-push-sync',
    title: 'External Push Sync',
    priority: 'P2',
  }),
]

export const perfScenarioMatrixSuite: ScenarioSuite = {
  id: 'examples.logixReact.scenarios',
  title: 'examples/logix-react: real project browser scenarios',
  priority: 'P1',
  primaryAxis: 'scenarioId',
  axes: {
    scenarioId: scenarioIds,
    loadLevel: scenarioLoadLevels,
  },
  metrics: defaultMetrics,
  budgets: defaultBudgets,
  requiredEvidence: requiredEvidenceBase,
}

export const perfScenarioIds: ReadonlyArray<ScenarioId> = scenarioIds

export const findPerfScenario = (id: ScenarioId): ScenarioSuite | undefined => perfScenarioSuites.find((suite) => suite.id === id)
