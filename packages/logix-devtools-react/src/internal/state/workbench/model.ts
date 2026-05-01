import type * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import {
  RUNTIME_WORKBENCH_GAP_CODES,
  type RuntimeWorkbenchEvidenceGapCode,
  type RuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchSelectionHint,
} from '@logixjs/core/repo-internal/workbench-api'

export const WORKBENCH_EVIDENCE_GAP_CODES = RUNTIME_WORKBENCH_GAP_CODES

export type WorkbenchEvidenceGapCode = RuntimeWorkbenchEvidenceGapCode | string

export interface WorkbenchStableCoordinate {
  readonly runtimeLabel: string
  readonly moduleId: string
  readonly instanceId: string
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly eventSeq?: number
  readonly timestamp?: number
}

export interface WorkbenchEvidenceGap {
  readonly code: WorkbenchEvidenceGapCode
  readonly owner: 'empty' | 'session' | 'finding' | 'artifact' | 'drilldown' | 'gap-session' | 'evidence-gap-bucket'
  readonly evidenceRefs: ReadonlyArray<string>
  readonly coordinate?: Partial<WorkbenchStableCoordinate>
  readonly projectionGapId?: string
}

export interface WorkbenchScope {
  readonly id: string
  readonly runtimeLabel: string
  readonly modules: ReadonlyArray<{
    readonly moduleId: string
    readonly instances: ReadonlyArray<string>
  }>
}

export interface WorkbenchSessionCoordinate {
  readonly runtimeLabel: string
  readonly moduleId: string
  readonly instanceId: string
  readonly txnSeqRange?: {
    readonly start: number
    readonly end: number
  }
  readonly eventSeqRange?: {
    readonly start: number
    readonly end: number
  }
  readonly timestampRange?: {
    readonly start: number
    readonly end: number
  }
}

export interface WorkbenchMetric {
  readonly eventCount: number
  readonly renderCount: number
  readonly actionCount: number
  readonly stateCount: number
  readonly diagnosticCount: number
  readonly durationMs: number
}

export interface WorkbenchArtifactAttachment {
  readonly artifactKey: string
  readonly artifactKind: string
  readonly artifactRef?: string
  readonly evidenceRefs: ReadonlyArray<string>
  readonly focusRef?: unknown
  readonly sourceRef?: string
  readonly summary?: string
}

export interface WorkbenchFinding {
  readonly id: string
  readonly sessionId?: string
  readonly scopeId?: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly kind: 'diagnostic' | 'report' | 'evidence-gap' | 'activity'
  readonly summary: string
  readonly focusRef?: unknown
  readonly sourceRef?: string
  readonly evidenceRefs: ReadonlyArray<string>
  readonly artifacts: ReadonlyArray<WorkbenchArtifactAttachment>
  readonly reportRef?: {
    readonly stage?: string
    readonly mode?: string
    readonly verdict?: string
    readonly errorCode?: string
    readonly nextRecommendedStage?: string
  }
  readonly coordinate?: Partial<WorkbenchStableCoordinate>
}

export interface WorkbenchSession {
  readonly id: string
  readonly scopeId: string
  readonly coordinate: WorkbenchSessionCoordinate
  readonly evidenceRefs: ReadonlyArray<string>
  readonly metrics: WorkbenchMetric
  readonly findingIds: ReadonlyArray<string>
  readonly artifactKeys: ReadonlyArray<string>
  readonly gaps: ReadonlyArray<WorkbenchEvidenceGap>
}

export type WorkbenchDrilldownKind = 'timeline' | 'inspector' | 'field-graph' | 'converge' | 'report' | 'raw-json'

export interface WorkbenchDrilldownSelector {
  readonly kind: WorkbenchDrilldownKind
  readonly sessionId?: string
  readonly findingId?: string
  readonly artifactKey?: string
}

export interface WorkbenchHostViewModel {
  readonly inputSource: WorkbenchInputSource
  readonly projection: RuntimeWorkbenchProjectionIndex
  readonly scopes: ReadonlyArray<WorkbenchScope>
  readonly sessions: ReadonlyArray<WorkbenchSession>
  readonly findings: ReadonlyArray<WorkbenchFinding>
  readonly artifacts: ReadonlyArray<WorkbenchArtifactAttachment>
  readonly gaps: ReadonlyArray<WorkbenchEvidenceGap>
  readonly defaultDrilldown: WorkbenchDrilldownSelector
}

export type WorkbenchInputSource =
  | { readonly kind: 'live-snapshot' }
  | { readonly kind: 'imported-evidence' }
  | { readonly kind: 'control-plane-report' }
  | { readonly kind: 'merged' }

export interface WorkbenchNormalizedEvent {
  readonly ref: CoreDebug.RuntimeDebugEventRef
  readonly evidenceRef: string
  readonly coordinate: Partial<WorkbenchStableCoordinate>
}

export interface WorkbenchNormalizedInput {
  readonly source: WorkbenchInputSource
  readonly events: ReadonlyArray<WorkbenchNormalizedEvent>
  readonly evidencePackage?: unknown
  readonly report?: unknown
  readonly gaps: ReadonlyArray<WorkbenchEvidenceGap>
  readonly selectionHints?: ReadonlyArray<RuntimeWorkbenchSelectionHint>
}

export interface WorkbenchSelectionManifest {
  readonly version: 1
  readonly source: 'logix-dvtools'
  readonly sessionId?: string
  readonly findingId?: string
  readonly artifactKey?: string
  readonly focusRef?: unknown
  readonly coordinate?: Partial<WorkbenchStableCoordinate>
  readonly generatedAt: number
}

export const emptyWorkbenchHostViewModel: WorkbenchHostViewModel = {
  inputSource: { kind: 'live-snapshot' },
  projection: {
    sessions: [],
    indexes: {
      findingsById: {},
      artifactsById: {},
      gapsById: {},
      sourcesById: {},
    },
  },
  scopes: [],
  sessions: [],
  findings: [],
  artifacts: [],
  gaps: [],
  defaultDrilldown: { kind: 'timeline' },
}
