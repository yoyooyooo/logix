import type { FieldPath, FieldPathId, FieldPathIdRegistry } from '../field-path.js'
import { fnv1a32, stableStringify } from '../digest.js'
import type { StateTraitEntry, TraitConvergeScheduling } from './model.js'

export type ConvergeStepId = number

/**
 * ConvergeStaticIrRegistry：
 * - Converge-only static IR generated during build/load (stable within a generation).
 * - Hot paths prefer integer-backed structures; keep only the necessary tables for evidence export and explainability.
 */
export interface ConvergeStaticIrRegistry {
  readonly generation: number
  /**
   * writerKey/depsKey：
   * - Used to determine "structural changes" of Converge Static IR (bump generation++ and invalidate strictly).
   * - Does not include generation itself.
   */
  readonly writersKey: string
  readonly depsKey: string
  /**
   * fieldPathsKey：
   * - Incorporates FieldPathId semantics (fieldPaths table) into the stable definition of staticIrDigest;
   * - Precomputed at build time to avoid repeatedly stringifying large tables at runtime.
   */
  readonly fieldPathsKey: string
  readonly fieldPaths: ReadonlyArray<FieldPath>
  readonly fieldPathIdRegistry: FieldPathIdRegistry
  readonly configError?: {
    readonly code: 'CYCLE_DETECTED' | 'MULTIPLE_WRITERS'
    readonly message: string
    readonly fields: ReadonlyArray<string>
  }

  /**
   * stepsById：
   * - StepId -> writer entry (currently computed/link only).
   * - Numbered by topo order by default (so topoOrder is usually 0..stepCount-1).
   */
  readonly stepsById: ReadonlyArray<StateTraitEntry<any, string>>

  readonly stepOutFieldPathIdByStepId: ReadonlyArray<FieldPathId>
  readonly stepDepsFieldPathIdsByStepId: ReadonlyArray<ReadonlyArray<FieldPathId>>
  readonly stepSchedulingByStepId: ReadonlyArray<TraitConvergeScheduling>

  readonly topoOrder: ReadonlyArray<ConvergeStepId>
  readonly buildDurationMs: number
}

export interface ConvergeStaticIrExport {
  readonly staticIrDigest: string
  readonly moduleId: string
  readonly instanceId: string
  readonly generation: number
  readonly fieldPaths: ReadonlyArray<FieldPath>
  readonly stepOutFieldPathIdByStepId: ReadonlyArray<number>
  readonly stepSchedulingByStepId: ReadonlyArray<TraitConvergeScheduling>
  readonly topoOrder?: ReadonlyArray<number>
  readonly buildDurationMs?: number
}

/**
 * ConvergeStaticIr digest (stable definition):
 * - Depends on the converge graph structural keys (writersKey/depsKey) and the FieldPathId table key (fieldPathsKey);
 * - Must not depend on instanceId/time/randomness;
 * - Enables aligning Static IR and integer mappings across runs/processes.
 */
export const getConvergeStaticIrDigest = (
  ir: Pick<ConvergeStaticIrRegistry, 'writersKey' | 'depsKey' | 'fieldPathsKey'>,
): string => {
  const hash = fnv1a32(
    stableStringify({ writersKey: ir.writersKey, depsKey: ir.depsKey, fieldPathsKey: ir.fieldPathsKey }),
  )
  return `converge_ir_v2:${hash}`
}

export const exportConvergeStaticIr = (options: {
  readonly ir: ConvergeStaticIrRegistry
  readonly moduleId: string
  readonly instanceId: string
}): ConvergeStaticIrExport => ({
  staticIrDigest: getConvergeStaticIrDigest(options.ir),
  moduleId: options.moduleId,
  instanceId: options.instanceId,
  generation: options.ir.generation,
  fieldPaths: options.ir.fieldPaths,
  stepOutFieldPathIdByStepId: Array.from(options.ir.stepOutFieldPathIdByStepId),
  stepSchedulingByStepId: options.ir.stepSchedulingByStepId.slice(),
  topoOrder: options.ir.topoOrder.slice(),
  buildDurationMs: options.ir.buildDurationMs,
})
