import type {
  WorkbenchEvidenceGap,
  WorkbenchHostViewModel,
  WorkbenchSelectionManifest,
  WorkbenchStableCoordinate,
} from './model.js'

export interface WorkbenchExportSelection {
  readonly workbench: WorkbenchHostViewModel
  readonly selectedSessionId?: string
  readonly selectedFindingId?: string
  readonly selectedArtifactKey?: string
}

export interface WorkbenchEvidenceExport {
  readonly evidencePackage: unknown
  readonly selectionManifest: WorkbenchSelectionManifest
}

const coordinateFromSelection = (selection: WorkbenchExportSelection): Partial<WorkbenchStableCoordinate> | undefined => {
  const finding = selection.workbench.findings.find((item) => item.id === selection.selectedFindingId)
  if (finding?.coordinate) return finding.coordinate
  const session = selection.workbench.sessions.find((item) => item.id === selection.selectedSessionId)
  if (!session) return undefined
  return {
    runtimeLabel: session.coordinate.runtimeLabel,
    moduleId: session.coordinate.moduleId,
    instanceId: session.coordinate.instanceId,
    txnSeq: session.coordinate.txnSeqRange?.start,
    eventSeq: session.coordinate.eventSeqRange?.start,
    timestamp: session.coordinate.timestampRange?.start,
  }
}

const gapsToEvidenceEvents = (gaps: ReadonlyArray<WorkbenchEvidenceGap>): ReadonlyArray<unknown> =>
  gaps.map((gap, index) => ({
    type: 'workbench:gap',
    seq: index + 1,
    payload: gap,
  }))

export const buildWorkbenchEvidenceExport = (selection: WorkbenchExportSelection): WorkbenchEvidenceExport => {
  const session = selection.workbench.sessions.find((item) => item.id === selection.selectedSessionId)
  const finding = selection.workbench.findings.find((item) => item.id === selection.selectedFindingId)
  const artifact = selection.workbench.artifacts.find((item) => item.artifactKey === selection.selectedArtifactKey)
  const coordinate = coordinateFromSelection(selection)

  return {
    evidencePackage: {
      protocol: 'logix.dvtools.evidence-package',
      version: 1,
      source: selection.workbench.inputSource,
      events: gapsToEvidenceEvents(selection.workbench.gaps),
      artifacts: selection.workbench.artifacts,
      summary: {
        scopeCount: selection.workbench.scopes.length,
        sessionCount: selection.workbench.sessions.length,
        findingCount: selection.workbench.findings.length,
        selectedSessionId: session?.id,
        selectedFindingId: finding?.id,
        selectedArtifactKey: artifact?.artifactKey,
      },
    },
    selectionManifest: {
      version: 1,
      source: 'logix-dvtools',
      sessionId: session?.id,
      findingId: finding?.id,
      artifactKey: artifact?.artifactKey,
      focusRef: finding?.focusRef ?? artifact?.focusRef,
      coordinate,
      generatedAt: 0,
    },
  }
}
