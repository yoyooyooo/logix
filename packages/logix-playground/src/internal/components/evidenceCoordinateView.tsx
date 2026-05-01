import React from 'react'
import type { PlaygroundRuntimeEvidenceEnvelope } from '../runner/runtimeEvidence.js'

export interface PlaygroundEvidenceCoordinate {
  readonly projectId: string
  readonly sourceRevision: string
  readonly sourceDigest: string
  readonly operationKind: string
  readonly operationId: string
}

export const evidenceCoordinateFromEnvelope = (
  evidence: PlaygroundRuntimeEvidenceEnvelope | undefined,
): PlaygroundEvidenceCoordinate | undefined => {
  if (!evidence) return undefined
  return {
    projectId: evidence.operationCoordinate.instanceId.replace(/:r\d+$/, ''),
    sourceRevision: String(evidence.sourceRevision),
    sourceDigest: evidence.sourceDigest,
    operationKind: evidence.operationKind,
    operationId: evidence.operationEvents[0]?.eventId ?? [
      evidence.operationCoordinate.instanceId,
      `t${evidence.operationCoordinate.txnSeq}`,
      `o${evidence.operationCoordinate.opSeq}`,
      evidence.operationKind,
    ].join('::'),
  }
}

export const formatEvidenceCoordinate = (
  coordinate: PlaygroundEvidenceCoordinate | undefined,
): string | undefined => coordinate
  ? [
      `projectId=${coordinate.projectId}`,
      `sourceRevision=${coordinate.sourceRevision}`,
      `sourceDigest=${coordinate.sourceDigest}`,
      `operationKind=${coordinate.operationKind}`,
      `operationId=${coordinate.operationId}`,
    ].join('\n')
  : undefined

export function EvidenceCoordinateView({
  evidence,
}: {
  readonly evidence: PlaygroundRuntimeEvidenceEnvelope | undefined
}): React.ReactElement | null {
  const coordinate = formatEvidenceCoordinate(evidenceCoordinateFromEnvelope(evidence))
  if (!coordinate) return null

  return (
    <span
      aria-label="Evidence coordinate"
      data-playground-evidence-coordinate={coordinate}
      className="sr-only"
    />
  )
}
