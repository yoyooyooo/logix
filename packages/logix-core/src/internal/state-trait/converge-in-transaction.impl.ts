import { Effect, FiberRef } from 'effect'
import * as Debug from '../runtime/core/DebugSink.js'
import {
  toSerializableErrorSummary,
} from '../runtime/core/errorSummary.js'
import { dirtyPathsToRootIds, type DirtyAllReason, type FieldPath } from '../field-path.js'
import { getConvergeStaticIrDigest } from './converge-ir.js'
import { CowDraft, ShallowInPlaceDraft } from './converge-draft.js'
import { emitSchemaMismatch } from './converge-diagnostics.js'
import { currentExecVmMode } from './exec-vm-mode.js'
import { makeConvergeExecIr, type ConvergeExecIr } from './converge-exec-ir.js'
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

const EMPTY_INT32 = new Int32Array(0)

// Inline dirty plan computation for off-fast-path:
// - Must remain allocation-free in steady-state (no objects/closures per invocation).
// - Writes plan ids into execIr.scratch.planStepIds[0..planLen).
// - Returns:
//   -1 = invalid/unknown dirty path ids (fallback)
//   -2 = near-full (run full instead)
//   >=0 = plan length
const computeInlineDirtyPlanLenFromDirtyPathIdsSet = (
  execIr: ConvergeExecIr,
  dirtyPathIds: ReadonlySet<unknown>,
  scopeStepIds: Int32Array,
  scopeStepCount: number,
  schedulingScope: 'all' | 'immediate' | 'deferred',
  nearFullPlanRatioThreshold: number,
): number => {
  const prefixFieldPathIdsByPathId = execIr.prefixFieldPathIdsByPathId
  const prefixOffsetsByPathId = execIr.prefixOffsetsByPathId
  const triggerStepIdsByFieldPathId = execIr.triggerStepIdsByFieldPathId
  const triggerStepOffsetsByFieldPathId = execIr.triggerStepOffsetsByFieldPathId
  const stepOutFieldPathIdByStepId = execIr.stepOutFieldPathIdByStepId
  const stepSchedulingByStepId = execIr.stepSchedulingByStepId

  const dirtyPrefixBitSet = execIr.scratch.dirtyPrefixBitSet
  const reachableStepBitSet = execIr.scratch.reachableStepBitSet
  const dirtyPrefixQueue = execIr.scratch.dirtyPrefixQueue
  const planScratch = execIr.scratch.planStepIds

  dirtyPrefixBitSet.clear()
  reachableStepBitSet.clear()

  const fieldPathCount = execIr.fieldPathsById.length

  let queueLen = 0
  for (const raw of dirtyPathIds) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return -1
    }
    const id = Math.floor(raw)
    if (id < 0 || id >= fieldPathCount) {
      return -1
    }

    const start = prefixOffsetsByPathId[id]
    const end = prefixOffsetsByPathId[id + 1]
    if (start == null || end == null) continue

    for (let i = start; i < end; i++) {
      const prefixId = prefixFieldPathIdsByPathId[i]!
      if (dirtyPrefixBitSet.has(prefixId)) continue
      dirtyPrefixBitSet.add(prefixId)
      dirtyPrefixQueue[queueLen] = prefixId
      queueLen += 1
    }
  }

  const nearFullThreshold = Math.ceil(scopeStepCount * nearFullPlanRatioThreshold)

  let cursor = 0
  let reachableCount = 0
  while (cursor < queueLen) {
    const prefixId = dirtyPrefixQueue[cursor]!
    cursor += 1

    const start = triggerStepOffsetsByFieldPathId[prefixId]
    const end = triggerStepOffsetsByFieldPathId[prefixId + 1]
    if (start == null || end == null) continue

    for (let i = start; i < end; i++) {
      const stepId = triggerStepIdsByFieldPathId[i]!
      if (schedulingScope !== 'all') {
        const flag = stepSchedulingByStepId[stepId]
        if (schedulingScope === 'immediate') {
          if (flag !== 0) continue
        } else {
          if (flag !== 1) continue
        }
      }
      if (reachableStepBitSet.has(stepId)) continue
      reachableStepBitSet.add(stepId)
      reachableCount += 1

      // If we're going to run almost everything anyway, bail out early and just run full.
      if (reachableCount >= nearFullThreshold) {
        return -2
      }

      const outId = stepOutFieldPathIdByStepId[stepId]!
      const start2 = prefixOffsetsByPathId[outId]
      const end2 = prefixOffsetsByPathId[outId + 1]
      if (start2 == null || end2 == null) continue

      for (let j = start2; j < end2; j++) {
        const prefixId2 = prefixFieldPathIdsByPathId[j]!
        if (dirtyPrefixBitSet.has(prefixId2)) continue
        dirtyPrefixBitSet.add(prefixId2)
        dirtyPrefixQueue[queueLen] = prefixId2
        queueLen += 1
      }
    }
  }

  let planLen = 0
  for (let i = 0; i < scopeStepIds.length; i++) {
    const stepId = scopeStepIds[i]!
    if (!reachableStepBitSet.has(stepId)) continue
    planScratch[planLen] = stepId
    planLen += 1
  }

  // NOTE: plan ids are written into execIr.scratch.planStepIds[0..planLen).
  // Safe because inline-dirty uses the plan only for the current converge pass.
  return planLen
}

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
      // Carry over off-fast-path perf hints across generation bumps when step count is unchanged.
      // Motivation: avoid repeated warmup / misclassification after graph-change invalidation,
      // while still allowing the EWMA to adapt when the actual cost shifts.
      const prev = execIr
      const next = makeConvergeExecIr(ir)

      if (prev && prev.topoOrderInt32.length === next.topoOrderInt32.length) {
        next.perf.fullCommitEwmaOffMs = prev.perf.fullCommitEwmaOffMs
        next.perf.fullCommitSampleCountOff = prev.perf.fullCommitSampleCountOff
        next.perf.fullCommitLastTxnSeqOff = prev.perf.fullCommitLastTxnSeqOff
        // NOTE: do not carry over fullCommitMinOffMs; it never increases and can become stale across rebuilds.
      }

      execIr = next
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
    const shouldCollectDecisionDetails = shouldCollectDecision && diagnosticsLevel !== 'off'
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
    const dirtyPathCountHint = Array.isArray(dirtyPaths)
      ? dirtyPaths.length
      : typeof (dirtyPaths as any)?.size === 'number'
        ? ((dirtyPaths as any).size as number)
        : undefined

    type DirtyRootIds = {
      readonly dirtyAll: boolean
      readonly reason?: DirtyAllReason
      readonly rootIds: Int32Array
      readonly rootCount: number
      readonly keySize: number
      readonly keyHash: number
    }

    const makeDirtyAll = (reason: DirtyAllReason): DirtyRootIds => ({
      dirtyAll: true,
      reason,
      rootIds: EMPTY_INT32,
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    })

    const hashFieldPathIdsInt32 = (ids: Int32Array): number => {
      // FNV-1a (32-bit)
      let hash = 2166136261 >>> 0
      for (let i = 0; i < ids.length; i++) {
        hash ^= ids[i]! >>> 0
        hash = Math.imul(hash, 16777619)
      }
      return hash >>> 0
    }

    let dirtyRootIds: DirtyRootIds | undefined

    const DIRTY_ROOT_IDS_TOP_K = 3
    const AUTO_FLOOR_RATIO = 1.05
    const AUTO_FAST_FULL_EWMA_THRESHOLD_MS = 0.6
    const AUTO_FAST_FULL_WARMUP_FULL_SAMPLES_OFF = 2
    const AUTO_TINY_GRAPH_FULL_STEP_THRESHOLD = 2
    const MAX_CACHEABLE_ROOT_IDS = 128
    const MAX_CACHEABLE_ROOT_RATIO = 0.5
    const NO_CACHE_NEAR_FULL_STEP_THRESHOLD = 512

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
    const topoOrderInt32 = execIr.topoOrderInt32
    const topoIndexByStepId = execIr.topoIndexByStepId

    const dirtyPrefixBitSet = execIr.scratch.dirtyPrefixBitSet
    const reachableStepBitSet = execIr.scratch.reachableStepBitSet
    const dirtyPrefixQueue = execIr.scratch.dirtyPrefixQueue
    const dirtyRootIdsScratch = execIr.scratch.dirtyRootIds
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
      rootIds: Int32Array,
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

      // Materialize plan in topo order by scanning the scope slice.
      // This avoids TypedArray.sort() tail latency on some platforms.
      let planLen = 0
      for (let i = 0; i < scopeStepIds.length; i++) {
        const stepId = scopeStepIds[i]!
        if (!reachableStepBitSet.has(stepId)) continue
        planScratch[planLen] = stepId
        planLen += 1
      }

      const plan = execVmMode ? planScratch.subarray(0, planLen) : new Int32Array(planLen)
      if (!execVmMode && planLen > 0) {
        for (let i = 0; i < planLen; i++) {
          plan[i] = planScratch[i]!
        }
      }
      dirtyPrefixBitSet.clear()
      return { plan } as const
    }

    const cache = ctx.planCache
    const cacheMissReasonHintCount = ctx.cacheMissReasonHintCount ?? 0
    if (cacheMissReasonHint === 'generation_bumped' && cacheMissReasonHintCount >= 3 && cache && !cache.isDisabled()) {
      cache.disable('generation_thrash')
    }
    let canUseCache = false
    let planKeyHash = 0
    let rootIdsKey: Int32Array | undefined = undefined

    const ensureDirtyRootIds = (): DirtyRootIds => {
      if (dirtyRootIds) return dirtyRootIds

      if (ctx.dirtyAllReason) {
        dirtyRootIds = makeDirtyAll(ctx.dirtyAllReason)
      } else if (dirtyPaths instanceof Set) {
        dirtyPrefixBitSet.clear()

        let candidateLen = 0
        for (const raw of dirtyPaths as ReadonlySet<unknown>) {
          if (typeof raw !== 'number' || !Number.isFinite(raw)) {
            dirtyPrefixBitSet.clear()
            dirtyRootIds = makeDirtyAll('nonTrackablePatch')
            break
          }

          const id = Math.floor(raw)
          if (id < 0 || id >= execIr.fieldPathsById.length) {
            dirtyPrefixBitSet.clear()
            dirtyRootIds = makeDirtyAll('fallbackPolicy')
            break
          }

          dirtyPrefixBitSet.add(id)
          dirtyRootIdsScratch[candidateLen] = id
          candidateLen += 1
        }

        if (!dirtyRootIds) {
          if (candidateLen === 0) {
            dirtyPrefixBitSet.clear()
            dirtyRootIds = makeDirtyAll('unknownWrite')
          } else {
            let rootLen = 0
            for (let i = 0; i < candidateLen; i++) {
              const id = dirtyRootIdsScratch[i]!
              const start = prefixOffsetsByPathId[id]
              const end = prefixOffsetsByPathId[id + 1]
              if (start == null || end == null) continue

              // If any proper prefix is also directly dirty, skip this id.
              let coveredByDirtyPrefix = false
              for (let j = start; j < end - 1; j++) {
                const prefixId = prefixFieldPathIdsByPathId[j]!
                if (dirtyPrefixBitSet.has(prefixId)) {
                  coveredByDirtyPrefix = true
                  break
                }
              }
              if (coveredByDirtyPrefix) continue

              dirtyRootIdsScratch[rootLen] = id
              rootLen += 1
            }

            if (rootLen === 0) {
              dirtyPrefixBitSet.clear()
              dirtyRootIds = makeDirtyAll('unknownWrite')
            } else {
              const rootIds = dirtyRootIdsScratch.subarray(0, rootLen)
              rootIds.sort()
              const keyHash = hashFieldPathIdsInt32(rootIds)

              dirtyPrefixBitSet.clear()

              dirtyRootIds = {
                dirtyAll: false,
                rootIds,
                rootCount: rootIds.length,
                keySize: rootIds.length,
                keyHash,
              }
            }
          }
        }
      } else {
        const dirty = dirtyPathsToRootIds({
          dirtyPaths,
          registry,
          dirtyAllReason: ctx.dirtyAllReason,
        })

        dirtyRootIds = dirty.dirtyAll
          ? makeDirtyAll(dirty.reason ?? 'unknownWrite')
          : {
              dirtyAll: false,
              rootIds: Int32Array.from(dirty.rootIds),
              rootCount: dirty.rootCount,
              keySize: dirty.keySize,
              keyHash: dirty.keyHash,
            }
      }

      const rootRatioForCache =
        !dirtyRootIds.dirtyAll && scopeStepCount > 0 ? dirtyRootIds.rootCount / scopeStepCount : undefined
      const cacheableBySize =
        !dirtyRootIds.dirtyAll &&
        dirtyRootIds.rootIds.length > 0 &&
        dirtyRootIds.rootIds.length <= MAX_CACHEABLE_ROOT_IDS &&
        (rootRatioForCache == null || rootRatioForCache <= MAX_CACHEABLE_ROOT_RATIO)
      canUseCache =
        !!cache &&
        !cache.isDisabled() &&
        ctx.schedulingScopeStepIds == null &&
        cacheableBySize
      planKeyHash =
        dirtyRootIds.keyHash ^ (schedulingScope === 'all' ? 0 : schedulingScope === 'immediate' ? 1 : 2)
      rootIdsKey = canUseCache ? dirtyRootIds.rootIds : undefined
      return dirtyRootIds
    }

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
    let planStepCount: number | undefined

    const getOrComputePlan = (options?: {
      readonly missReason?: TraitConvergePlanCacheEvidence['missReason']
      readonly stopOnDecisionBudget?: boolean
    }): { readonly plan: Int32Array; readonly hit: boolean; readonly budgetCutoff?: true } => {
      const dirty = ensureDirtyRootIds()
	      if (dirty.dirtyAll) {
	        if (cacheEvidence && cache) {
	          cacheEvidence = cache.evidence({
	            hit: false,
	            keySize: dirty.keySize,
	            missReason: options?.missReason ?? 'unknown',
	          })
	        }
	        const fullPlan = scopeStepIds
	        affectedSteps = fullPlan.length
	        return { plan: fullPlan, hit: false }
	      }

	      // When we cannot reuse a plan (cache disabled / non-cacheable), doing expensive plan computation in auto mode
	      // tends to be a negative optimization in off-fast-path workloads.
	      if (requestedMode === 'auto' && diagnosticsLevel === 'off' && stack.length === 0 && (!canUseCache || !cache)) {
	        if (cacheEvidence && cache) {
	          cacheEvidence = cache.evidence({
	            hit: false,
	            keySize: dirty.keySize,
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
	              keySize: dirty.keySize,
	            })
	          }
	          affectedSteps = cached.length
	          return { plan: cached, hit: true }
	        }

	        // 2-hit admission for plan computation:
	        // - On cache miss, do NOT compute a plan until we observe the same key again.
	        // - Prevents high-cardinality dirty patterns from turning auto into a negative optimization.
	        if (requestedMode === 'auto' && diagnosticsLevel === 'off' && stack.length === 0) {
	          const h = planKeyHash
	          const seen1 = execIr.perf.recentPlanMissHash1
	          const seen2 = execIr.perf.recentPlanMissHash2
	          if (h !== seen1 && h !== seen2) {
	            execIr.perf.recentPlanMissHash2 = seen1
	            execIr.perf.recentPlanMissHash1 = h

	            if (cacheEvidence) {
	              cacheEvidence = cache.evidence({
	                hit: false,
	                keySize: dirty.keySize,
	                missReason: options?.missReason ?? 'unknown',
	              })
	            }

	            const fullPlan = scopeStepIds
	            affectedSteps = fullPlan.length
	            return { plan: fullPlan, hit: false }
	          }
	        }
	      }

      // Decision budget is designed to cap worst-case plan computation cost.
      // For small graphs (<32 steps), the plan scan is bounded and the early cutoff
      // can introduce flakiness due to sub-ms clock jitter on some platforms.
      if (options?.stopOnDecisionBudget && totalSteps >= 32 && isDecisionBudgetExceeded()) {
        if (cacheEvidence && cache) {
          cacheEvidence = cache.evidence({
            hit: false,
            keySize: dirty.keySize,
            missReason: options?.missReason ?? 'unknown',
          })
        }
        const fullPlan = scopeStepIds
        affectedSteps = fullPlan.length
        if (canUseCache && cache && rootIdsKey) {
          cache.set(planKeyHash, rootIdsKey.slice(), fullPlan)
        }
        return { plan: fullPlan, hit: false, budgetCutoff: true } as const
      }

      const computed = computePlanStepIds(dirty.rootIds, {
        stopOnDecisionBudget: options?.stopOnDecisionBudget,
      })
      if (computed.budgetCutoff) {
        if (cacheEvidence && cache) {
          cacheEvidence = cache.evidence({
            hit: false,
            keySize: dirty.keySize,
            missReason: options?.missReason ?? 'unknown',
          })
        }
        const fullPlan = scopeStepIds
        affectedSteps = fullPlan.length
        if (canUseCache && cache && rootIdsKey) {
          cache.set(planKeyHash, rootIdsKey.slice(), fullPlan)
        }
        return { plan: fullPlan, hit: false, budgetCutoff: true } as const
      }

      const plan = computed.plan ?? new Int32Array(0)
      if (canUseCache && cache && rootIdsKey) {
        cache.set(planKeyHash, rootIdsKey.slice(), execVmMode ? plan.slice() : plan)
      }
      if (cacheEvidence && cache) {
        cacheEvidence = cache.evidence({
          hit: false,
          keySize: dirty.keySize,
          missReason: options?.missReason ?? 'not_cached',
        })
      }
      affectedSteps = plan.length
      return { plan, hit: false }
    }

    const getNearFullRootRatioThreshold = (stepCount: number): number => {
      // Heuristic:
      // - For large graphs, computing/reusing a precise dirty plan can be dominated by decision/cache overhead,
      //   and can make auto slower than full under mixed dirty patterns (perf: converge-steps).
      // - Cut over to full earlier to keep auto<=full stable and avoid large retained plan-cache entries.
      if (stepCount >= 1536) return 0.65
      if (stepCount >= 1024) return 0.7
      if (stepCount >= 512) return 0.75
      return 0.9
    }
    const NEAR_FULL_PLAN_RATIO_THRESHOLD = 0.9
    const isOffFastPath = diagnosticsLevel === 'off' && stack.length === 0
    const fullCommitEwmaOffMs = execIr.perf.fullCommitEwmaOffMs
    const fullCommitMinOffMs = execIr.perf.fullCommitMinOffMs
    const fullCommitSampleCountOff = execIr.perf.fullCommitSampleCountOff ?? 0
    const nearFullRootRatioThreshold = getNearFullRootRatioThreshold(scopeStepCount)
    const rootRatioHint =
      typeof dirtyPathCountHint === 'number' && dirtyPathCountHint > 0
        ? scopeStepCount > 0
          ? dirtyPathCountHint / scopeStepCount
          : 1
        : undefined

    if (requestedMode === 'auto') {
      if (ctx.txnSeq === 1) {
        mode = 'full'
        reasons.push('cold_start')
      } else if (scopeStepCount <= AUTO_TINY_GRAPH_FULL_STEP_THRESHOLD) {
        mode = 'full'
        reasons.push('near_full')
      } else if (ctx.dirtyAllReason) {
        mode = 'full'
        reasons.push('dirty_all')
        reasons.push('unknown_write')
      } else if (dirtyPathCountHint === 0) {
        mode = 'full'
        reasons.push('unknown_write')
      } else if (rootRatioHint != null && rootRatioHint >= nearFullRootRatioThreshold) {
        mode = 'full'
        reasons.push('near_full')
      } else if (isOffFastPath) {
        // Off-fast-path is extremely sensitive to planning/caching overhead (sub-ms full converge).
        // Use a tiny (O(1)) inline admission strategy:
        // - If a dirty-pattern doesn't repeat, don't build a reachability plan; just run full.
        // - If it repeats, compute and (optionally) cache a small plan and run dirty.
        //
        // This keeps auto<=full stable under adversarial high-cardinality patterns.
        const scopeKey = schedulingScope === 'all' ? 0 : schedulingScope === 'immediate' ? 1 : 2
        const dirtyKeyHash = ctx.dirtyPathsKeyHash
        const dirtyKeySize = ctx.dirtyPathsKeySize
        const canUseInlineKey =
          dirtyPaths instanceof Set &&
          typeof dirtyKeyHash === 'number' &&
          Number.isFinite(dirtyKeyHash) &&
          typeof dirtyKeySize === 'number' &&
          Number.isFinite(dirtyKeySize) &&
          dirtyKeySize > 0 &&
          dirtyKeySize <= 64

        if (canUseInlineKey) {
          const inlineKeyHash = ((dirtyKeyHash ^ scopeKey) >>> 0) as number
          const scratch: any = execIr.scratch as any

          // Inline plan cache hit: reuse plan without any decision/plan build work.
          const h1 = scratch.inlinePlanCacheHash1 as number | undefined
          const s1 = scratch.inlinePlanCacheSize1 as number | undefined
          const b1 = scratch.inlinePlanCacheBuf1 as Int32Array | undefined
          const l1 = scratch.inlinePlanCachePlanLen1 as number | undefined
          if (inlineKeyHash === h1 && dirtyKeySize === s1 && b1 && typeof l1 === 'number' && l1 > 0) {
            mode = 'dirty'
            reasons.push('inline_dirty')
            reasons.push('cache_hit')
            planStepIds = b1
            planStepCount = l1
            affectedSteps = l1
          } else {
            const h2 = scratch.inlinePlanCacheHash2 as number | undefined
            const s2 = scratch.inlinePlanCacheSize2 as number | undefined
            const b2 = scratch.inlinePlanCacheBuf2 as Int32Array | undefined
            const l2 = scratch.inlinePlanCachePlanLen2 as number | undefined
            if (inlineKeyHash === h2 && dirtyKeySize === s2 && b2 && typeof l2 === 'number' && l2 > 0) {
              // Promote to MRU.
              scratch.inlinePlanCacheHash2 = h1
              scratch.inlinePlanCacheSize2 = s1
              scratch.inlinePlanCacheBuf2 = b1
              scratch.inlinePlanCachePlanLen2 = l1
              scratch.inlinePlanCacheHash1 = h2
              scratch.inlinePlanCacheSize1 = s2
              scratch.inlinePlanCacheBuf1 = b2
              scratch.inlinePlanCachePlanLen1 = l2

              mode = 'dirty'
              reasons.push('inline_dirty')
              reasons.push('cache_hit')
              planStepIds = b2
              planStepCount = l2
              affectedSteps = l2
            } else {
              // 2-hit admission for inline plan computation: build plan only after we see the same key again.
              const seen1 = scratch.inlinePlanCacheRecentMissHash1 as number | undefined
              const seen2 = scratch.inlinePlanCacheRecentMissHash2 as number | undefined

              if (inlineKeyHash !== seen1 && inlineKeyHash !== seen2) {
                scratch.inlinePlanCacheRecentMissHash2 = seen1
                scratch.inlinePlanCacheRecentMissHash1 = inlineKeyHash
                mode = 'full'
                reasons.push('low_hit_rate_protection')

                // If we keep seeing new keys with very few repeats, disable inline plan computation to avoid GC spikes.
                // (Cache hits still work; we only stop computing new plans.)
                if (scratch.inlinePlanCacheDisabled !== true) {
                  const prevSkips = scratch.inlinePlanCacheSkipCount as number | undefined
                  const nextSkips = (typeof prevSkips === 'number' && Number.isFinite(prevSkips) ? prevSkips : 0) + 1
                  scratch.inlinePlanCacheSkipCount = nextSkips

                  const prevComputes = scratch.inlinePlanCacheComputeCount as number | undefined
                  const computes = typeof prevComputes === 'number' && Number.isFinite(prevComputes) ? prevComputes : 0
                  if (nextSkips >= 32 && computes <= 2) {
                    scratch.inlinePlanCacheDisabled = true
                  }
                }
              } else {
                if (scratch.inlinePlanCacheDisabled === true) {
                  mode = 'full'
                  reasons.push('low_hit_rate_protection')
                } else {
                  mode = 'dirty'
                  reasons.push('inline_dirty')
                  reasons.push('cache_miss')

                  const prevComputes = scratch.inlinePlanCacheComputeCount as number | undefined
                  const nextComputes =
                    (typeof prevComputes === 'number' && Number.isFinite(prevComputes) ? prevComputes : 0) + 1
                  scratch.inlinePlanCacheComputeCount = nextComputes
                }
              }
            }
          }
        } else {
          // Fallback: if full is already cheap, pick full; otherwise run dirty inline.
          //
          // NOTE: we deliberately warm up a couple of full samples under off-fast-path so the EWMA/min can
          // converge after cold-start/JIT effects. Those warmup samples are typically discarded by perf harness.
          const fastFullMsCandidate =
            typeof fullCommitMinOffMs === 'number' && Number.isFinite(fullCommitMinOffMs)
              ? fullCommitMinOffMs
              : typeof fullCommitEwmaOffMs === 'number' && Number.isFinite(fullCommitEwmaOffMs)
                ? fullCommitEwmaOffMs
                : undefined
          const shouldWarmupFull =
            fullCommitSampleCountOff < AUTO_FAST_FULL_WARMUP_FULL_SAMPLES_OFF && scopeStepCount <= 1024

          if (
            shouldWarmupFull ||
            (typeof fastFullMsCandidate === 'number' &&
              Number.isFinite(fastFullMsCandidate) &&
              fastFullMsCandidate <= AUTO_FAST_FULL_EWMA_THRESHOLD_MS)
          ) {
            mode = 'full'
            reasons.push('fast_full')
          } else {
            mode = 'dirty'
            reasons.push('inline_dirty')
          }
        }
      } else {
        const dirty = ensureDirtyRootIds()
        if (dirty.dirtyAll) {
          mode = 'full'
          reasons.push('dirty_all')
          reasons.push('unknown_write')
        } else if (dirty.rootIds.length === 0) {
          mode = 'full'
          reasons.push('unknown_write')
        } else {
          const dirtyRootRatio = scopeStepCount > 0 ? dirty.rootCount / scopeStepCount : 1
          if (dirtyRootRatio >= nearFullRootRatioThreshold) {
            mode = 'full'
            reasons.push('near_full')
          } else if (
            !canUseCache &&
            scopeStepCount >= NO_CACHE_NEAR_FULL_STEP_THRESHOLD &&
            dirtyRootRatio >= nearFullRootRatioThreshold / AUTO_FLOOR_RATIO
          ) {
            // No reusable cache path + near-full roots on large graphs tends to pay decision cost without step pruning wins.
            mode = 'full'
            reasons.push('near_full')
          } else {
            const { plan, hit, budgetCutoff } = getOrComputePlan({
              missReason: cacheMissReasonHint ?? 'not_cached',
              stopOnDecisionBudget: decisionBudgetMs != null,
            })
            if (budgetCutoff) {
              markDecisionBudgetCutoff()
            }
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
        const dirty = ensureDirtyRootIds()
        const { plan, hit } = getOrComputePlan({ missReason: cacheMissReasonHint ?? 'not_cached' })
        planStepIds = plan
        if (dirty.dirtyAll) {
          reasons.push('dirty_all')
        } else if (cache && dirty.rootIds.length > 0) {
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

    const getDirtySummary = (): TraitConvergeDirtySummary | undefined => {
      if (!shouldCollectDecisionDetails) return undefined

      // Diagnostics contract:
      // - light/full: exported evidence expects dirty.rootIds as canonical anchor; rootPaths is materialized only on consumer side.
      // - sampled: keep slim by default (DebugSink strips heavy fields, but we also avoid unnecessary root mapping here).
      const requiresRootIds = diagnosticsLevel === 'light' || diagnosticsLevel === 'full'

      if (ctx.dirtyAllReason != null) {
        return {
          dirtyAll: true,
          reason: ctx.dirtyAllReason,
          rootCount: 0,
          ...(requiresRootIds ? { rootIds: [], rootIdsTruncated: false } : null),
        }
      }

      if (typeof dirtyPathCountHint === 'number' && dirtyPathCountHint === 0) {
        return {
          dirtyAll: true,
          reason: 'unknownWrite',
          rootCount: 0,
          ...(requiresRootIds ? { rootIds: [], rootIdsTruncated: false } : null),
        }
      }

      const dirty =
        requiresRootIds && dirtyRootIds == null && (diagnosticsLevel === 'light' || diagnosticsLevel === 'full')
          ? ensureDirtyRootIds()
          : dirtyRootIds

      if (dirty?.dirtyAll) {
        return {
          dirtyAll: true,
          reason: dirty.reason ?? 'unknownWrite',
          rootCount: 0,
          ...(requiresRootIds ? { rootIds: [], rootIdsTruncated: false } : null),
        }
      }

      if (dirty) {
        return {
          dirtyAll: false,
          rootCount: dirty.rootCount,
          ...(requiresRootIds
            ? {
                rootIds: Array.from(dirty.rootIds.subarray(0, DIRTY_ROOT_IDS_TOP_K)),
                rootIdsTruncated: dirty.rootIds.length > DIRTY_ROOT_IDS_TOP_K,
              }
            : null),
        }
      }

      if (typeof dirtyPathCountHint === 'number') {
        return {
          dirtyAll: false,
          rootCount: dirtyPathCountHint,
        }
      }

      return {
        dirtyAll: true,
        reason: 'unknownWrite',
        rootCount: 0,
        ...(requiresRootIds ? { rootIds: [], rootIdsTruncated: false } : null),
      }
    }

    executionStartedAt = ctx.now()
    if (requestedMode === 'auto') {
      decisionDurationMs = Math.max(0, executionStartedAt - decisionStartedAt)
    }

    let changedCount = 0
    const shouldCollectNearFullSlimDecision =
      diagnosticsLevel === 'off' && requestedMode === 'auto' && mode === 'full' && reasons.length === 1 && reasons[0] === 'near_full'
    const shouldCollectDecisionSummary = shouldCollectDecision && !shouldCollectNearFullSlimDecision

    const buildStepStats = (executedSteps: number): TraitConvergeStepStats => ({
      totalSteps,
      executedSteps,
      skippedSteps: Math.max(0, totalSteps - executedSteps),
      changedSteps: changedCount,
      ...(typeof affectedSteps === 'number' ? { affectedSteps } : null),
    })

    const makeDecisionSummary = (params: {
      readonly outcome: TraitConvergeOutcomeTag
      readonly executedSteps: number
      readonly executionDurationMs: number
    }): TraitConvergeDecisionSummary => {
      const stepStats = buildStepStats(params.executedSteps)

      return {
        requestedMode,
        executedMode: mode,
        outcome: params.outcome,
        configScope,
        staticIrDigest,
        executionBudgetMs: ctx.budgetMs,
        executionDurationMs: params.executionDurationMs,
        decisionBudgetMs: requestedMode === 'auto' ? ctx.decisionBudgetMs : undefined,
        decisionDurationMs: requestedMode === 'auto' ? decisionDurationMs : undefined,
        reasons,
        stepStats,
        dirty: shouldCollectDecisionDetails ? getDirtySummary() : undefined,
        thresholds: shouldCollectDecisionHeavyDetails ? { floorRatio: AUTO_FLOOR_RATIO } : undefined,
        cache: shouldCollectDecisionHeavyDetails ? cacheEvidence : undefined,
        generation: shouldCollectDecisionHeavyDetails ? generationEvidence : undefined,
        staticIr: shouldCollectDecisionHeavyDetails
          ? {
              fieldPathCount: ir.fieldPaths.length,
              stepCount: totalSteps,
              buildDurationMs: ir.buildDurationMs,
            }
          : undefined,
        timeSlicing: shouldCollectDecisionHeavyDetails ? timeSlicingSummary : undefined,
        diagnosticsSampling: shouldCollectDecisionHeavyDetails ? diagnosticsSampling : undefined,
        top3:
          shouldCollectDecisionHeavyDetails && hotspots && hotspots.length > 0
            ? hotspots.slice()
            : undefined,
      } satisfies TraitConvergeDecisionSummary
    }

    const makeNearFullSlimDecisionSummary = (params: {
      readonly outcome: TraitConvergeOutcomeTag
      readonly executedSteps: number
      readonly executionDurationMs: number
    }): TraitConvergeDecisionSummary => ({
      requestedMode,
      executedMode: mode,
      outcome: params.outcome,
      configScope,
      staticIrDigest: '',
      executionBudgetMs: ctx.budgetMs,
      executionDurationMs: params.executionDurationMs,
      decisionBudgetMs: requestedMode === 'auto' ? ctx.decisionBudgetMs : undefined,
      decisionDurationMs: requestedMode === 'auto' ? decisionDurationMs : undefined,
      reasons,
      stepStats: buildStepStats(params.executedSteps),
    })

    const steps: Array<ConvergeStepSummary> | undefined = diagnosticsLevel === 'full' ? [] : undefined
    let executedSteps = 0
    const canUseInPlaceDraft = ctx.allowInPlaceDraft === true && execIr.allOutPathsShallow
    const draft = (() => {
      if (!canUseInPlaceDraft) {
        return new CowDraft(base)
      }
      const scratch: any = execIr.scratch as any
      const cached = scratch.shallowInPlaceDraft as ShallowInPlaceDraft<S> | undefined
      if (cached) {
        cached.reset(base)
        return cached
      }
      const next = new ShallowInPlaceDraft(base)
      scratch.shallowInPlaceDraft = next
      return next
    })()
    let budgetChecks = 0
    const rollbackDraft = (): void => {
      if (draft instanceof ShallowInPlaceDraft) {
        draft.rollback()
      }
      ctx.setDraft(base)
    }

    try {
      if (mode === 'dirty' && !planStepIds) {
        // Inline dirty: build an actual plan (reachability) without hashing/caching.
        // This keeps decisionDurationMs ~0 but avoids scanning every step with shouldRunStepById,
        // and it supports transitive dirty propagation (out -> deps closure).
        let ok = false
        if (dirtyPaths instanceof Set) {
          const dirtyPathIds = dirtyPaths as ReadonlySet<unknown>
          const dirtyCount =
            typeof ctx.dirtyPathsKeySize === 'number'
              ? ctx.dirtyPathsKeySize
              : ((dirtyPathIds as any).size as number | undefined)

          // Micro-cache for inline_dirty:
          // - Avoids repeated reachability plan builds for stable dirty patterns (e.g. alternatingTwoStable),
          //   which can trigger p95 tail spikes due to JIT/GC timing in ultra-fast off-fast-path workloads.
          //
          // NOTE: This is deliberately tiny (2-entry) and has 2-hit admission to avoid thrashing on high-cardinality patterns.
          let inlineKeyHash: number | undefined
          if (typeof dirtyCount === 'number' && dirtyCount > 0 && dirtyCount <= 64) {
            const scopeKey = schedulingScope === 'all' ? 0 : schedulingScope === 'immediate' ? 1 : 2
            const preHash = ctx.dirtyPathsKeyHash

            if (typeof preHash === 'number') {
              inlineKeyHash = (preHash ^ scopeKey) >>> 0
            } else {
              let h = 2166136261 >>> 0
              let okKey = true
              for (const raw of dirtyPathIds) {
                if (typeof raw !== 'number' || !Number.isFinite(raw)) {
                  okKey = false
                  break
                }
                const id = Math.floor(raw)
                h ^= id >>> 0
                h = Math.imul(h, 16777619)
              }
              if (okKey) {
                inlineKeyHash = (h ^ scopeKey) >>> 0
              }
            }

            if (inlineKeyHash !== undefined) {
              const scratch: any = execIr.scratch as any
              const h1 = scratch.inlinePlanCacheHash1 as number | undefined
              const s1 = scratch.inlinePlanCacheSize1 as number | undefined
              const b1 = scratch.inlinePlanCacheBuf1 as Int32Array | undefined
              const l1 = scratch.inlinePlanCachePlanLen1 as number | undefined
              if (inlineKeyHash === h1 && dirtyCount === s1 && b1 && typeof l1 === 'number' && l1 > 0) {
                planStepIds = b1
                planStepCount = l1
                affectedSteps = l1
                ok = true
              } else {
                const h2 = scratch.inlinePlanCacheHash2 as number | undefined
                const s2 = scratch.inlinePlanCacheSize2 as number | undefined
                const b2 = scratch.inlinePlanCacheBuf2 as Int32Array | undefined
                const l2 = scratch.inlinePlanCachePlanLen2 as number | undefined
                if (inlineKeyHash === h2 && dirtyCount === s2 && b2 && typeof l2 === 'number' && l2 > 0) {
                  // Promote to MRU.
                  scratch.inlinePlanCacheHash2 = h1
                  scratch.inlinePlanCacheSize2 = s1
                  scratch.inlinePlanCacheBuf2 = b1
                  scratch.inlinePlanCachePlanLen2 = l1
                  scratch.inlinePlanCacheHash1 = h2
                  scratch.inlinePlanCacheSize1 = s2
                  scratch.inlinePlanCacheBuf1 = b2
                  scratch.inlinePlanCachePlanLen1 = l2

                  planStepIds = b2
                  planStepCount = l2
                  affectedSteps = l2
                  ok = true
                }
              }
            }
          }

          if (!ok) {
            const planLen = computeInlineDirtyPlanLenFromDirtyPathIdsSet(
              execIr,
              dirtyPathIds,
              scopeStepIds,
              scopeStepCount,
              schedulingScope,
              NEAR_FULL_PLAN_RATIO_THRESHOLD,
            )
            if (planLen === -2) {
              mode = 'full'
              affectedSteps = scopeStepCount
              if (!reasons.includes('near_full')) reasons.push('near_full')
              ok = true
            } else if (planLen >= 0) {
              planStepCount = planLen
              affectedSteps = planLen
              ok = true

              // 2-hit admission: cache only if the same pattern repeats.
              if (
                inlineKeyHash !== undefined &&
                typeof dirtyCount === 'number' &&
                dirtyCount > 0 &&
                dirtyCount <= 64 &&
                planLen > 0 &&
                planLen <= 256
              ) {
                const scratch: any = execIr.scratch as any
                const seen1 = scratch.inlinePlanCacheRecentMissHash1 as number | undefined
                const seen2 = scratch.inlinePlanCacheRecentMissHash2 as number | undefined
                const admit = inlineKeyHash === seen1 || inlineKeyHash === seen2

                if (admit) {
                  // Insert as MRU (shift existing entry1 to entry2) without allocating:
                  // - Reuse a fixed 2-slot typed buffer to avoid GC spikes under adversarial patterns.
                  const oldHash1 = scratch.inlinePlanCacheHash1 as number | undefined
                  const oldSize1 = scratch.inlinePlanCacheSize1 as number | undefined
                  const oldBuf1 = scratch.inlinePlanCacheBuf1 as Int32Array | undefined
                  const oldLen1 = scratch.inlinePlanCachePlanLen1 as number | undefined

                  const oldBuf2 = scratch.inlinePlanCacheBuf2 as Int32Array | undefined
                  const buf = oldBuf2 ?? new Int32Array(256)

                  for (let i = 0; i < planLen; i++) {
                    buf[i] = planScratch[i]!
                  }

                  scratch.inlinePlanCacheHash2 = oldHash1
                  scratch.inlinePlanCacheSize2 = oldSize1
                  scratch.inlinePlanCacheBuf2 = oldBuf1
                  scratch.inlinePlanCachePlanLen2 = oldLen1
                  scratch.inlinePlanCacheHash1 = inlineKeyHash
                  scratch.inlinePlanCacheSize1 = dirtyCount
                  scratch.inlinePlanCacheBuf1 = buf
                  scratch.inlinePlanCachePlanLen1 = planLen
                } else {
                  scratch.inlinePlanCacheRecentMissHash2 = seen1
                  scratch.inlinePlanCacheRecentMissHash1 = inlineKeyHash
                }
              }
            } else {
              // Fallback: cannot derive a reliable dirty plan from the Set.
              // Use the canonical dirty-root path (which may degrade to full) to preserve correctness.
              ok = false
            }
          }
        }

        if (!ok) {
          const dirty = ensureDirtyRootIds()
          if (dirty.dirtyAll) {
            mode = 'full'
            if (!reasons.includes('dirty_all')) reasons.push('dirty_all')
            if (!reasons.includes('unknown_write')) reasons.push('unknown_write')
          } else {
            const computed = computePlanStepIds(dirty.rootIds)
            const plan = computed.plan ?? new Int32Array(0)
            affectedSteps = plan.length
            const ratio = scopeStepCount > 0 ? plan.length / scopeStepCount : 1
            if (ratio >= NEAR_FULL_PLAN_RATIO_THRESHOLD) {
              mode = 'full'
              if (!reasons.includes('near_full')) reasons.push('near_full')
            } else {
              planStepIds = plan
            }
          }
        }
      }

      const stepIds =
        mode === 'dirty'
          ? planStepIds ?? (planStepCount != null ? planScratch : scopeStepIds)
          : scopeStepIds
      const stepCount =
        mode === 'dirty'
          ? planStepCount ?? (planStepIds ? planStepIds.length : scopeStepCount)
          : scopeStepCount

      for (let i = 0; i < stepCount; i++) {
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
          }

          continue
        }

        // Off-fast-path: enabled only when middleware is empty and diagnostics=off, to keep near-zero overhead in off mode.
        // If you need deps tracing / mismatch diagnostics, switch to light/full/sampled explicitly.
        if (diagnosticsLevel === 'off' && stack.length === 0) {
          try {
            if (runWriterStepOffFast(ctx, execIr, draft, stepId, entry)) {
              changedCount += 1
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

    if (draft instanceof ShallowInPlaceDraft) {
      // On success, keep the in-place writes but clear rollback bookkeeping (reuse scratch draft).
      draft.commit()
    }

    const totalDurationMs = Math.max(0, ctx.now() - executionStartedAt)
    const outcome: TraitConvergeOutcomeTag = changedCount > 0 ? 'Converged' : 'Noop'

    if (mode === 'dirty' && affectedSteps === undefined) {
      affectedSteps = executedSteps
    }

    if (mode === 'full' && diagnosticsLevel === 'off' && stack.length === 0) {
      // Skip cold-start samples: dominated by JIT/module init and poison the EWMA.
      if (ctx.txnSeq !== 1) {
        const perf = execIr.perf
        const prev = perf.fullCommitEwmaOffMs
        // Keep it O(1): a tiny EWMA is enough to decide if planning is worth trying at all.
        perf.fullCommitEwmaOffMs =
          typeof prev === 'number' && Number.isFinite(prev) ? prev * 0.8 + totalDurationMs * 0.2 : totalDurationMs
        const prevMin = perf.fullCommitMinOffMs
        perf.fullCommitMinOffMs =
          typeof prevMin === 'number' && Number.isFinite(prevMin) ? Math.min(prevMin, totalDurationMs) : totalDurationMs
        const prevCount = perf.fullCommitSampleCountOff ?? 0
        perf.fullCommitSampleCountOff = prevCount + 1
        if (typeof ctx.txnSeq === 'number' && Number.isFinite(ctx.txnSeq)) {
          perf.fullCommitLastTxnSeqOff = ctx.txnSeq
        }
      }
    }

    const decision = shouldCollectDecisionSummary
      ? makeDecisionSummary({
          outcome,
          executedSteps,
          executionDurationMs: totalDurationMs,
        })
      : shouldCollectNearFullSlimDecision
        ? makeNearFullSlimDecisionSummary({
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
