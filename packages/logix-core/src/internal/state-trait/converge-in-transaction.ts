import { Effect, FiberRef } from 'effect'
import * as Debug from '../runtime/core/DebugSink.js'
import {
  toSerializableErrorSummary,
} from '../runtime/core/errorSummary.js'
import { dirtyPathsToRootIds, type FieldPath } from '../field-path.js'
import { getConvergeStaticIrDigest } from './converge-ir.js'
import { CowDraft, ShallowInPlaceDraft } from './converge-draft.js'
import { emitSchemaMismatch } from './converge-diagnostics.js'
import { currentExecVmMode } from './exec-vm-mode.js'
import { makeConvergeExecIr } from './converge-exec-ir.js'
import { getMiddlewareStack, runWriterStep, runWriterStepOffFast } from './converge-step.js'
import {
  StateTraitConfigError,
  type ConvergeContext,
  type ConvergeOutcome,
  type ConvergeStepSummary,
  type ConvergeSummary,
  type ConvergeMode,
} from './converge.types.js'
import type {
  StateTraitEntry,
  StateTraitProgram,
  TraitConvergeConfigScope,
  TraitConvergeDecisionSummary,
  TraitConvergeDiagnosticsSamplingSummary,
  TraitConvergeDirtySummary,
  TraitConvergeGenerationEvidence,
  TraitConvergeHotspot,
  TraitConvergeOutcome as TraitConvergeOutcomeTag,
  TraitConvergePlanCacheEvidence,
  TraitConvergeReason,
  TraitConvergeRequestedMode,
  TraitConvergeStaticIrEvidence,
  TraitConvergeStepStats,
} from './model.js'

const pickTop3Steps = (steps: ReadonlyArray<ConvergeStepSummary>): ReadonlyArray<ConvergeStepSummary> => {
  let first: ConvergeStepSummary | undefined
  let second: ConvergeStepSummary | undefined
  let third: ConvergeStepSummary | undefined

  for (const step of steps) {
    const d = step.durationMs
    if (!first || d > first.durationMs) {
      third = second
      second = first
      first = step
      continue
    }
    if (!second || d > second.durationMs) {
      third = second
      second = step
      continue
    }
    if (!third || d > third.durationMs) {
      third = step
    }
  }

  if (!first) return []
  if (!second) return [first]
  if (!third) return [first, second]
  return [first, second, third]
}

const normalizePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n > 0 ? n : undefined
}

const insertTopKHotspot = (args: {
  readonly hotspots: Array<TraitConvergeHotspot>
  readonly next: TraitConvergeHotspot
  readonly topK: number
}): void => {
  const { hotspots, next, topK } = args
  if (topK <= 0) return

  const idx = (() => {
    for (let i = 0; i < hotspots.length; i++) {
      if (next.durationMs > hotspots[i]!.durationMs) return i
    }
    return hotspots.length
  })()

  if (idx >= topK) return
  hotspots.splice(idx, 0, next)
  if (hotspots.length > topK) {
    hotspots.length = topK
  }
}

/**
 * convergeInTransaction：
 * - Execute one derived converge pass within an already-started StateTransaction context.
 * - Currently covers computed/link only (check/source will be added in later phases).
 */
export const convergeInTransaction = <S extends object>(
  program: StateTraitProgram<S>,
  ctx: ConvergeContext<S>,
): Effect.Effect<ConvergeOutcome> =>
  Effect.gen(function* () {
    yield* emitSchemaMismatch(program, ctx)

    const decisionStartedAt = ctx.now()
    let decisionDurationMs: number | undefined
    let executionStartedAt = decisionStartedAt
    const base = ctx.getDraft()
    const requestedMode: TraitConvergeRequestedMode = ctx.requestedMode ?? 'auto'
    const reasons: Array<TraitConvergeReason> = []
    let mode: ConvergeMode = requestedMode === 'dirty' ? 'dirty' : requestedMode === 'full' ? 'full' : 'full'

    const ir = program.convergeIr
    if (!ir) {
      return { _tag: 'Noop' } as const
    }

    // 049: Exec IR must be tied to the generation lifecycle and should not be rebuilt on every txn window.
    let execIr = program.convergeExecIr
    if (!execIr || execIr.generation !== ir.generation) {
      execIr = makeConvergeExecIr(ir)
      ;(program as any).convergeExecIr = execIr
    }

    if (ir.configError) {
      throw new StateTraitConfigError(ir.configError.code, ir.configError.message, ir.configError.fields)
    }

    const stepsInTopoOrder = (ir.stepsById ?? []) as ReadonlyArray<StateTraitEntry<any, string>>
    const totalSteps = stepsInTopoOrder.length

    if (totalSteps === 0) {
      return { _tag: 'Noop' } as const
    }

    const stack = yield* getMiddlewareStack()
    const diagnosticsLevel: Debug.DiagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    const debugSinks = yield* FiberRef.get(Debug.currentDebugSinks)
    // Decision / TraitSummary gate is based on "will it be consumed" (sinks), not diagnosticsLevel.
    // diagnosticsLevel only controls exportable/heavy details (trace payload, hotspots, static IR export, etc.).
    const shouldCollectDecision = debugSinks.length > 0 && !Debug.isErrorOnlyOnlySinks(debugSinks)
    const shouldCollectDecisionDetails = shouldCollectDecision
    const shouldCollectDecisionHeavyDetails = shouldCollectDecision && diagnosticsLevel !== 'off'
    const execVmMode = yield* FiberRef.get(currentExecVmMode)

    // 044: deterministic sampling for sampled mode (uses txnSeq as a stable anchor by default).
    let diagnosticsSampling: TraitConvergeDiagnosticsSamplingSummary | undefined
    if (diagnosticsLevel === 'sampled') {
      const cfg = yield* FiberRef.get(Debug.currentTraitConvergeDiagnosticsSampling)
      const sampleEveryN = normalizePositiveInt(cfg.sampleEveryN) ?? 32
      const topK = normalizePositiveInt(cfg.topK) ?? 3
      const txnSeq = ctx.txnSeq
      const sampled =
        typeof txnSeq === 'number' && Number.isFinite(txnSeq) && txnSeq > 0
          ? (Math.floor(txnSeq) - 1) % sampleEveryN === 0
          : false
      diagnosticsSampling = {
        strategy: 'txnSeq_interval',
        sampleEveryN,
        topK,
        sampled,
      }
    }

    const shouldTimeStepsForHotspots =
      shouldCollectDecision && (diagnosticsLevel === 'full' || diagnosticsSampling?.sampled === true)
    const hotspotsTopK = diagnosticsLevel === 'full' ? 3 : (diagnosticsSampling?.topK ?? 3)
    const hotspots: Array<TraitConvergeHotspot> | undefined = shouldTimeStepsForHotspots ? [] : undefined
    const schedulingScope = ctx.schedulingScope ?? 'all'
    const scopeStepIds =
      ctx.schedulingScopeStepIds ??
      (schedulingScope === 'immediate'
        ? execIr.topoOrderImmediateInt32
        : schedulingScope === 'deferred'
          ? execIr.topoOrderDeferredInt32
          : execIr.topoOrderInt32)
    const scopeStepCount = scopeStepIds.length
    const immediateStepCount = execIr.topoOrderImmediateInt32.length
    const deferredStepCount = execIr.topoOrderDeferredInt32.length
    const timeSlicingSummary =
      deferredStepCount > 0
        ? {
            scope: schedulingScope,
            immediateStepCount,
            deferredStepCount,
          }
        : undefined

    if (deferredStepCount > 0) {
      if (schedulingScope === 'immediate' && !reasons.includes('time_slicing_immediate')) {
        reasons.push('time_slicing_immediate')
      } else if (schedulingScope === 'deferred' && !reasons.includes('time_slicing_deferred')) {
        reasons.push('time_slicing_deferred')
      }
    }

    const emitTraitConvergeTraceEvent = (decision: TraitConvergeDecisionSummary): Effect.Effect<void> =>
      !shouldCollectDecision
        ? Effect.void
        : Debug.record({
            type: 'trace:trait:converge',
            moduleId: ctx.moduleId,
            instanceId: ctx.instanceId,
            txnSeq: ctx.txnSeq,
            txnId: ctx.txnId,
            data: decision as any,
          })

    const registry = ir.fieldPathIdRegistry
    const dirtyPaths = ctx.dirtyPaths == null ? [] : Array.isArray(ctx.dirtyPaths) ? ctx.dirtyPaths : ctx.dirtyPaths

    const dirtyRootIds = dirtyPathsToRootIds({
      dirtyPaths,
      registry,
      dirtyAllReason: ctx.dirtyAllReason,
    })

    const DIRTY_ROOT_IDS_TOP_K = 3
    const AUTO_FLOOR_RATIO = 1.05
    const dirtySummary: TraitConvergeDirtySummary | undefined = !shouldCollectDecisionDetails
      ? undefined
      : dirtyRootIds.dirtyAll
        ? {
            dirtyAll: true,
            reason: dirtyRootIds.reason ?? 'unknownWrite',
            rootCount: 0,
            rootIds: [],
            rootIdsTruncated: false,
          }
        : {
            dirtyAll: false,
            rootCount: dirtyRootIds.rootCount,
            rootIds: dirtyRootIds.rootIds.slice(0, DIRTY_ROOT_IDS_TOP_K),
            rootIdsTruncated: dirtyRootIds.rootIds.length > DIRTY_ROOT_IDS_TOP_K,
          }

    const configScope: TraitConvergeConfigScope = ctx.configScope ?? 'builtin'
    const generationEvidence: TraitConvergeGenerationEvidence = ctx.generation ?? {
      generation: ir.generation,
    }
    const generation = generationEvidence.generation
    const staticIrDigest = !shouldCollectDecisionHeavyDetails ? '' : getConvergeStaticIrDigest(ir)
    const decisionBudgetMs = requestedMode === 'auto' ? ctx.decisionBudgetMs : undefined
    const cacheMissReasonHint = ctx.cacheMissReasonHint

    if (cacheMissReasonHint === 'generation_bumped' && !reasons.includes('generation_bumped')) {
      reasons.push('generation_bumped')
    }

    const isDecisionBudgetExceeded = (): boolean =>
      typeof decisionBudgetMs === 'number' &&
      Number.isFinite(decisionBudgetMs) &&
      decisionBudgetMs > 0 &&
      ctx.now() - decisionStartedAt > decisionBudgetMs

    const markDecisionBudgetCutoff = (): void => {
      if (!reasons.includes('budget_cutoff')) reasons.push('budget_cutoff')
    }

    const prefixFieldPathIdsByPathId = execIr.prefixFieldPathIdsByPathId
    const prefixOffsetsByPathId = execIr.prefixOffsetsByPathId

    const dirtyPrefixBitSet = execIr.scratch.dirtyPrefixBitSet
    const reachableStepBitSet = execIr.scratch.reachableStepBitSet
    const dirtyPrefixQueue = execIr.scratch.dirtyPrefixQueue
    const planScratch = execIr.scratch.planStepIds
    const triggerStepIdsByFieldPathId = execIr.triggerStepIdsByFieldPathId
    const triggerStepOffsetsByFieldPathId = execIr.triggerStepOffsetsByFieldPathId

    const addPathPrefixes = (pathId: number): void => {
      const start = prefixOffsetsByPathId[pathId]
      const end = prefixOffsetsByPathId[pathId + 1]
      if (start == null || end == null) return
      for (let i = start; i < end; i++) {
        dirtyPrefixBitSet.add(prefixFieldPathIdsByPathId[i]!)
      }
    }

    const hasAnyDirtyPrefix = (pathId: number): boolean => {
      const start = prefixOffsetsByPathId[pathId]
      const end = prefixOffsetsByPathId[pathId + 1]
      if (start == null || end == null) return false
      for (let i = start; i < end; i++) {
        if (dirtyPrefixBitSet.has(prefixFieldPathIdsByPathId[i]!)) return true
      }
      return false
    }

    const shouldRunStepById = (stepId: number): boolean => {
      const outId = execIr.stepOutFieldPathIdByStepId[stepId]
      if (typeof outId === 'number' && hasAnyDirtyPrefix(outId)) {
        return true
      }
      const depsStart = execIr.stepDepsOffsetsByStepId[stepId]
      const depsEnd = execIr.stepDepsOffsetsByStepId[stepId + 1]
      if (depsStart == null || depsEnd == null) return false
      for (let i = depsStart; i < depsEnd; i++) {
        if (hasAnyDirtyPrefix(execIr.stepDepsFieldPathIds[i]!)) return true
      }
      return false
    }

    const computePlanStepIds = (
      rootIds: ReadonlyArray<number>,
      options?: { readonly stopOnDecisionBudget?: boolean },
    ): { readonly plan?: Int32Array; readonly budgetCutoff?: true } => {
      // Small graphs and custom step slices are cheap to scan; keep the simpler logic.
      if (totalSteps < 32 || ctx.schedulingScopeStepIds != null) {
        dirtyPrefixBitSet.clear()
        for (let i = 0; i < rootIds.length; i++) {
          addPathPrefixes(rootIds[i]!)
        }

        let planLen = 0
        let checks = 0
        for (let i = 0; i < scopeStepIds.length; i++) {
          const stepId = scopeStepIds[i]!
          if (options?.stopOnDecisionBudget) {
            checks += 1
            if (checks >= 32) {
              checks = 0
              if (isDecisionBudgetExceeded()) {
                dirtyPrefixBitSet.clear()
                return { budgetCutoff: true } as const
              }
            }
          }

          if (!shouldRunStepById(stepId)) {
            continue
          }

          planScratch[planLen] = stepId
          planLen += 1
          addPathPrefixes(execIr.stepOutFieldPathIdByStepId[stepId]!)
        }

        const plan = execVmMode ? planScratch.subarray(0, planLen) : new Int32Array(planLen)
        if (!execVmMode && planLen > 0) {
          plan.set(planScratch.subarray(0, planLen))
        }
        dirtyPrefixBitSet.clear()
        return { plan } as const
      }

      // 059: Typed reachability (prefixId -> stepIds) + queue + bitset.
      dirtyPrefixBitSet.clear()
      reachableStepBitSet.clear()

      let queueLen = 0
      const enqueuePathPrefixes = (pathId: number): void => {
        const start = prefixOffsetsByPathId[pathId]
        const end = prefixOffsetsByPathId[pathId + 1]
        if (start == null || end == null) return
        for (let i = start; i < end; i++) {
          const prefixId = prefixFieldPathIdsByPathId[i]!
          if (dirtyPrefixBitSet.has(prefixId)) continue
          dirtyPrefixBitSet.add(prefixId)
          dirtyPrefixQueue[queueLen] = prefixId
          queueLen += 1
        }
      }

      for (let i = 0; i < rootIds.length; i++) {
        enqueuePathPrefixes(rootIds[i]!)
      }

      const isStepInScope = (stepId: number): boolean => {
        if (schedulingScope === 'all') return true
        const flag = execIr.stepSchedulingByStepId[stepId]
        return schedulingScope === 'immediate' ? flag === 0 : flag === 1
      }

      let cursor = 0
      let checks = 0
      while (cursor < queueLen) {
        if (options?.stopOnDecisionBudget) {
          checks += 1
          if (checks >= 32) {
            checks = 0
            if (isDecisionBudgetExceeded()) {
              dirtyPrefixBitSet.clear()
              return { budgetCutoff: true } as const
            }
          }
        }

        const prefixId = dirtyPrefixQueue[cursor]!
        cursor += 1

        const start = triggerStepOffsetsByFieldPathId[prefixId]
        const end = triggerStepOffsetsByFieldPathId[prefixId + 1]
        if (start == null || end == null) continue
        for (let i = start; i < end; i++) {
          const stepId = triggerStepIdsByFieldPathId[i]!
          if (!isStepInScope(stepId)) continue
          if (reachableStepBitSet.has(stepId)) continue
          reachableStepBitSet.add(stepId)
          enqueuePathPrefixes(execIr.stepOutFieldPathIdByStepId[stepId]!)
        }
      }

      let planLen = 0
      for (let i = 0; i < scopeStepIds.length; i++) {
        const stepId = scopeStepIds[i]!
        if (!reachableStepBitSet.has(stepId)) continue
        planScratch[planLen] = stepId
        planLen += 1
      }

      const plan = execVmMode ? planScratch.subarray(0, planLen) : new Int32Array(planLen)
      if (!execVmMode && planLen > 0) {
        plan.set(planScratch.subarray(0, planLen))
      }
      dirtyPrefixBitSet.clear()
      return { plan } as const
    }

    const cache = ctx.planCache
    if (
      cacheMissReasonHint === 'generation_bumped' &&
      typeof generationEvidence.generationBumpCount === 'number' &&
      generationEvidence.generationBumpCount >= 3 &&
      cache &&
      !cache.isDisabled()
    ) {
      cache.disable('generation_thrash')
    }
    const canUseCache =
      !!cache &&
      !cache.isDisabled() &&
      ctx.schedulingScopeStepIds == null &&
      !dirtyRootIds.dirtyAll &&
      dirtyRootIds.rootIds.length > 0
    const planKeyHash = dirtyRootIds.keyHash ^ (schedulingScope === 'all' ? 0 : schedulingScope === 'immediate' ? 1 : 2)
    const rootIdsKey = canUseCache ? dirtyRootIds.rootIds : undefined

    let cacheEvidence: TraitConvergePlanCacheEvidence | undefined = shouldCollectDecisionHeavyDetails
      ? {
          capacity: 0,
          size: 0,
          hits: 0,
          misses: 0,
          evicts: 0,
          hit: false,
        }
      : undefined

    let affectedSteps: number | undefined
    let planStepIds: Int32Array | undefined

    const getOrComputePlan = (options?: {
      readonly missReason?: TraitConvergePlanCacheEvidence['missReason']
      readonly stopOnDecisionBudget?: boolean
    }): { readonly plan?: Int32Array; readonly hit: boolean; readonly budgetCutoff?: true } => {
      if (dirtyRootIds.dirtyAll) {
        if (cacheEvidence && cache) {
          cacheEvidence = cache.evidence({
            hit: false,
            keySize: dirtyRootIds.keySize,
            missReason: options?.missReason ?? 'unknown',
          })
        }
        const fullPlan = scopeStepIds
        affectedSteps = fullPlan.length
        return { plan: fullPlan, hit: false }
      }

      if (canUseCache && cache && rootIdsKey) {
        const cached = cache.get(planKeyHash, rootIdsKey)
        if (cached) {
          if (cacheEvidence) {
            cacheEvidence = cache.evidence({
              hit: true,
              keySize: dirtyRootIds.keySize,
            })
          }
          affectedSteps = cached.length
          return { plan: cached, hit: true }
        }
      }

      // Decision budget is designed to cap worst-case plan computation cost.
      // For small graphs (<32 steps), the plan scan is bounded and the early cutoff
      // can introduce flakiness due to sub-ms clock jitter on some platforms.
      if (options?.stopOnDecisionBudget && totalSteps >= 32 && isDecisionBudgetExceeded()) {
        if (cacheEvidence && cache) {
          cacheEvidence = cache.evidence({
            hit: false,
            keySize: dirtyRootIds.keySize,
            missReason: options?.missReason ?? 'unknown',
          })
        }
        return { hit: false, budgetCutoff: true } as const
      }

      const computed = computePlanStepIds(dirtyRootIds.rootIds, {
        stopOnDecisionBudget: options?.stopOnDecisionBudget,
      })
      if (computed.budgetCutoff) {
        if (cacheEvidence && cache) {
          cacheEvidence = cache.evidence({
            hit: false,
            keySize: dirtyRootIds.keySize,
            missReason: options?.missReason ?? 'unknown',
          })
        }
        return { hit: false, budgetCutoff: true } as const
      }

      const plan = computed.plan ?? new Int32Array(0)
      if (canUseCache && cache && rootIdsKey) {
        cache.set(planKeyHash, rootIdsKey, execVmMode ? plan.slice() : plan)
      }
      if (cacheEvidence && cache) {
        cacheEvidence = cache.evidence({
          hit: false,
          keySize: dirtyRootIds.keySize,
          missReason: options?.missReason ?? 'not_cached',
        })
      }
      affectedSteps = plan.length
      return { plan, hit: false }
    }

    const NEAR_FULL_ROOT_RATIO_THRESHOLD = 0.75
    const NEAR_FULL_PLAN_RATIO_THRESHOLD = 0.9

    if (requestedMode === 'auto') {
      if (ctx.txnSeq === 1) {
        mode = 'full'
        reasons.push('cold_start')
      } else if (dirtyRootIds.dirtyAll) {
        mode = 'full'
        reasons.push('dirty_all')
        reasons.push('unknown_write')
      } else if (dirtyRootIds.rootIds.length === 0) {
        mode = 'full'
        reasons.push('unknown_write')
      } else {
        const rootRatio = scopeStepCount > 0 ? dirtyRootIds.rootCount / scopeStepCount : 1
        if (rootRatio >= NEAR_FULL_ROOT_RATIO_THRESHOLD) {
          mode = 'full'
          reasons.push('near_full')
        } else {
          const { plan, hit, budgetCutoff } = getOrComputePlan({
            missReason: cacheMissReasonHint ?? 'not_cached',
            stopOnDecisionBudget: decisionBudgetMs != null,
          })
          if (budgetCutoff || !plan) {
            mode = 'full'
            markDecisionBudgetCutoff()
          } else {
            planStepIds = plan
            reasons.push(hit ? 'cache_hit' : 'cache_miss')
            const ratio = scopeStepCount > 0 ? plan.length / scopeStepCount : 1
            if (ratio >= NEAR_FULL_PLAN_RATIO_THRESHOLD) {
              mode = 'full'
              reasons.push('near_full')
            } else {
              mode = 'dirty'
            }
          }
        }
      }
    } else {
      reasons.push('module_override')
      if (mode === 'dirty') {
        const { plan, hit } = getOrComputePlan({ missReason: cacheMissReasonHint ?? 'not_cached' })
        planStepIds = plan
        if (dirtyRootIds.dirtyAll) {
          reasons.push('dirty_all')
        } else if (cache && dirtyRootIds.rootIds.length > 0) {
          reasons.push(hit ? 'cache_hit' : 'cache_miss')
        }
      }
    }

    if (
      cacheEvidence?.disabled &&
      cacheEvidence.disableReason === 'low_hit_rate' &&
      !reasons.includes('low_hit_rate_protection')
    ) {
      reasons.push('low_hit_rate_protection')
    }

    executionStartedAt = ctx.now()
    if (requestedMode === 'auto') {
      decisionDurationMs = Math.max(0, executionStartedAt - decisionStartedAt)
    }

    let changedCount = 0

    const makeDecisionSummary = (params: {
      readonly outcome: TraitConvergeOutcomeTag
      readonly executedSteps: number
      readonly executionDurationMs: number
    }): TraitConvergeDecisionSummary => {
      const stepStats: TraitConvergeStepStats = {
        totalSteps,
        executedSteps: params.executedSteps,
        skippedSteps: Math.max(0, totalSteps - params.executedSteps),
        changedSteps: changedCount,
        ...(typeof affectedSteps === 'number' ? { affectedSteps } : null),
      }

      const base = {
        requestedMode,
        executedMode: mode,
        outcome: params.outcome,
        configScope,
        staticIrDigest,
        executionBudgetMs: ctx.budgetMs,
        executionDurationMs: params.executionDurationMs,
        ...(requestedMode === 'auto' && ctx.decisionBudgetMs != null
          ? { decisionBudgetMs: ctx.decisionBudgetMs }
          : null),
        ...(requestedMode === 'auto' && decisionDurationMs != null ? { decisionDurationMs } : null),
        reasons,
        stepStats,
      } satisfies TraitConvergeDecisionSummary

      if (!shouldCollectDecisionDetails) {
        return base
      }

      if (!shouldCollectDecisionHeavyDetails) {
        return {
          ...base,
          dirty: dirtySummary,
        } satisfies TraitConvergeDecisionSummary
      }

      return {
        ...base,
        thresholds: { floorRatio: AUTO_FLOOR_RATIO },
        dirty: dirtySummary,
        cache: cacheEvidence,
        generation: generationEvidence,
        staticIr: {
          fieldPathCount: ir.fieldPaths.length,
          stepCount: totalSteps,
          buildDurationMs: ir.buildDurationMs,
        },
        ...(timeSlicingSummary ? { timeSlicing: timeSlicingSummary } : {}),
        ...(diagnosticsSampling ? { diagnosticsSampling } : {}),
        ...(hotspots && hotspots.length > 0 ? { top3: hotspots.slice() } : {}),
      } satisfies TraitConvergeDecisionSummary
    }

    const steps: Array<ConvergeStepSummary> | undefined = diagnosticsLevel === 'full' ? [] : undefined
    let executedSteps = 0
    const canUseInPlaceDraft = ctx.allowInPlaceDraft === true && execIr.allOutPathsShallow
    const draft = canUseInPlaceDraft ? new ShallowInPlaceDraft(base) : new CowDraft(base)
    let budgetChecks = 0
    const rollbackDraft = (): void => {
      if (draft instanceof ShallowInPlaceDraft) {
        draft.rollback()
      }
      ctx.setDraft(base)
    }

    try {
      if (mode === 'dirty' && !planStepIds) {
        const { plan } = getOrComputePlan({ missReason: cacheMissReasonHint ?? 'not_cached' })
        planStepIds = plan
      }

      let dirtyPrefixSet: typeof dirtyPrefixBitSet | undefined
      if (mode === 'dirty' && !dirtyRootIds.dirtyAll) {
        dirtyPrefixBitSet.clear()
        const roots = dirtyRootIds.rootIds
        for (let i = 0; i < roots.length; i++) {
          addPathPrefixes(roots[i]!)
        }
        dirtyPrefixSet = dirtyPrefixBitSet
      }

      const stepIds = mode === 'dirty' && planStepIds ? planStepIds : scopeStepIds

      for (let i = 0; i < stepIds.length; i++) {
        const stepId = stepIds[i]!
        const entry = stepsInTopoOrder[stepId]
        if (!entry) continue

        const fieldPath = entry.fieldPath

        if (steps) {
          if (ctx.now() - executionStartedAt > ctx.budgetMs) {
            // Budget exceeded: soft degrade, roll back to base (avoid partially-applied state).
            rollbackDraft()
            const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
            const top3 = pickTop3Steps(steps)
            const summary: ConvergeSummary = {
              mode,
              budgetMs: ctx.budgetMs,
              totalDurationMs,
              totalSteps,
              executedSteps,
              skippedSteps: Math.max(0, totalSteps - executedSteps),
              changedSteps: changedCount,
              top3,
            }
            if (!reasons.includes('budget_cutoff')) reasons.push('budget_cutoff')
            const decision = makeDecisionSummary({
              outcome: 'Degraded',
              executedSteps,
              executionDurationMs: totalDurationMs,
            })
            if (decision && diagnosticsLevel !== 'off') {
              yield* emitTraitConvergeTraceEvent(decision)
            }
            return {
              _tag: 'Degraded',
              reason: 'budget_exceeded',
              summary,
              ...(decision ? { decision } : null),
            } as const
          }
        } else {
          budgetChecks += 1
          if (budgetChecks >= 32) {
            budgetChecks = 0
            if (ctx.now() - executionStartedAt > ctx.budgetMs) {
              // Budget exceeded: soft degrade, roll back to base (avoid partially-applied state).
              rollbackDraft()
              if (!reasons.includes('budget_cutoff')) reasons.push('budget_cutoff')
              const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
              const decision = shouldCollectDecision
                ? makeDecisionSummary({
                    outcome: 'Degraded',
                    executedSteps,
                    executionDurationMs: totalDurationMs,
                  })
                : undefined
              if (decision && diagnosticsLevel !== 'off') yield* emitTraitConvergeTraceEvent(decision)
              return {
                _tag: 'Degraded',
                reason: 'budget_exceeded',
                ...(decision ? { decision } : null),
              } as const
            }
          }
        }

        if (mode === 'dirty' && dirtyPrefixSet) {
          const shouldRun = shouldRunStepById(stepId)
          if (!shouldRun) {
            continue
          }
        }

        executedSteps += 1

        if (steps) {
          const stepStartedAt = ctx.now()
          const exit = yield* Effect.exit(
            runWriterStep(ctx, execIr, draft, stepId, entry, shouldCollectDecision, diagnosticsLevel, stack),
          )
          const stepEndedAt = ctx.now()
          const durationMs = Math.max(0, stepEndedAt - stepStartedAt)
          const stepKind = entry.kind === 'computed' ? 'computed' : 'link'
          const stepLabel = execIr.stepLabelByStepId[stepId] ?? String(stepId)
          const changed = exit._tag === 'Success' ? exit.value : false
          if (hotspots) {
            insertTopKHotspot({
              hotspots,
              topK: hotspotsTopK,
              next: {
                kind: stepKind,
                stepId,
                outFieldPathId: execIr.stepOutFieldPathIdByStepId[stepId],
                durationMs,
                changed,
              },
            })
          }
          steps.push({
            stepId: stepLabel,
            kind: stepKind,
            fieldPath,
            durationMs,
            changed,
          })
          if (exit._tag === 'Failure') {
            const error = toSerializableErrorSummary(exit.cause)
            rollbackDraft()
            const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
            const top3 = pickTop3Steps(steps)
            const summary: ConvergeSummary = {
              mode,
              budgetMs: ctx.budgetMs,
              totalDurationMs,
              totalSteps,
              executedSteps,
              skippedSteps: Math.max(0, totalSteps - executedSteps),
              changedSteps: changedCount,
              top3,
            }
            const decision = makeDecisionSummary({
              outcome: 'Degraded',
              executedSteps,
              executionDurationMs: totalDurationMs,
            })
            if (decision && diagnosticsLevel !== 'off') {
              yield* emitTraitConvergeTraceEvent(decision)
            }
            return {
              _tag: 'Degraded',
              reason: 'runtime_error',
              errorSummary: error.errorSummary,
              errorDowngrade: error.downgrade,
              summary,
              ...(decision ? { decision } : null),
            } as const
          }
          if (exit.value) {
            changedCount += 1
            if (mode === 'dirty' && dirtyPrefixSet) {
              addPathPrefixes(execIr.stepOutFieldPathIdByStepId[stepId]!)
            }
          }
          continue
        }

        if (hotspots) {
          const stepStartedAt = ctx.now()
          const exit = yield* Effect.exit(
            runWriterStep(ctx, execIr, draft, stepId, entry, shouldCollectDecision, diagnosticsLevel, stack),
          )
          const stepEndedAt = ctx.now()
          const durationMs = Math.max(0, stepEndedAt - stepStartedAt)
          const stepKind = entry.kind === 'computed' ? 'computed' : 'link'
          const changed = exit._tag === 'Success' ? exit.value : false
          insertTopKHotspot({
            hotspots,
            topK: hotspotsTopK,
            next: {
              kind: stepKind,
              stepId,
              outFieldPathId: execIr.stepOutFieldPathIdByStepId[stepId],
              durationMs,
              changed,
            },
          })

          if (exit._tag === 'Failure') {
            const error = toSerializableErrorSummary(exit.cause)
            rollbackDraft()
            const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
            const decision = makeDecisionSummary({
              outcome: 'Degraded',
              executedSteps,
              executionDurationMs: totalDurationMs,
            })
            if (decision && diagnosticsLevel !== 'off') {
              yield* emitTraitConvergeTraceEvent(decision)
            }
            return {
              _tag: 'Degraded',
              reason: 'runtime_error',
              errorSummary: error.errorSummary,
              errorDowngrade: error.downgrade,
              ...(decision ? { decision } : null),
            } as const
          }

          if (changed) {
            changedCount += 1
            if (mode === 'dirty' && dirtyPrefixSet) {
              addPathPrefixes(execIr.stepOutFieldPathIdByStepId[stepId]!)
            }
          }

          continue
        }

        // Off-fast-path: enabled only when middleware is empty and diagnostics=off, to keep near-zero overhead in off mode.
        // If you need deps tracing / mismatch diagnostics, switch to light/full/sampled explicitly.
        if (diagnosticsLevel === 'off' && stack.length === 0) {
          try {
            if (runWriterStepOffFast(ctx, execIr, draft, stepId, entry)) {
              changedCount += 1
              if (mode === 'dirty' && dirtyPrefixSet) {
                addPathPrefixes(execIr.stepOutFieldPathIdByStepId[stepId]!)
              }
            }
          } catch (e) {
            const error = toSerializableErrorSummary(e)
            rollbackDraft()
            const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
            const decision = shouldCollectDecision
              ? makeDecisionSummary({
                  outcome: 'Degraded',
                  executedSteps,
                  executionDurationMs: totalDurationMs,
                })
              : undefined
            if (decision && diagnosticsLevel !== 'off') yield* emitTraitConvergeTraceEvent(decision)
            return {
              _tag: 'Degraded',
              reason: 'runtime_error',
              errorSummary: error.errorSummary,
              errorDowngrade: error.downgrade,
              ...(decision ? { decision } : null),
            } as const
          }
          continue
        }

        const exit = yield* Effect.exit(
          runWriterStep(ctx, execIr, draft, stepId, entry, shouldCollectDecision, diagnosticsLevel, stack),
        )
        if (exit._tag === 'Failure') {
          const error = toSerializableErrorSummary(exit.cause)
          rollbackDraft()
          const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
          const decision = shouldCollectDecision
            ? makeDecisionSummary({
                outcome: 'Degraded',
                executedSteps,
                executionDurationMs: totalDurationMs,
              })
            : undefined
          if (decision && diagnosticsLevel !== 'off') yield* emitTraitConvergeTraceEvent(decision)
          return {
            _tag: 'Degraded',
            reason: 'runtime_error',
            errorSummary: error.errorSummary,
            errorDowngrade: error.downgrade,
            ...(decision ? { decision } : null),
          } as const
        }
        if (exit.value) {
          changedCount += 1
          if (mode === 'dirty' && dirtyPrefixSet) {
            addPathPrefixes(execIr.stepOutFieldPathIdByStepId[stepId]!)
          }
        }
      }
    } catch (e) {
      // Config error: hard fail (let the outer transaction entrypoint block commit).
      if (e instanceof StateTraitConfigError) {
        throw e
      }
      const error = toSerializableErrorSummary(e)
      // Runtime error: soft degrade, roll back to base (avoid partially-applied state).
      rollbackDraft()
      const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
      const summary: ConvergeSummary | undefined = steps
        ? {
            mode,
            budgetMs: ctx.budgetMs,
            totalDurationMs,
            totalSteps,
            executedSteps,
            skippedSteps: Math.max(0, totalSteps - executedSteps),
            changedSteps: changedCount,
            top3: pickTop3Steps(steps),
          }
        : undefined
      const decision = shouldCollectDecision
        ? makeDecisionSummary({
            outcome: 'Degraded',
            executedSteps,
            executionDurationMs: totalDurationMs,
          })
        : undefined
      if (decision && diagnosticsLevel !== 'off') yield* emitTraitConvergeTraceEvent(decision)
      return {
        _tag: 'Degraded',
        reason: 'runtime_error',
        errorSummary: error.errorSummary,
        errorDowngrade: error.downgrade,
        ...(summary ? { summary } : null),
        ...(decision ? { decision } : null),
      } as const
    }

    const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
    const outcome: TraitConvergeOutcomeTag = changedCount > 0 ? 'Converged' : 'Noop'
    const decision = shouldCollectDecision
      ? makeDecisionSummary({
          outcome,
          executedSteps,
          executionDurationMs: totalDurationMs,
        })
      : undefined
    if (decision && diagnosticsLevel !== 'off') yield* emitTraitConvergeTraceEvent(decision)

    return changedCount > 0
      ? ({
          _tag: 'Converged',
          patchCount: changedCount,
          ...(steps
            ? {
                summary: {
                  mode,
                  budgetMs: ctx.budgetMs,
                  totalDurationMs,
                  totalSteps,
                  executedSteps,
                  skippedSteps: Math.max(0, totalSteps - executedSteps),
                  changedSteps: changedCount,
                  top3: pickTop3Steps(steps),
                } satisfies ConvergeSummary,
              }
            : null),
          ...(decision ? { decision } : null),
        } as const)
      : ({
          _tag: 'Noop',
          ...(steps
            ? {
                summary: {
                  mode,
                  budgetMs: ctx.budgetMs,
                  totalDurationMs,
                  totalSteps,
                  executedSteps,
                  skippedSteps: Math.max(0, totalSteps - executedSteps),
                  changedSteps: changedCount,
                  top3: pickTop3Steps(steps),
                } satisfies ConvergeSummary,
              }
            : null),
          ...(decision ? { decision } : null),
        } as const)
  })
