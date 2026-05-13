import React from 'react'
import type { WorkbenchFinding } from '../../state/workbench/index.js'
import { ArtifactAttachments } from './ArtifactAttachments.js'

export interface FindingsListProps {
  readonly findings: ReadonlyArray<WorkbenchFinding>
  readonly selectedFindingId?: string
  readonly selectedArtifactKey?: string
  readonly onSelectFinding: (findingId: string) => void
  readonly onSelectArtifact: (artifactKey: string) => void
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  selectedFindingId,
  selectedArtifactKey,
  onSelectFinding,
  onSelectArtifact,
}) => {
  if (findings.length === 0) {
    return (
      <div
        className="rounded-md border p-4 text-xs"
        style={{ backgroundColor: 'var(--dt-bg-root)', borderColor: 'var(--dt-border)', color: 'var(--dt-text-muted)' }}
      >
        No findings for this session.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" aria-label="WorkbenchFindingsList">
      {findings.map((finding) => {
        const selected = finding.id === selectedFindingId
        return (
          <div
            key={finding.id}
            className="rounded-md border"
            style={{
              backgroundColor: selected ? 'var(--dt-bg-active)' : 'var(--dt-bg-root)',
              borderColor: selected ? 'var(--dt-info-border)' : 'var(--dt-border)',
            }}
          >
            <button
              type="button"
              onClick={() => onSelectFinding(finding.id)}
              className="w-full text-left px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--dt-text-primary)' }}>
                  {finding.summary}
                </span>
                <span className="text-[9px] uppercase" style={{ color: 'var(--dt-text-muted)' }}>
                  {finding.kind}:{finding.severity}
                </span>
              </div>
              {finding.sourceRef && (
                <div className="mt-1 text-[10px] font-mono truncate" style={{ color: 'var(--dt-text-muted)' }}>
                  {finding.sourceRef}
                </div>
              )}
            </button>
            <div className="px-3 pb-3">
              <ArtifactAttachments
                artifacts={finding.artifacts}
                selectedArtifactKey={selectedArtifactKey}
                onSelectArtifact={onSelectArtifact}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
