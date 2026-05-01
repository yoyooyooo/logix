import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import {
  deriveRuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchAuthorityBundle,
  type RuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchSelectionHint,
  type RuntimeWorkbenchTruthInput,
} from '@logixjs/core/repo-internal/workbench-api'

import type { EvidenceInputs } from './evidenceInput.js'
import type { ArtifactOutput } from './result.js'

export interface CliWorkbenchProjectionInput {
  readonly evidenceInputs?: EvidenceInputs
  readonly report?: VerificationControlPlaneReport
  readonly artifacts?: ReadonlyArray<Pick<ArtifactOutput, 'outputKey' | 'kind' | 'file' | 'digest' | 'reasonCodes'>>
}

const selectionHintsFromEvidenceInputs = (
  inputs: EvidenceInputs | undefined,
): ReadonlyArray<RuntimeWorkbenchSelectionHint> => {
  const selection = inputs?.selection
  if (!selection) return []

  const hints: RuntimeWorkbenchSelectionHint[] = []
  if (selection.sessionId) {
    hints.push({ kind: 'selected-session', sessionId: selection.sessionId })
  }
  if (selection.findingId) {
    hints.push({ kind: 'selected-finding', findingId: selection.findingId })
  }
  if (selection.artifactOutputKey) {
    hints.push({ kind: 'selected-artifact', artifactOutputKey: selection.artifactOutputKey })
  }
  hints.push({
    kind: 'imported-selection-manifest',
    selectionId: selection.selectionId,
    ...(selection.sessionId ? { sessionId: selection.sessionId } : null),
    ...(selection.findingId ? { findingId: selection.findingId } : null),
    ...(selection.artifactOutputKey ? { artifactOutputKey: selection.artifactOutputKey } : null),
    ...(selection.focusRef ? { focusRef: selection.focusRef } : null),
  })
  return hints
}

const evidenceTruthInputFromEvidenceInputs = (
  inputs: EvidenceInputs | undefined,
): RuntimeWorkbenchTruthInput | undefined => {
  const evidence = inputs?.evidence
  if (!evidence) return undefined
  return {
    kind: 'evidence-package',
    packageId: evidence.packageId,
    artifacts: evidence.artifactOutputKeys.map((outputKey) => ({
      outputKey,
      kind: 'CanonicalEvidenceArtifact',
    })),
  }
}

const artifactTruthInputsFromOutputs = (
  artifacts: CliWorkbenchProjectionInput['artifacts'],
): ReadonlyArray<RuntimeWorkbenchTruthInput> =>
  (artifacts ?? []).map((artifact) => ({
    kind: 'artifact-ref',
    artifact: {
      outputKey: artifact.outputKey,
      kind: artifact.kind,
      ...(artifact.file ? { file: artifact.file } : null),
      ...(artifact.digest ? { digest: artifact.digest } : null),
      ...(artifact.reasonCodes ? { reasonCodes: artifact.reasonCodes } : null),
    },
  }))

export const buildCliRuntimeWorkbenchAuthorityBundle = (
  input: CliWorkbenchProjectionInput,
): RuntimeWorkbenchAuthorityBundle => {
  const truthInputs: RuntimeWorkbenchTruthInput[] = []
  const evidenceInput = evidenceTruthInputFromEvidenceInputs(input.evidenceInputs)
  if (evidenceInput) truthInputs.push(evidenceInput)
  if (input.report) truthInputs.push({ kind: 'control-plane-report', report: input.report })
  truthInputs.push(...artifactTruthInputsFromOutputs(input.artifacts))

  const selectionHints = selectionHintsFromEvidenceInputs(input.evidenceInputs)
  return {
    truthInputs,
    ...(selectionHints.length > 0 ? { selectionHints } : null),
  }
}

export const deriveCliWorkbenchProjection = (
  input: CliWorkbenchProjectionInput,
): RuntimeWorkbenchProjectionIndex => deriveRuntimeWorkbenchProjectionIndex(buildCliRuntimeWorkbenchAuthorityBundle(input))
