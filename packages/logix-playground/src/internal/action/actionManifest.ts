import type { MinimumProgramActionManifest } from '@logixjs/core/repo-internal/reflection-api'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { PlaygroundRuntimeEvidenceEnvelope } from '../runner/runtimeEvidence.js'

export type ActionPanelPayloadKind = 'void' | 'nonVoid' | 'unknown'

export type ActionPanelAuthority = 'manifest' | 'runtime-reflection'

export interface ActionPanelEvidenceGap {
  readonly kind: 'missing-action-manifest'
  readonly source: 'runtime-reflection'
  readonly message: string
}

export interface ActionPanelViewModelEntry {
  readonly actionTag: string
  readonly payloadKind: ActionPanelPayloadKind
  readonly payloadSummary?: string
  readonly authority: ActionPanelAuthority
}

export interface ActionPanelViewModel {
  readonly projectId: string
  readonly revision: number
  readonly moduleId?: string
  readonly manifestDigest?: string
  readonly authorityStatus: ActionPanelAuthority | 'unavailable'
  readonly evidenceGaps: ReadonlyArray<ActionPanelEvidenceGap>
  readonly actions: ReadonlyArray<ActionPanelViewModelEntry>
}

export interface ReflectedActionManifestInput {
  readonly projectId: string
  readonly manifest: MinimumProgramActionManifest
}

const compareActionEntries = (
  a: Pick<ActionPanelViewModelEntry, 'actionTag'>,
  b: Pick<ActionPanelViewModelEntry, 'actionTag'>,
): number => a.actionTag.localeCompare(b.actionTag)

export const unavailableActionManifest = (
  snapshot: Pick<ProjectSnapshot, 'projectId' | 'revision'>,
  message = 'Runtime reflection manifest is unavailable.',
): ActionPanelViewModel => ({
  projectId: snapshot.projectId,
  revision: snapshot.revision,
  authorityStatus: 'unavailable',
  evidenceGaps: [{
    kind: 'missing-action-manifest',
    source: 'runtime-reflection',
    message,
  }],
  actions: [],
})

export const projectReflectedActionManifest = (
  input: ReflectedActionManifestInput,
): ActionPanelViewModel => {
  const entries = (input.manifest.actions ?? [])
    .map((action): ActionPanelViewModelEntry => ({
      actionTag: action.actionTag,
      payloadKind: action.payload?.kind ?? 'unknown',
      ...(action.payload?.summary ? { payloadSummary: action.payload.summary } : {}),
      authority: action.authority,
    }))
    .sort(compareActionEntries)

  const hasManifestAuthority = entries.some((entry) => entry.authority === 'manifest')

  return {
    projectId: input.projectId,
    revision: input.manifest.revision ?? 0,
    moduleId: input.manifest.moduleId,
    manifestDigest: input.manifest.digest,
    authorityStatus: hasManifestAuthority ? 'manifest' : entries.length > 0 ? 'runtime-reflection' : 'unavailable',
    evidenceGaps: [],
    actions: entries,
  }
}

export const projectActionManifestFromRuntimeEvidence = (
  snapshot: Pick<ProjectSnapshot, 'projectId' | 'revision'>,
  evidence: PlaygroundRuntimeEvidenceEnvelope | undefined,
): ActionPanelViewModel => {
  if (!evidence?.minimumActionManifest) {
    const gapMessage = evidence?.evidenceGaps[0]?.message
    return unavailableActionManifest(snapshot, gapMessage ?? 'Runtime reflection manifest is unavailable.')
  }

  return projectReflectedActionManifest({
    projectId: snapshot.projectId,
    manifest: evidence.minimumActionManifest,
  })
}
