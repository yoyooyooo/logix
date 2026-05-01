import type { ConvergeStaticIrRegistry } from './converge-ir.js'
import type { FieldPath } from '../field-path.js'
import { DenseIdBitSet } from './bitset.js'

export interface ConvergeExecIr {
  readonly generation: number

  readonly fieldPathsById: ReadonlyArray<FieldPath>
  readonly prefixFieldPathIdsByPathId: Int32Array
  readonly prefixOffsetsByPathId: Int32Array

  /**
   * Reachability triggers (059):
   * - prefixPathId -> stepIds that should run when this prefix becomes dirty
   * - includes prefixes of step outPath and depsPaths
   */
  readonly triggerStepIdsByFieldPathId: Int32Array
  readonly triggerStepOffsetsByFieldPathId: Int32Array

  readonly topoOrderInt32: Int32Array
  /**
   * stepId -> topo index in {@link topoOrderInt32}.
   *
   * Used by auto-plan computation to sort small reachable sets without scanning
   * the entire topo slice every time (avoids O(totalSteps) tail cost).
   */
  readonly topoIndexByStepId: Int32Array
  readonly topoOrderImmediateInt32: Int32Array
  readonly topoOrderDeferredInt32: Int32Array
  /**
   * 0=immediate, 1=deferred（043）
   */
  readonly stepSchedulingByStepId: Uint8Array
  readonly stepLabelByStepId: ReadonlyArray<string>
  readonly stepOutFieldPathIdByStepId: Int32Array
  readonly stepFromFieldPathIdByStepId: Int32Array
  readonly allOutPathsShallow: boolean
  readonly stepDepsFieldPathIds: Int32Array
  readonly stepDepsOffsetsByStepId: Int32Array

  /**
   * Perf hints collected at runtime (per module instance, per generation).
   * Mutated only in hot paths and must remain O(1).
   */
  readonly perf: {
    /**
     * EWMA of full converge execution duration (ms) under the "off-fast-path"
     * (diagnostics=off, middleware stack empty).
     *
     * Used by auto mode to short-circuit planning when full is already cheap.
     */
    fullCommitEwmaOffMs?: number
    /**
     * Last txnSeq (stable anchor) where we executed a full converge under off-fast-path.
     * Used to periodically re-calibrate fullCommitEwmaOffMs after warmup/JIT effects.
     */
    fullCommitLastTxnSeqOff?: number
    /**
     * Minimum observed full converge duration (ms) under off-fast-path.
     * Helps auto mode quickly detect "full is already cheap" after warmup/JIT without getting stuck on cold-start outliers.
     */
    fullCommitMinOffMs?: number
    /**
     * Number of full converge samples recorded under off-fast-path (best-effort; for tuning/debug only).
     */
    fullCommitSampleCountOff?: number

    /**
     * "2-hit" admission control for plan computation under auto mode:
     * - On cache miss, we only pay the cost to compute a plan after the same key repeats.
     * - Prevents high-cardinality dirty patterns from turning auto into a negative optimization.
     */
    recentPlanMissHash1?: number
    recentPlanMissHash2?: number
  }

  readonly scratch: {
    readonly dirtyPrefixBitSet: DenseIdBitSet
    readonly reachableStepBitSet: DenseIdBitSet
    readonly dirtyPrefixQueue: Int32Array
    /**
     * Scratch buffer for building canonical (sorted+deduped) dirty root ids in hot paths
     * without allocating JS arrays on every txn window.
     *
     * Note: callers must treat it as ephemeral and must copy before storing into caches.
     */
    readonly dirtyRootIds: Int32Array
    readonly planStepIds: Int32Array
  }
}

export const makeConvergeExecIr = (ir: ConvergeStaticIrRegistry): ConvergeExecIr => {
  const generation = ir.generation

  const registry = ir.fieldPathIdRegistry
  const fieldPathsById = registry.fieldPaths

  const fieldPathCount = fieldPathsById.length
  const prefixOffsetsByPathId = new Int32Array(fieldPathCount + 1)
  let prefixCount = 0
  for (let pathId = 0; pathId < fieldPathCount; pathId++) {
    prefixOffsetsByPathId[pathId] = prefixCount
    prefixCount += fieldPathsById[pathId]?.length ?? 0
  }
  prefixOffsetsByPathId[fieldPathCount] = prefixCount

  const prefixFieldPathIdsByPathId = new Int32Array(prefixCount)
  for (let pathId = 0; pathId < fieldPathCount; pathId++) {
    const path = fieldPathsById[pathId]
    if (!path) continue
    let node = registry.root
    let cursor = prefixOffsetsByPathId[pathId]!
    for (const seg of path) {
      const next = node.children.get(seg)
      if (!next) {
        throw new Error(
          `[FieldKernel.converge] Failed to resolve prefix trie node for pathId=${String(pathId)} seg=${seg}`,
        )
      }
      node = next
      const id = node.id
      if (typeof id !== 'number') {
        throw new Error(`[FieldKernel.converge] Missing FieldPathId for prefix of pathId=${String(pathId)} seg=${seg}`)
      }
      prefixFieldPathIdsByPathId[cursor] = id
      cursor += 1
    }
  }

  const topoOrderInt32 = Int32Array.from(ir.topoOrder)

  const stepCount = ir.stepsById.length
  const topoIndexByStepId = new Int32Array(stepCount)
  topoIndexByStepId.fill(-1)
  for (let i = 0; i < topoOrderInt32.length; i++) {
    topoIndexByStepId[topoOrderInt32[i]!] = i
  }

  const stepSchedulingByStepId = new Uint8Array(stepCount)
  for (let stepId = 0; stepId < stepCount; stepId++) {
    stepSchedulingByStepId[stepId] = ir.stepSchedulingByStepId[stepId] === 'deferred' ? 1 : 0
  }

  const immediateTopo: Array<number> = []
  const deferredTopo: Array<number> = []
  for (const stepId of topoOrderInt32) {
    if (stepSchedulingByStepId[stepId] === 1) deferredTopo.push(stepId)
    else immediateTopo.push(stepId)
  }
  const topoOrderImmediateInt32 = Int32Array.from(immediateTopo)
  const topoOrderDeferredInt32 = Int32Array.from(deferredTopo)

  const stepLabelByStepId: Array<string> = new Array(stepCount)
  const stepOutFieldPathIdByStepId = new Int32Array(stepCount)
  const stepFromFieldPathIdByStepId = new Int32Array(stepCount)
  stepFromFieldPathIdByStepId.fill(-1)
  for (let stepId = 0; stepId < stepCount; stepId++) {
    if (topoIndexByStepId[stepId]! < 0) {
      throw new Error(`[FieldKernel.converge] Missing topo index for stepId=${String(stepId)} generation=${String(generation)}`)
    }
    const step = ir.stepsById[stepId]
    if (step) {
      stepLabelByStepId[stepId] =
        step.kind === 'computed'
          ? `computed:${step.fieldPath}`
          : step.kind === 'link'
            ? `link:${step.fieldPath}`
            : step.fieldPath
    } else {
      stepLabelByStepId[stepId] = String(stepId)
    }
    stepOutFieldPathIdByStepId[stepId] = ir.stepOutFieldPathIdByStepId[stepId] as number
    if (step?.kind === 'link') {
      const deps = ir.stepDepsFieldPathIdsByStepId[stepId]
      if (deps && deps.length > 0) {
        stepFromFieldPathIdByStepId[stepId] = deps[0] as number
      }
    }
  }

  const stepDepsOffsetsByStepId = new Int32Array(stepCount + 1)
  let depCount = 0
  for (let stepId = 0; stepId < stepCount; stepId++) {
    stepDepsOffsetsByStepId[stepId] = depCount
    const deps = ir.stepDepsFieldPathIdsByStepId[stepId] as ReadonlyArray<number> | undefined
    depCount += deps?.length ?? 0
  }
  stepDepsOffsetsByStepId[stepCount] = depCount

  const stepDepsFieldPathIds = new Int32Array(depCount)
  for (let stepId = 0; stepId < stepCount; stepId++) {
    const deps = ir.stepDepsFieldPathIdsByStepId[stepId] as ReadonlyArray<number> | undefined
    if (!deps || deps.length === 0) continue
    let cursor = stepDepsOffsetsByStepId[stepId]!
    for (let i = 0; i < deps.length; i++) {
      stepDepsFieldPathIds[cursor] = deps[i]!
      cursor += 1
    }
  }

  let allOutPathsShallow = true
  for (let stepId = 0; stepId < stepCount; stepId++) {
    const outPathId = stepOutFieldPathIdByStepId[stepId]!
    const path = fieldPathsById[outPathId]
    if (!path || path.length !== 1) {
      allOutPathsShallow = false
      break
    }
  }

  // 059: Build reachability trigger index (prefixId -> stepIds) for plan computation.
  const triggerStepCountsByFieldPathId = new Int32Array(fieldPathCount)
  for (let stepId = 0; stepId < stepCount; stepId++) {
    const outId = stepOutFieldPathIdByStepId[stepId]!
    {
      const start = prefixOffsetsByPathId[outId]!
      const end = prefixOffsetsByPathId[outId + 1]!
      for (let i = start; i < end; i++) {
        const prefixId = prefixFieldPathIdsByPathId[i]!
        triggerStepCountsByFieldPathId[prefixId] = (triggerStepCountsByFieldPathId[prefixId]! + 1) | 0
      }
    }

    const depsStart = stepDepsOffsetsByStepId[stepId]!
    const depsEnd = stepDepsOffsetsByStepId[stepId + 1]!
    for (let i = depsStart; i < depsEnd; i++) {
      const depId = stepDepsFieldPathIds[i]!
      const start = prefixOffsetsByPathId[depId]!
      const end = prefixOffsetsByPathId[depId + 1]!
      for (let j = start; j < end; j++) {
        const prefixId = prefixFieldPathIdsByPathId[j]!
        triggerStepCountsByFieldPathId[prefixId] = (triggerStepCountsByFieldPathId[prefixId]! + 1) | 0
      }
    }
  }

  const triggerStepOffsetsByFieldPathId = new Int32Array(fieldPathCount + 1)
  let triggerTotal = 0
  for (let fieldPathId = 0; fieldPathId < fieldPathCount; fieldPathId++) {
    triggerStepOffsetsByFieldPathId[fieldPathId] = triggerTotal
    triggerTotal += triggerStepCountsByFieldPathId[fieldPathId]!
  }
  triggerStepOffsetsByFieldPathId[fieldPathCount] = triggerTotal

  const triggerStepIdsByFieldPathId = new Int32Array(triggerTotal)
  for (let fieldPathId = 0; fieldPathId < fieldPathCount; fieldPathId++) {
    triggerStepCountsByFieldPathId[fieldPathId] = triggerStepOffsetsByFieldPathId[fieldPathId]!
  }

  for (let stepId = 0; stepId < stepCount; stepId++) {
    const outId = stepOutFieldPathIdByStepId[stepId]!
    {
      const start = prefixOffsetsByPathId[outId]!
      const end = prefixOffsetsByPathId[outId + 1]!
      for (let i = start; i < end; i++) {
        const prefixId = prefixFieldPathIdsByPathId[i]!
        const cursor = triggerStepCountsByFieldPathId[prefixId]!
        triggerStepIdsByFieldPathId[cursor] = stepId
        triggerStepCountsByFieldPathId[prefixId] = cursor + 1
      }
    }

    const depsStart = stepDepsOffsetsByStepId[stepId]!
    const depsEnd = stepDepsOffsetsByStepId[stepId + 1]!
    for (let i = depsStart; i < depsEnd; i++) {
      const depId = stepDepsFieldPathIds[i]!
      const start = prefixOffsetsByPathId[depId]!
      const end = prefixOffsetsByPathId[depId + 1]!
      for (let j = start; j < end; j++) {
        const prefixId = prefixFieldPathIdsByPathId[j]!
        const cursor = triggerStepCountsByFieldPathId[prefixId]!
        triggerStepIdsByFieldPathId[cursor] = stepId
        triggerStepCountsByFieldPathId[prefixId] = cursor + 1
      }
    }
  }

  return {
    generation,
    fieldPathsById,
    prefixFieldPathIdsByPathId,
    prefixOffsetsByPathId,
    triggerStepIdsByFieldPathId,
    triggerStepOffsetsByFieldPathId,
    topoOrderInt32,
    topoIndexByStepId,
    topoOrderImmediateInt32,
    topoOrderDeferredInt32,
    stepSchedulingByStepId,
    stepLabelByStepId,
    stepOutFieldPathIdByStepId,
    stepFromFieldPathIdByStepId,
    allOutPathsShallow,
    stepDepsFieldPathIds,
    stepDepsOffsetsByStepId,
    perf: {},
    scratch: {
      dirtyPrefixBitSet: new DenseIdBitSet(fieldPathCount),
      reachableStepBitSet: new DenseIdBitSet(stepCount),
      dirtyPrefixQueue: new Int32Array(fieldPathCount),
      dirtyRootIds: new Int32Array(fieldPathCount),
      planStepIds: new Int32Array(stepCount),
    },
  }
}
