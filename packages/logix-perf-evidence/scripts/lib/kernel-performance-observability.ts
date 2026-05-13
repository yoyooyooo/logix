export type KernelPerformanceArtifactRole =
  | 'structure'
  | 'snapshot'
  | 'trend'
  | 'convergence'
  | 'soak'
  | 'finalGate'

export type KernelPerformanceClaimStrength =
  | 'none'
  | 'clue'
  | 'preflight'
  | 'current-state'
  | 'trend-candidate'
  | 'candidate'
  | 'hard'

export type KernelPerformanceClaimKind =
  | 'current-state'
  | 'trend-prioritization'
  | 'improvement'
  | 'final-convergence'
  | 'release-safe'

export type KernelPerformanceClaimBoundary = Readonly<{
  readonly artifactRole: KernelPerformanceArtifactRole
  readonly claimStrength: KernelPerformanceClaimStrength
  readonly allowedClaimKinds: ReadonlyArray<KernelPerformanceClaimKind>
  readonly forbiddenClaimKinds: ReadonlyArray<KernelPerformanceClaimKind>
}>

export type KernelPerformanceMovementClassification =
  | 'tax_removed'
  | 'stable_guarded'
  | 'migrated_cost'
  | 'migrated_risk'
  | 'blocked'
  | 'inconclusive'

export type KernelPerformanceRuntimeMapping = Readonly<{
  readonly ownerPath: string
  readonly pressureKnobs: ReadonlyArray<string>
  readonly requiredCounters: ReadonlyArray<string>
  readonly primaryMetric: string
  readonly forbiddenMigrationTargets: ReadonlyArray<string>
}>

const fallbackMapping: KernelPerformanceRuntimeMapping = {
  ownerPath: 'unclassified',
  pressureKnobs: [],
  requiredCounters: [],
  primaryMetric: 'unknown',
  forbiddenMigrationTargets: [],
}

const suiteMappings: Readonly<Record<string, KernelPerformanceRuntimeMapping>> = {
  'negativeBoundaries.dirtyPattern': {
    ownerPath: 'dirtyPlan/source/selector',
    pressureKnobs: ['dirtyRootsRatio', 'mutationPattern', 'selectorFanout'],
    requiredCounters: [
      'dirtyPlan.unknownWrite',
      'dirtyPlan.missingRegistry',
      'dirtyPlan.dirtyAll',
      'source.fullFallback',
      'selector.evaluateAll',
    ],
    primaryMetric: 'runtime.txnCommitMs',
    forbiddenMigrationTargets: ['RuntimeStore notify fanout', 'React render fanout'],
  },
  'converge.txnCommit': {
    ownerPath: 'field-kernel converge',
    pressureKnobs: ['steps', 'dirtyRootsRatio'],
    requiredCounters: ['dirtyPlan.dirtyAll', 'selector.evaluateAll'],
    primaryMetric: 'runtime.txnCommitMs',
    forbiddenMigrationTargets: ['selector route', 'RuntimeStore notify fanout'],
  },
  'form.listScopeCheck': {
    ownerPath: 'form/list evidence',
    pressureKnobs: ['sourceListWidth', 'dirtyRootsRatio'],
    requiredCounters: ['source.rowFullScan', 'listEvidence.stringNormalizeHotPath'],
    primaryMetric: 'form.listScopeCheckMs',
    forbiddenMigrationTargets: ['selector evaluateAll', 'React render fanout'],
  },
  'externalStore.ingest.tickNotify': {
    ownerPath: 'source/external store',
    pressureKnobs: ['sourceListWidth', 'steps'],
    requiredCounters: ['source.fullFallback', 'source.keyEval.unrelatedMutation'],
    primaryMetric: 'externalStore.tickNotifyMs',
    forbiddenMigrationTargets: ['selector route', 'RuntimeStore notify fanout'],
  },
  'runtimeStore.noTearing.tickNotify': {
    ownerPath: 'RuntimeStore/React host',
    pressureKnobs: ['storeTopicCount', 'reactMode'],
    requiredCounters: ['runtimeStore.runSyncFallbackAfterBoot', 'runtimeStore.retainedTopicLeak'],
    primaryMetric: 'timePerTickMs',
    forbiddenMigrationTargets: ['selector route', 'React render fanout', 'diagnostics-off payload'],
  },
  'react.strictSuspenseJitter': {
    ownerPath: 'React host scheduling',
    pressureKnobs: ['reactMode', 'txnQueueBacklog'],
    requiredCounters: ['runtimeStore.runSyncFallbackAfterBoot'],
    primaryMetric: 'react.commitMs',
    forbiddenMigrationTargets: ['RuntimeStore notify fanout', 'diagnostics overhead'],
  },
  'diagnostics.overhead': {
    ownerPath: 'diagnostics',
    pressureKnobs: ['diagnosticsLevel'],
    requiredCounters: ['diagnosticsOff.payloadCount'],
    primaryMetric: 'diagnosticsEmitMs',
    forbiddenMigrationTargets: ['React render fanout', 'list evidence materialization'],
  },
  'diagnostics.overhead.e2e': {
    ownerPath: 'diagnostics',
    pressureKnobs: ['diagnosticsLevel'],
    requiredCounters: ['diagnosticsOff.payloadCount'],
    primaryMetric: 'diagnosticsEmitMs',
    forbiddenMigrationTargets: ['React render fanout', 'list evidence materialization'],
  },
  'txnQueue.directIdle': {
    ownerPath: 'txn queue / lane policy',
    pressureKnobs: ['txnQueueBacklog', 'steps'],
    requiredCounters: ['txnQueue.directIdleQueueWaitNonZero', 'txnQueue.directIdleBackpressureNonZero'],
    primaryMetric: 'runtime.backlogCatchUpMs',
    forbiddenMigrationTargets: ['selector route', 'RuntimeStore notify fanout'],
  },
  'txnLanes.urgentBacklog': {
    ownerPath: 'txn queue / lane policy',
    pressureKnobs: ['txnQueueBacklog', 'steps'],
    requiredCounters: ['txnQueue.directIdleQueueWaitNonZero', 'txnQueue.directIdleBackpressureNonZero'],
    primaryMetric: 'runtime.urgentP95Ms',
    forbiddenMigrationTargets: ['selector route', 'React render fanout'],
  },
  'dispatchShell.fixedCost': {
    ownerPath: 'dispatch fixed-cost shell',
    pressureKnobs: ['steps'],
    requiredCounters: ['dispatch.noTopicFanoutAlloc'],
    primaryMetric: 'dispatchShell.fixedCostMs',
    forbiddenMigrationTargets: ['RuntimeStore notify fanout', 'React render fanout'],
  },
  'examples.runtimeWitness': {
    ownerPath: 'examples runtime witness',
    pressureKnobs: ['playgroundNoise'],
    requiredCounters: ['examples.publicResidueViolation'],
    primaryMetric: 'examples.runtimeWitnessMs',
    forbiddenMigrationTargets: ['product/editor cost'],
  },
  'examples.playgroundNoiseIsolation': {
    ownerPath: 'examples playground isolation',
    pressureKnobs: ['playgroundNoise'],
    requiredCounters: ['examples.kernelPlaygroundCostMixed', 'examples.publicResidueViolation'],
    primaryMetric: 'examples.playgroundInteractionMs',
    forbiddenMigrationTargets: ['kernel hard claim'],
  },
}

const counterOwnerHints: ReadonlyArray<Readonly<{ prefix: string; suiteId: string }>> = [
  { prefix: 'dirtyPlan.', suiteId: 'negativeBoundaries.dirtyPattern' },
  { prefix: 'source.', suiteId: 'externalStore.ingest.tickNotify' },
  { prefix: 'selector.', suiteId: 'negativeBoundaries.dirtyPattern' },
  { prefix: 'txnQueue.', suiteId: 'txnQueue.directIdle' },
  { prefix: 'dispatch.', suiteId: 'dispatchShell.fixedCost' },
  { prefix: 'runtimeStore.', suiteId: 'runtimeStore.noTearing.tickNotify' },
  { prefix: 'diagnosticsOff.', suiteId: 'diagnostics.overhead' },
  { prefix: 'listEvidence.', suiteId: 'form.listScopeCheck' },
  { prefix: 'examples.', suiteId: 'examples.playgroundNoiseIsolation' },
]

export const claimBoundary = (args: {
  readonly artifactRole: KernelPerformanceArtifactRole
  readonly claimStrength: KernelPerformanceClaimStrength
  readonly allowedClaimKinds: ReadonlyArray<KernelPerformanceClaimKind>
}): KernelPerformanceClaimBoundary => {
  const all: ReadonlyArray<KernelPerformanceClaimKind> = [
    'current-state',
    'trend-prioritization',
    'improvement',
    'final-convergence',
    'release-safe',
  ]
  const allowed = new Set(args.allowedClaimKinds)
  return {
    artifactRole: args.artifactRole,
    claimStrength: args.claimStrength,
    allowedClaimKinds: args.allowedClaimKinds,
    forbiddenClaimKinds: all.filter((kind) => !allowed.has(kind)),
  }
}

export const runtimeMappingForSuite = (suiteId: string): KernelPerformanceRuntimeMapping =>
  suiteMappings[suiteId] ?? fallbackMapping

export const runtimeMappingForCounter = (counter: string): KernelPerformanceRuntimeMapping => {
  const hit = counterOwnerHints.find((item) => counter.startsWith(item.prefix))
  return hit ? runtimeMappingForSuite(hit.suiteId) : fallbackMapping
}

export const classifyTrendMovement = (args: {
  readonly hasBlocker: boolean
  readonly hasCounterRisk: boolean
  readonly hasMetricIncrease: boolean
  readonly hasMetricDecrease: boolean
}): KernelPerformanceMovementClassification => {
  if (args.hasCounterRisk) return 'migrated_risk'
  if (args.hasBlocker) return 'blocked'
  if (args.hasMetricIncrease) return 'migrated_cost'
  if (args.hasMetricDecrease) return 'tax_removed'
  return 'stable_guarded'
}
