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
   * - 用于将 FieldPathId 的语义（fieldPaths table）纳入 staticIrDigest 的稳定口径；
   * - build 阶段预计算，避免在运行时反复 stringify 大表。
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
 * ConvergeStaticIr digest（稳定口径）：
 * - 依赖 converge graph 的结构键（writersKey/depsKey）与 FieldPathId table key（fieldPathsKey）；
 * - 不得依赖 instanceId/时间/随机；
 * - 便于跨运行/跨进程对齐 Static IR 与整数映射。
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
