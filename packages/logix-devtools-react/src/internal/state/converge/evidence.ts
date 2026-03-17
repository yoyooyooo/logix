import type { TraitConvergeRequestedMode } from './snippets.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const asStringArray = (value: unknown): ReadonlyArray<string> | undefined => {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) return undefined
    out.push(item)
  }
  return out
}

export type ConvergeDecisionEvidence = {
  readonly requestedMode?: TraitConvergeRequestedMode
  readonly executedMode?: 'full' | 'dirty'
  readonly outcome?: 'Converged' | 'Noop' | 'Degraded'
  readonly configScope?: 'provider' | 'runtime_module' | 'runtime_default' | 'builtin'
  readonly staticIrDigest?: string
  readonly executionBudgetMs?: number
  readonly executionDurationMs?: number
  readonly decisionBudgetMs?: number
  readonly decisionDurationMs?: number
  readonly reasons?: ReadonlyArray<string>
  readonly stepStats?: {
    readonly totalSteps?: number
    readonly executedSteps?: number
    readonly skippedSteps?: number
    readonly changedSteps?: number
    readonly affectedSteps?: number
  }
  readonly dirty?: {
    readonly dirtyAll?: boolean
    readonly rootCount?: number
    readonly rootIdsTruncated?: boolean
  }
  readonly cache?: {
    readonly capacity?: number
    readonly hits?: number
    readonly misses?: number
    readonly hit?: boolean
  }
}

export const parseConvergeDecisionEvidence = (evidence: unknown): ConvergeDecisionEvidence => {
  if (!isRecord(evidence)) return {}

  const stepStatsRaw = isRecord(evidence.stepStats) ? evidence.stepStats : undefined
  const dirtyRaw = isRecord(evidence.dirty) ? evidence.dirty : undefined
  const cacheRaw = isRecord(evidence.cache) ? evidence.cache : undefined

  return {
    requestedMode: asString(evidence.requestedMode) as TraitConvergeRequestedMode | undefined,
    executedMode: asString(evidence.executedMode) as 'full' | 'dirty' | undefined,
    outcome: asString(evidence.outcome) as 'Converged' | 'Noop' | 'Degraded' | undefined,
    configScope: asString(evidence.configScope) as any,
    staticIrDigest: asString(evidence.staticIrDigest),
    executionBudgetMs: asNumber(evidence.executionBudgetMs),
    executionDurationMs: asNumber(evidence.executionDurationMs),
    decisionBudgetMs: asNumber(evidence.decisionBudgetMs),
    decisionDurationMs: asNumber(evidence.decisionDurationMs),
    reasons: asStringArray(evidence.reasons),
    stepStats: stepStatsRaw
      ? {
          totalSteps: asNumber(stepStatsRaw.totalSteps),
          executedSteps: asNumber(stepStatsRaw.executedSteps),
          skippedSteps: asNumber(stepStatsRaw.skippedSteps),
          changedSteps: asNumber(stepStatsRaw.changedSteps),
          affectedSteps: asNumber(stepStatsRaw.affectedSteps),
        }
      : undefined,
    dirty: dirtyRaw
      ? {
          dirtyAll: typeof dirtyRaw.dirtyAll === 'boolean' ? dirtyRaw.dirtyAll : undefined,
          rootCount: asNumber(dirtyRaw.rootCount),
          rootIdsTruncated: typeof dirtyRaw.rootIdsTruncated === 'boolean' ? dirtyRaw.rootIdsTruncated : undefined,
        }
      : undefined,
    cache: cacheRaw
      ? {
          capacity: asNumber(cacheRaw.capacity),
          hits: asNumber(cacheRaw.hits),
          misses: asNumber(cacheRaw.misses),
          hit: typeof cacheRaw.hit === 'boolean' ? cacheRaw.hit : undefined,
        }
      : undefined,
  }
}
