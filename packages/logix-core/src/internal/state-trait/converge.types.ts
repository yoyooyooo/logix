import type { PatchReason } from '../runtime/core/StateTransaction.js'
import type {
  DowngradeReason as ErrorDowngradeReason,
  SerializableErrorSummary,
} from '../runtime/core/errorSummary.js'
import type { DirtyAllReason, FieldPath, FieldPathId } from '../field-path.js'
import type {
  TraitConvergeConfigScope,
  TraitConvergeDecisionSummary,
  TraitConvergeGenerationEvidence,
  TraitConvergePlanCacheEvidence,
  TraitConvergeReason,
  TraitConvergeRequestedMode,
} from './model.js'
import type { ConvergePlanCache } from './plan-cache.js'

export class StateTraitConfigError extends Error {
  readonly _tag = 'StateTraitConfigError'

  constructor(
    readonly code: 'CYCLE_DETECTED' | 'MULTIPLE_WRITERS',
    message: string,
    readonly fields: ReadonlyArray<string> = [],
  ) {
    super(message)
    this.name = 'StateTraitConfigError'
  }
}

export type ConvergeDegradeReason = 'budget_exceeded' | 'runtime_error'

export type ConvergeMode = 'full' | 'dirty'

export interface ConvergeStepSummary {
  readonly stepId: string
  readonly kind: 'computed' | 'link'
  readonly fieldPath: string
  readonly durationMs: number
  readonly changed: boolean
}

export interface ConvergeSummary {
  readonly mode: ConvergeMode
  readonly budgetMs: number
  readonly totalDurationMs: number
  readonly totalSteps: number
  readonly executedSteps: number
  readonly skippedSteps: number
  readonly changedSteps: number
  readonly dirtyRoots?: ReadonlyArray<string>
  readonly top3: ReadonlyArray<ConvergeStepSummary>
}

export type ConvergeOutcome =
  | {
      readonly _tag: 'Converged'
      readonly patchCount: number
      readonly summary?: ConvergeSummary
      readonly decision?: TraitConvergeDecisionSummary
    }
  | {
      readonly _tag: 'Noop'
      readonly summary?: ConvergeSummary
      readonly decision?: TraitConvergeDecisionSummary
    }
  | {
      readonly _tag: 'Degraded'
      readonly reason: ConvergeDegradeReason
      readonly errorSummary?: SerializableErrorSummary
      readonly errorDowngrade?: ErrorDowngradeReason
      readonly summary?: ConvergeSummary
      readonly decision?: TraitConvergeDecisionSummary
    }

export interface ConvergeContext<S> {
  readonly moduleId?: string
  readonly instanceId: string
  readonly txnSeq?: number
  readonly txnId?: string
  readonly configScope?: TraitConvergeConfigScope
  readonly generation?: TraitConvergeGenerationEvidence
  readonly cacheMissReasonHint?: TraitConvergePlanCacheEvidence['missReason']
  readonly now: () => number
  readonly budgetMs: number
  readonly decisionBudgetMs?: number
  readonly requestedMode?: TraitConvergeRequestedMode
  /**
   * 043: select the execution scope for this converge (default: all).
   * - all: keep legacy behavior
   * - immediate: run only computed/link with scheduling=immediate
   * - deferred: run only computed/link with scheduling=deferred
   */
  readonly schedulingScope?: 'all' | 'immediate' | 'deferred'
  /**
   * 060: explicitly specify stepIds for this converge (used to slice the deferred scope).
   *
   * - If not provided, select the corresponding topoOrder by schedulingScope.
   * - If provided, it must be monotonic increasing in topo order (caller guarantees).
   */
  readonly schedulingScopeStepIds?: Int32Array
  /**
   * dirtyAllReason：当事务窗口内发生不可追踪/不可映射写入时，必须显式降级为 dirtyAll，
   * 并提供稳定原因码（用于诊断与 gate）。
   */
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPaths?: ReadonlySet<string | FieldPath | FieldPathId> | ReadonlyArray<string | FieldPath | FieldPathId>
  readonly allowInPlaceDraft?: boolean
  readonly planCache?: ConvergePlanCache
  readonly getDraft: () => S
  readonly setDraft: (next: S) => void
  readonly recordPatch: (
    path: string | FieldPath | FieldPathId | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ) => void
}
