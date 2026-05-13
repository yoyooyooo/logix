import { Effect } from 'effect'
import * as FieldKernelBuild from '../../field-kernel/build.js'
import * as FieldKernelConverge from '../../field-kernel/converge.js'
import { exportConvergeStaticIr, getConvergeStaticIrDigest } from '../../field-kernel/converge-ir.js'
import { makeConvergeExecIr } from '../../field-kernel/converge-exec-ir.js'
import type { FieldPath } from '../../field-path.js'
import { compareFieldPath, normalizeFieldPath, toKey } from '../../field-path.js'
import * as RowId from '../../field-kernel/rowid.js'
import type { FieldRuntimeState } from './ModuleRuntime.internalHooks.js'

export const DEFAULT_CONVERGE_PLAN_CACHE_CAPACITY = 128

export const makeFieldRuntimeState = (): FieldRuntimeState => ({
  program: undefined,
  convergeStaticIrDigest: undefined,
  convergePlanCache: undefined,
  convergeGeneration: {
    generation: 0,
    generationBumpCount: 0,
  },
  pendingCacheMissReason: undefined,
  pendingCacheMissReasonCount: 0,
  lastConvergeIrKeys: undefined,
  listConfigs: [],
})

export const collectListPathSet = (listConfigs: ReadonlyArray<RowId.ListConfig>): ReadonlySet<string> | undefined => {
  if (!Array.isArray(listConfigs) || listConfigs.length === 0) return undefined
  const set = new Set<string>()
  for (const cfg of listConfigs as ReadonlyArray<any>) {
    const p = cfg?.path
    if (typeof p === 'string' && p.length > 0) set.add(p)
  }
  return set.size > 0 ? set : undefined
}

export const collectExternalOwnedFieldPaths = (program: unknown): ReadonlyArray<FieldPath> =>
  (((program as any)?.entries ?? []) as ReadonlyArray<any>)
    .filter((e: any) => e && e.kind === 'externalStore' && typeof e.fieldPath === 'string')
    .map((e: any) => normalizeFieldPath(e.fieldPath))
    .filter((p: any): p is FieldPath => p != null)
    .sort(compareFieldPath)

export const makeExternalOwnedFieldPathKeys = (paths: ReadonlyArray<FieldPath>): ReadonlySet<string> =>
  new Set(paths.map((p) => toKey(p)))

export const makeRegisterFieldProgram = (args: {
  readonly fieldState: FieldRuntimeState
  readonly moduleId: string
  readonly instanceId: string
  readonly convergePlanCacheCapacity?: number
  readonly setListPathSet: (next: ReadonlySet<string> | undefined) => void
  readonly setExternalOwnedFieldPaths: (next: ReadonlyArray<FieldPath>) => void
  readonly setExternalOwnedFieldPathKeys: (next: ReadonlySet<string>) => void
  readonly registerConvergeStaticIr: (artifact: unknown) => void
}) => {
  const {
    fieldState,
    moduleId,
    instanceId,
    setListPathSet,
    setExternalOwnedFieldPaths,
    setExternalOwnedFieldPathKeys,
    registerConvergeStaticIr,
  } = args
  const convergePlanCacheCapacity = args.convergePlanCacheCapacity ?? DEFAULT_CONVERGE_PLAN_CACHE_CAPACITY

  return (program: any, registerOptions?: { readonly bumpReason?: any; readonly exportStaticIr?: boolean }): void => {
    const nextIr = (program as any).convergeIr
    const nextKeys = nextIr
      ? {
          writersKey: nextIr.writersKey,
          depsKey: nextIr.depsKey,
        }
      : undefined

    const requestedBumpReason = registerOptions?.bumpReason
    let bumpReason: any

    if (fieldState.lastConvergeIrKeys && nextKeys) {
      if (requestedBumpReason) {
        bumpReason = requestedBumpReason
      } else if (fieldState.lastConvergeIrKeys.writersKey !== nextKeys.writersKey) {
        bumpReason = 'writers_changed'
      } else if (fieldState.lastConvergeIrKeys.depsKey !== nextKeys.depsKey) {
        bumpReason = 'deps_changed'
      }
    } else if (fieldState.lastConvergeIrKeys && !nextKeys) {
      bumpReason = requestedBumpReason ?? 'unknown'
    }

    if (bumpReason) {
      const nextGeneration = fieldState.convergeGeneration.generation + 1
      const nextBumpCount = (fieldState.convergeGeneration.generationBumpCount ?? 0) + 1
      fieldState.convergeGeneration = {
        generation: nextGeneration,
        generationBumpCount: nextBumpCount,
        lastBumpReason: bumpReason,
      }

      fieldState.pendingCacheMissReason = 'generation_bumped'
      fieldState.pendingCacheMissReasonCount = (fieldState.pendingCacheMissReasonCount ?? 0) + 1
      fieldState.convergePlanCache = new FieldKernelConverge.ConvergePlanCache(convergePlanCacheCapacity)
    }

    fieldState.lastConvergeIrKeys = nextKeys

    const convergeIr = nextIr
      ? {
          ...nextIr,
          generation: fieldState.convergeGeneration.generation,
        }
      : undefined

    const prevConvergeIr = (fieldState.program as any)?.convergeIr as any | undefined
    const canPreserveInlinePlanCache =
      !!prevConvergeIr &&
      !!nextIr &&
      prevConvergeIr.writersKey === (nextIr as any).writersKey &&
      prevConvergeIr.depsKey === (nextIr as any).depsKey

    const prevConvergeExecIr = (fieldState.program as any)?.convergeExecIr as
      | ReturnType<typeof makeConvergeExecIr>
      | undefined

    const convergeExecIr =
      convergeIr && !(convergeIr as any).configError ? makeConvergeExecIr(convergeIr as any) : undefined

    if (convergeExecIr && prevConvergeExecIr) {
      convergeExecIr.perf.fullCommitEwmaOffMs = prevConvergeExecIr.perf.fullCommitEwmaOffMs
      convergeExecIr.perf.fullCommitLastTxnSeqOff = prevConvergeExecIr.perf.fullCommitLastTxnSeqOff
      convergeExecIr.perf.fullCommitMinOffMs = prevConvergeExecIr.perf.fullCommitMinOffMs
      convergeExecIr.perf.fullCommitSampleCountOff = prevConvergeExecIr.perf.fullCommitSampleCountOff
      convergeExecIr.perf.recentPlanMissHash1 = prevConvergeExecIr.perf.recentPlanMissHash1
      convergeExecIr.perf.recentPlanMissHash2 = prevConvergeExecIr.perf.recentPlanMissHash2

      const nextScratch: any = convergeExecIr.scratch as any
      const prevScratch: any = prevConvergeExecIr.scratch as any
      nextScratch.shallowInPlaceDraft = prevScratch.shallowInPlaceDraft

      if (canPreserveInlinePlanCache) {
        nextScratch.inlinePlanCacheHash1 = prevScratch.inlinePlanCacheHash1
        nextScratch.inlinePlanCacheSize1 = prevScratch.inlinePlanCacheSize1
        nextScratch.inlinePlanCachePlan1 = prevScratch.inlinePlanCachePlan1
        nextScratch.inlinePlanCacheHash2 = prevScratch.inlinePlanCacheHash2
        nextScratch.inlinePlanCacheSize2 = prevScratch.inlinePlanCacheSize2
        nextScratch.inlinePlanCachePlan2 = prevScratch.inlinePlanCachePlan2
        nextScratch.inlinePlanCacheRecentMissHash1 = prevScratch.inlinePlanCacheRecentMissHash1
        nextScratch.inlinePlanCacheRecentMissHash2 = prevScratch.inlinePlanCacheRecentMissHash2
      }
    }

    fieldState.convergeStaticIrDigest =
      convergeIr && !(convergeIr as any).configError ? getConvergeStaticIrDigest(convergeIr as any) : undefined

    fieldState.program = {
      ...(program as any),
      convergeIr,
      convergeExecIr,
    }
    fieldState.listConfigs = RowId.collectListConfigs((program as any).spec)
    setListPathSet(collectListPathSet(fieldState.listConfigs))

    const owned = collectExternalOwnedFieldPaths(program)
    setExternalOwnedFieldPaths(owned)
    setExternalOwnedFieldPathKeys(makeExternalOwnedFieldPathKeys(owned))

    if (!fieldState.convergePlanCache) {
      fieldState.convergePlanCache = new FieldKernelConverge.ConvergePlanCache(convergePlanCacheCapacity)
    }

    const exportStaticIrEnabled = registerOptions?.exportStaticIr !== false

    if (exportStaticIrEnabled && convergeIr && !(convergeIr as any).configError) {
      registerConvergeStaticIr(
        exportConvergeStaticIr({
          ir: convergeIr,
          moduleId,
          instanceId,
        }),
      )
    }
  }
}

export const installSchemaBackedFieldProgram = (args: {
  readonly stateSchema: unknown
  readonly registerFieldProgram: (program: any, options?: { readonly exportStaticIr?: boolean }) => void
}): Effect.Effect<void, never, never> =>
  Effect.sync(() => {
    if (!args.stateSchema) return
    try {
      args.registerFieldProgram(FieldKernelBuild.build(args.stateSchema as any, {} as any), { exportStaticIr: false })
    } catch {
      // best-effort: keep field program undefined and fall back to dirtyAll scheduling when registry is missing.
    }
  })
