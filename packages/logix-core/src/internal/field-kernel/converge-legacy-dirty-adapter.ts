import { dirtyPathsToRootIds, type DirtyAllReason, type FieldPath } from '../field-path.js'
import type { TxnDirtyPlanSnapshot } from '../runtime/core/StateTransaction.js'
import {
  hashFieldPathIdsInt32,
  makeDirtyAll,
  planConverge,
  type ConvergePlanRequest,
  type ConvergePlanResult,
  type DirtyRootIds,
} from './converge-planner.js'
import type { ConvergeExecIr } from './converge-exec-ir.js'

export interface LegacyDirtyInput {
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPaths?: ReadonlySet<string | FieldPath | number> | ReadonlyArray<string | FieldPath | number>
}

export type LegacyConvergePlanRequest = Omit<ConvergePlanRequest, 'dirtyPlan'> &
  LegacyDirtyInput & {
    readonly dirtyPlan?: TxnDirtyPlanSnapshot
  }

export const dirtyRootIdsFromLegacyDirtyPaths = (args: LegacyDirtyInput & {
  readonly execIr: ConvergeExecIr
}): DirtyRootIds => {
  const { execIr, dirtyAllReason, dirtyPaths } = args
  if (dirtyAllReason) {
    return makeDirtyAll(dirtyAllReason, 'legacyDirtyPaths')
  }

  if (dirtyPaths instanceof Set) {
    const ids = Array.from(dirtyPaths)
      .filter((raw): raw is number => typeof raw === 'number' && Number.isFinite(raw))
      .map((raw) => Math.floor(raw))

    if (ids.length === 0) {
      return makeDirtyAll('unknownWrite', 'legacyDirtyPaths')
    }

    const rootIds = Int32Array.from(Array.from(new Set(ids)).sort((a, b) => a - b))
    return {
      dirtyAll: false,
      inputSource: 'legacyDirtyPaths',
      rootIds,
      rootCount: rootIds.length,
      keySize: rootIds.length,
      keyHash: hashFieldPathIdsInt32(rootIds),
    }
  }

  const dirty = dirtyPathsToRootIds({
    dirtyPaths: dirtyPaths ?? [],
    registry: execIr.fieldPathIdRegistry,
    dirtyAllReason,
  })

  if (dirty.dirtyAll) {
    return makeDirtyAll(dirty.reason ?? 'unknownWrite', 'legacyDirtyPaths')
  }

  return {
    dirtyAll: false,
    inputSource: 'legacyDirtyPaths',
    rootIds: Int32Array.from(dirty.rootIds),
    rootCount: dirty.rootCount,
    keySize: dirty.keySize,
    keyHash: dirty.keyHash,
  }
}

export const dirtyPlanSnapshotFromLegacyDirtyInput = (args: LegacyDirtyInput & {
  readonly execIr: ConvergeExecIr
}): TxnDirtyPlanSnapshot => {
  const dirtyRoots = dirtyRootIdsFromLegacyDirtyPaths(args)
  if (dirtyRoots.dirtyAll) {
    return {
      dirtyAll: true,
      dirtyAllReason: dirtyRoots.reason ?? 'unknownWrite',
      rawPathIds: [],
      rawKeyHash: 0,
      rawKeySize: 0,
      rootIds: new Int32Array(0),
      rootKeyHash: 0,
      rootCount: 0,
      authority: 'dirty-all',
      fieldPathCount: args.execIr.fieldPathsById.length,
      fieldPathsKey: args.execIr.fieldPathIdRegistry.fieldPathsKey,
    }
  }

  return {
    dirtyAll: false,
    rawPathIds: Array.from(dirtyRoots.rootIds),
    rawKeyHash: dirtyRoots.keyHash,
    rawKeySize: dirtyRoots.keySize,
    rootIds: dirtyRoots.rootIds,
    rootKeyHash: dirtyRoots.keyHash,
    rootCount: dirtyRoots.rootCount,
    authority: 'field-path-registry',
    fieldPathCount: args.execIr.fieldPathsById.length,
    fieldPathsKey: args.execIr.fieldPathIdRegistry.fieldPathsKey,
  }
}

export const planConvergeFromLegacyDirtyInput = (request: LegacyConvergePlanRequest): ConvergePlanResult => {
  const hasCanonicalDirtyPlan = request.dirtyPlan != null
  const result = planConverge({
    ...request,
    dirtyPlan: request.dirtyPlan ?? dirtyPlanSnapshotFromLegacyDirtyInput(request),
  })
  return hasCanonicalDirtyPlan ? result : { ...result, dirtyInputSource: 'legacyDirtyPaths' }
}
