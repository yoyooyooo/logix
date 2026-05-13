import type { DirtyAllReason } from '../field-path.js'
import type { TxnDirtyPlanSnapshot } from '../runtime/core/StateTransaction.js'
import { recordKernelHotPathFallback } from '../runtime/core/KernelHotPathAudit.js'
import { toConvergeKernelFallbackReason, type KernelFallbackReason } from '../runtime/core/kernelFallbackReason.js'
import type { ConvergeExecIr } from './converge-exec-ir.js'
import type { ConvergePlanCache } from './plan-cache.js'

export interface ConvergePlanRequest {
  readonly execIr: ConvergeExecIr
  readonly dirtyPlan: TxnDirtyPlanSnapshot | undefined
  readonly requestedMode: 'auto' | 'dirty' | 'full'
  readonly schedulingScope: 'all' | 'immediate' | 'deferred'
  readonly schedulingScopeStepIds?: Int32Array
  readonly diagnosticsLevel: 'off' | 'light' | 'full' | 'sampled'
  readonly middlewareStackEmpty: boolean
  readonly decisionBudgetMs?: number
  readonly planCache?: ConvergePlanCache
  readonly resolvedMode?: 'noop' | 'full' | 'dirty'
  readonly scopeStepIds?: Int32Array
  readonly scopeStepCount?: number
  readonly dirtyStepIds?: Int32Array
  readonly dirtyStepCount?: number
  readonly affectedStepCount?: number
  readonly decisionReason?: ConvergePlanResult['reason']
  readonly deferredStepIds?: Int32Array
  readonly deferredReachableStepIds?: Int32Array
}

export interface ConvergePlanResult {
  readonly mode: 'noop' | 'full' | 'dirty'
  readonly stepIds?: Int32Array
  readonly deferredReachableStepIds?: Int32Array
  readonly stepCount: number
  readonly affectedSteps: number
  readonly dirtyInputSource: DirtyPlanInputSource
  readonly kernelFallbackReason?: KernelFallbackReason
  readonly reason:
    | 'no_dirty'
    | 'dirty_all'
    | 'dirty_sparse'
    | 'near_full'
    | 'cache_hit'
    | 'cache_miss'
    | 'decision_budget_cutoff'
    | 'unknown_dirty'
  readonly planKeyHash: number
  readonly fallback?: 'unknown_dirty' | 'near_full' | 'decision_budget'
}

export type DirtyPlanInputSource = 'dirtyPlan' | 'legacyDirtyPaths'

export type DirtyRootIds = {
  readonly dirtyAll: boolean
  readonly inputSource: DirtyPlanInputSource
  readonly reason?: DirtyAllReason
  readonly rootIds: Int32Array
  readonly rootCount: number
  readonly keySize: number
  readonly keyHash: number
}

export type ResolvedDirtyPlanState =
  | { readonly kind: 'exact-empty' }
  | {
      readonly kind: 'exact-roots'
      readonly rootIds: Int32Array
      readonly rootCount: number
      readonly keyHash: number
    }
  | { readonly kind: 'dirty-all'; readonly reason: DirtyAllReason }

export const EMPTY_INT32 = new Int32Array(0)

export const makeDirtyAll = (
  reason: DirtyAllReason,
  inputSource: DirtyPlanInputSource = 'legacyDirtyPaths',
): DirtyRootIds => ({
  dirtyAll: true,
  inputSource,
  reason,
  rootIds: EMPTY_INT32,
  rootCount: 0,
  keySize: 0,
  keyHash: 0,
})

export const hashFieldPathIdsInt32 = (ids: Int32Array): number => {
  let hash = 2166136261 >>> 0
  for (let i = 0; i < ids.length; i++) {
    hash ^= ids[i]! >>> 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const resolveDirtyPlanState = (args: {
  readonly dirtyPlan: TxnDirtyPlanSnapshot | undefined
}): ResolvedDirtyPlanState | undefined => {
  const dirtyPlan = args.dirtyPlan

  if (dirtyPlan) {
    if (dirtyPlan.dirtyAll) {
      return { kind: 'dirty-all', reason: dirtyPlan.dirtyAllReason ?? 'unknownWrite' }
    }

    if (
      dirtyPlan.authority === 'field-path-registry' &&
      dirtyPlan.rootCount === 0 &&
      dirtyPlan.rootIds.length === 0 &&
      dirtyPlan.rawKeySize === 0
    ) {
      return { kind: 'exact-empty' }
    }

    return {
      kind: 'exact-roots',
      rootIds: dirtyPlan.rootIds,
      rootCount: dirtyPlan.rootCount,
      keyHash: dirtyPlan.rootKeyHash,
    }
  }

  return undefined
}

export const isExactEmptyDirtyPlan = (args: {
  readonly dirtyPlan: TxnDirtyPlanSnapshot | undefined
}): boolean => resolveDirtyPlanState(args)?.kind === 'exact-empty'

export const dirtyRootIdsFromDirtyPlan = (
  dirtyPlan: TxnDirtyPlanSnapshot | undefined,
): DirtyRootIds | undefined => {
  if (!dirtyPlan) return undefined
  const state = resolveDirtyPlanState({ dirtyPlan })
  if (!state) return undefined
  if (state.kind === 'dirty-all') return makeDirtyAll(state.reason, 'dirtyPlan')
  if (state.kind === 'exact-empty') {
    return {
      dirtyAll: false,
      inputSource: 'dirtyPlan',
      rootIds: EMPTY_INT32,
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }
  return {
    dirtyAll: false,
    inputSource: 'dirtyPlan',
    rootIds: state.rootIds,
    rootCount: state.rootCount,
    keySize: state.rootCount,
    keyHash: state.keyHash,
  }
}

export const resolveScopeKey = (scope: ConvergePlanRequest['schedulingScope']): number =>
  scope === 'all' ? 0 : scope === 'immediate' ? 1 : 2

export const resolvePlanKeyHash = (args: {
  readonly dirtyRoots: DirtyRootIds
  readonly schedulingScope: ConvergePlanRequest['schedulingScope']
}): number => (args.dirtyRoots.keyHash ^ resolveScopeKey(args.schedulingScope)) >>> 0

export const computeDeferredReachableStepIds = (args: {
  readonly execIr: ConvergeExecIr
  readonly dirtyRoots: DirtyRootIds
  readonly deferredStepIds: Int32Array
}): Int32Array | undefined => {
  const { execIr, dirtyRoots, deferredStepIds } = args
  if (deferredStepIds.length === 0) return undefined
  if (dirtyRoots.dirtyAll) return deferredStepIds
  if (dirtyRoots.rootCount <= 0 || dirtyRoots.rootIds.length === 0) return undefined

  const prefixFieldPathIdsByPathId = execIr.prefixFieldPathIdsByPathId
  const prefixOffsetsByPathId = execIr.prefixOffsetsByPathId
  const triggerStepIdsByFieldPathId = execIr.triggerStepIdsByFieldPathId
  const triggerStepOffsetsByFieldPathId = execIr.triggerStepOffsetsByFieldPathId
  const stepOutFieldPathIdByStepId = execIr.stepOutFieldPathIdByStepId
  const dirtyPrefixBitSet = execIr.scratch.dirtyPrefixBitSet
  const reachableStepBitSet = execIr.scratch.reachableStepBitSet
  const dirtyPrefixQueue = execIr.scratch.dirtyPrefixQueue

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

  for (let i = 0; i < dirtyRoots.rootCount; i++) {
    enqueuePathPrefixes(dirtyRoots.rootIds[i]!)
  }

  let cursor = 0
  while (cursor < queueLen) {
    const prefixId = dirtyPrefixQueue[cursor]!
    cursor += 1

    const start = triggerStepOffsetsByFieldPathId[prefixId]
    const end = triggerStepOffsetsByFieldPathId[prefixId + 1]
    if (start == null || end == null) continue

    for (let i = start; i < end; i++) {
      const stepId = triggerStepIdsByFieldPathId[i]!
      if (reachableStepBitSet.has(stepId)) continue
      reachableStepBitSet.add(stepId)
      enqueuePathPrefixes(stepOutFieldPathIdByStepId[stepId]!)
    }
  }

  const out: Array<number> = []
  for (let i = 0; i < deferredStepIds.length; i++) {
    const stepId = deferredStepIds[i]!
    if (!reachableStepBitSet.has(stepId)) continue
    out.push(stepId)
  }

  dirtyPrefixBitSet.clear()
  reachableStepBitSet.clear()
  return out.length > 0 ? Int32Array.from(out) : undefined
}

export const planConverge = (request: ConvergePlanRequest): ConvergePlanResult => {
  const scopeStepIds =
    request.scopeStepIds ??
    request.schedulingScopeStepIds ??
    (request.schedulingScope === 'immediate'
      ? request.execIr.topoOrderImmediateInt32
      : request.schedulingScope === 'deferred'
        ? request.execIr.topoOrderDeferredInt32
        : request.execIr.topoOrderInt32)
  const scopeStepCount = request.scopeStepCount ?? scopeStepIds.length
  const dirtyRoots =
    dirtyRootIdsFromDirtyPlan(request.dirtyPlan) ??
    makeDirtyAll('unknownWrite', 'dirtyPlan')
  const planKeyHash = resolvePlanKeyHash({
    dirtyRoots,
    schedulingScope: request.schedulingScope,
  })
  const fallbackReason =
    request.decisionReason ??
    (dirtyRoots.dirtyAll
      ? 'dirty_all'
      : dirtyRoots.rootCount === 0
        ? 'no_dirty'
        : request.resolvedMode === 'full'
          ? 'near_full'
          : 'dirty_sparse')
  if (dirtyRoots.inputSource === 'legacyDirtyPaths') {
    recordKernelHotPathFallback('converge_dirty_plan', 'legacy_dirty_input')
  } else if (dirtyRoots.dirtyAll) {
    recordKernelHotPathFallback('converge_dirty_plan', toConvergeKernelFallbackReason(fallbackReason))
  }

  if (request.resolvedMode === 'noop' || (!dirtyRoots.dirtyAll && dirtyRoots.rootCount === 0 && request.resolvedMode !== 'full')) {
    return {
      mode: 'noop',
      stepCount: 0,
      affectedSteps: 0,
      dirtyInputSource: dirtyRoots.inputSource,
      ...(dirtyRoots.inputSource === 'legacyDirtyPaths'
        ? { kernelFallbackReason: toConvergeKernelFallbackReason(dirtyRoots.inputSource) }
        : null),
      reason: 'no_dirty',
      planKeyHash,
    }
  }

  if (request.resolvedMode === 'dirty') {
    const stepIds = request.dirtyStepIds
    const stepCount = request.dirtyStepCount ?? stepIds?.length ?? 0
    const deferredReachableStepIds =
      request.schedulingScope === 'immediate'
        ? request.deferredReachableStepIds ??
          computeDeferredReachableStepIds({
            execIr: request.execIr,
            dirtyRoots,
            deferredStepIds: request.deferredStepIds ?? request.execIr.topoOrderDeferredInt32,
          })
        : undefined
    return {
      mode: 'dirty',
      ...(stepIds ? { stepIds } : null),
      ...(deferredReachableStepIds ? { deferredReachableStepIds } : null),
      stepCount,
      affectedSteps: request.affectedStepCount ?? stepCount,
      dirtyInputSource: dirtyRoots.inputSource,
      ...(dirtyRoots.inputSource === 'legacyDirtyPaths'
        ? { kernelFallbackReason: toConvergeKernelFallbackReason(dirtyRoots.inputSource) }
        : null),
      reason: fallbackReason === 'no_dirty' || fallbackReason === 'dirty_all' ? 'dirty_sparse' : fallbackReason,
      planKeyHash,
    }
  }

  return {
    mode: 'full',
    stepIds: scopeStepIds,
    stepCount: scopeStepCount,
    affectedSteps: request.affectedStepCount ?? scopeStepCount,
    dirtyInputSource: dirtyRoots.inputSource,
    ...(dirtyRoots.dirtyAll
      ? { kernelFallbackReason: toConvergeKernelFallbackReason(fallbackReason) }
      : dirtyRoots.inputSource === 'legacyDirtyPaths'
        ? { kernelFallbackReason: toConvergeKernelFallbackReason(dirtyRoots.inputSource) }
        : null),
    reason: fallbackReason === 'no_dirty' ? 'near_full' : fallbackReason,
    planKeyHash,
    ...(dirtyRoots.dirtyAll ? { fallback: 'unknown_dirty' } : null),
  }
}
