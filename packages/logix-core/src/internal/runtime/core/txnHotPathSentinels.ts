export type TxnHotPathSentinelSnapshot = {
  readonly debugEventAllocCountOff: number
  readonly patchObjectMaterializeCountLight: number
  readonly snapshotObjectMaterializeCountLight: number
  readonly joinSplitInTxnWindowCount: number
  readonly dirtyAllFallbackCountP1Gate: number
  readonly dirtyBufferClearEntryCount: number
  readonly dirtyPlanRawPathArrayMaterializeCount: number
  readonly dirtyPlanRawPathArrayMaterializeEntryCount: number
  readonly dirtyPlanRootInt32MaterializeCount: number
  readonly dirtyPlanRootInt32MaterializeEntryCount: number
  readonly dirtyPlanListIndexInt32MaterializeCount: number
  readonly dirtyPlanListIndexInt32MaterializeEntryCount: number
  readonly fieldPathKeyMaterializeCount: number
  readonly fieldPathKeyMaterializeSegmentCount: number
}

const counters = {
  debugEventAllocCountOff: 0,
  patchObjectMaterializeCountLight: 0,
  snapshotObjectMaterializeCountLight: 0,
  joinSplitInTxnWindowCount: 0,
  dirtyAllFallbackCountP1Gate: 0,
  dirtyBufferClearEntryCount: 0,
  dirtyPlanRawPathArrayMaterializeCount: 0,
  dirtyPlanRawPathArrayMaterializeEntryCount: 0,
  dirtyPlanRootInt32MaterializeCount: 0,
  dirtyPlanRootInt32MaterializeEntryCount: 0,
  dirtyPlanListIndexInt32MaterializeCount: 0,
  dirtyPlanListIndexInt32MaterializeEntryCount: 0,
  fieldPathKeyMaterializeCount: 0,
  fieldPathKeyMaterializeSegmentCount: 0,
}

let enabled = false

export const enableTxnHotPathSentinels = (): void => {
  enabled = true
}

export const disableTxnHotPathSentinels = (): void => {
  enabled = false
}

export const resetTxnHotPathSentinels = (): void => {
  counters.debugEventAllocCountOff = 0
  counters.patchObjectMaterializeCountLight = 0
  counters.snapshotObjectMaterializeCountLight = 0
  counters.joinSplitInTxnWindowCount = 0
  counters.dirtyAllFallbackCountP1Gate = 0
  counters.dirtyBufferClearEntryCount = 0
  counters.dirtyPlanRawPathArrayMaterializeCount = 0
  counters.dirtyPlanRawPathArrayMaterializeEntryCount = 0
  counters.dirtyPlanRootInt32MaterializeCount = 0
  counters.dirtyPlanRootInt32MaterializeEntryCount = 0
  counters.dirtyPlanListIndexInt32MaterializeCount = 0
  counters.dirtyPlanListIndexInt32MaterializeEntryCount = 0
  counters.fieldPathKeyMaterializeCount = 0
  counters.fieldPathKeyMaterializeSegmentCount = 0
}

export const readTxnHotPathSentinels = (): TxnHotPathSentinelSnapshot => ({
  debugEventAllocCountOff: counters.debugEventAllocCountOff,
  patchObjectMaterializeCountLight: counters.patchObjectMaterializeCountLight,
  snapshotObjectMaterializeCountLight: counters.snapshotObjectMaterializeCountLight,
  joinSplitInTxnWindowCount: counters.joinSplitInTxnWindowCount,
  dirtyAllFallbackCountP1Gate: counters.dirtyAllFallbackCountP1Gate,
  dirtyBufferClearEntryCount: counters.dirtyBufferClearEntryCount,
  dirtyPlanRawPathArrayMaterializeCount: counters.dirtyPlanRawPathArrayMaterializeCount,
  dirtyPlanRawPathArrayMaterializeEntryCount: counters.dirtyPlanRawPathArrayMaterializeEntryCount,
  dirtyPlanRootInt32MaterializeCount: counters.dirtyPlanRootInt32MaterializeCount,
  dirtyPlanRootInt32MaterializeEntryCount: counters.dirtyPlanRootInt32MaterializeEntryCount,
  dirtyPlanListIndexInt32MaterializeCount: counters.dirtyPlanListIndexInt32MaterializeCount,
  dirtyPlanListIndexInt32MaterializeEntryCount: counters.dirtyPlanListIndexInt32MaterializeEntryCount,
  fieldPathKeyMaterializeCount: counters.fieldPathKeyMaterializeCount,
  fieldPathKeyMaterializeSegmentCount: counters.fieldPathKeyMaterializeSegmentCount,
})

export const countDebugEventAllocationAttemptOff = (): void => {
  if (enabled) counters.debugEventAllocCountOff += 1
}

export const countPatchObjectMaterializeLight = (): void => {
  if (enabled) counters.patchObjectMaterializeCountLight += 1
}

export const countSnapshotObjectMaterializeLight = (): void => {
  if (enabled) counters.snapshotObjectMaterializeCountLight += 1
}

export const countJoinSplitInTxnWindow = (): void => {
  if (enabled) counters.joinSplitInTxnWindowCount += 1
}

export const countDirtyAllFallbackP1Gate = (): void => {
  if (enabled) counters.dirtyAllFallbackCountP1Gate += 1
}

export const countDirtyBufferClearEntries = (entries: number): void => {
  if (!enabled || entries <= 0) return
  counters.dirtyBufferClearEntryCount += entries
}

export const countDirtyPlanRawPathArrayMaterialize = (entries: number): void => {
  if (!enabled || entries <= 0) return
  counters.dirtyPlanRawPathArrayMaterializeCount += 1
  counters.dirtyPlanRawPathArrayMaterializeEntryCount += entries
}

export const countDirtyPlanRootInt32Materialize = (entries: number): void => {
  if (!enabled || entries <= 0) return
  counters.dirtyPlanRootInt32MaterializeCount += 1
  counters.dirtyPlanRootInt32MaterializeEntryCount += entries
}

export const countDirtyPlanListIndexInt32Materialize = (entries: number): void => {
  if (!enabled || entries <= 0) return
  counters.dirtyPlanListIndexInt32MaterializeCount += 1
  counters.dirtyPlanListIndexInt32MaterializeEntryCount += entries
}

export const countFieldPathKeyMaterialize = (segments: number): void => {
  if (!enabled) return
  counters.fieldPathKeyMaterializeCount += 1
  counters.fieldPathKeyMaterializeSegmentCount += segments > 0 ? segments : 0
}
