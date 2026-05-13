import type {
  DirtyAllReason,
  FieldPath,
  FieldPathId,
  FieldPathIdRegistry,
  PatchReason,
} from '../../field-path.js'

export type { PatchReason } from '../../field-path.js'

export type StatePatchPath = string | FieldPath | FieldPathId

export interface TxnPatchRecord {
  readonly opSeq: number
  readonly pathId?: FieldPathId
  readonly reason: PatchReason
  readonly stepId?: number
  readonly fieldNodeId?: string
  readonly from?: unknown
  readonly to?: unknown
}

export interface StateTxnOrigin {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

export type StateTxnInstrumentationLevel = 'full' | 'light'

export type TxnDirtyPlanAuthority =
  | 'field-path-registry'
  | 'dirty-all'
  | 'missing-registry'
  | 'dirty-root-fallback'

export type TxnDirtyEvidenceSnapshotList = {
  readonly indexBindings: ReadonlyMap<string, ReadonlySet<number>>
  readonly indexBindingsSorted: ReadonlyMap<string, Int32Array>
  readonly rootTouched: ReadonlySet<string>
  readonly itemTouched: ReadonlyMap<string, ReadonlySet<number>>
  readonly itemTouchedSorted: ReadonlyMap<string, Int32Array>
}

export interface TxnDirtyPlanSnapshot {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason
  readonly rawPathIds: ReadonlyArray<FieldPathId>
  readonly rawKeyHash: number
  readonly rawKeySize: number
  readonly rootIds: Int32Array
  readonly rootKeyHash: number
  readonly rootCount: number
  readonly authority: TxnDirtyPlanAuthority
  readonly fieldPathsKey?: string
  readonly fieldPathCount: number
  readonly list?: TxnDirtyEvidenceSnapshotList
}

export interface TxnDirtyPlanCache {
  readonly dirtyVersion: number
  readonly listEvidenceVersion: number
  readonly snapshot: TxnDirtyPlanSnapshot
}

export type TxnDirtyEvidenceSnapshot = {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPathIds: ReadonlyArray<FieldPathId>
  readonly dirtyPathsKeyHash: number
  readonly dirtyPathsKeySize: number
  readonly list?: TxnDirtyEvidenceSnapshotList
}

export type TxnDirtyEvidence = {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPathIds: ReadonlySet<FieldPathId>
  readonly dirtyPathsKeyHash: number
  readonly dirtyPathsKeySize: number
  readonly list?: TxnDirtyEvidenceSnapshotList
}

export interface StateTxnConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly instrumentation?: StateTxnInstrumentationLevel
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
  readonly getListPathSet?: () => ReadonlySet<string> | undefined
  readonly captureSnapshots?: boolean
  readonly now?: () => number
}

export interface StateTransaction<S> {
  readonly txnId: string
  readonly txnSeq: number
  readonly origin: StateTxnOrigin
  readonly startedAt: number
  readonly endedAt: number
  readonly durationMs: number
  readonly dirty: TxnDirtyEvidenceSnapshot
  readonly dirtyPlan: TxnDirtyPlanSnapshot
  readonly patchCount: number
  readonly patchesTruncated: boolean
  readonly patchesTruncatedReason?: 'max_patches'
  readonly initialStateSnapshot?: S
  readonly finalStateSnapshot?: S
  readonly patches: ReadonlyArray<TxnPatchRecord>
  readonly moduleId?: string
  readonly instanceId?: string
}

export interface StateTransactionCommitResult<S> {
  readonly transaction: StateTransaction<S>
  readonly finalState: S
}

export interface StateTxnRuntimeConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly instrumentation: StateTxnInstrumentationLevel
  readonly captureSnapshots: boolean
  readonly now: () => number
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
  readonly getListPathSet?: () => ReadonlySet<string> | undefined
}

export interface StateTxnContext<S> {
  readonly config: StateTxnRuntimeConfig
  current?: StateTxnState<S>
  nextTxnSeq: number
  readonly scratch: StateTxnState<S>
  recordPatch: (
    path: StatePatchPath | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    fieldNodeId?: string,
    stepId?: number,
  ) => void
}

export interface StateTxnState<S> {
  txnId: string
  txnSeq: number
  origin: StateTxnOrigin
  startedAt: number
  baseState: S
  draft: S
  initialStateSnapshot?: S
  inferReplaceEvidence: boolean
  inferReplaceEvidenceIfEmpty: boolean
  listPathSet?: ReadonlySet<string>
  patches: Array<TxnPatchRecord>
  patchCount: number
  patchesTruncated: boolean
  fieldPathIdRegistry?: FieldPathIdRegistry
  readonly dirtyPathIds: Set<FieldPathId>
  dirtyPathIdSnapshot: Array<FieldPathId>
  dirtyPathsKeyHash?: number
  dirtyPathsKeySize: number
  dirtyVersion: number
  dirtyAllReason?: DirtyAllReason
  readonly listIndexEvidence: Map<string, Set<number>>
  readonly listItemTouched: Map<string, Set<number>>
  readonly listRootTouched: Set<string>
  listEvidenceVersion: number
  dirtyPlanCache?: TxnDirtyPlanCache
}
