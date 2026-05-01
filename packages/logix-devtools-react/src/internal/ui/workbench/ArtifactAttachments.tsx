import React from 'react'
import type { WorkbenchArtifactAttachment } from '../../state/workbench/index.js'

export interface ArtifactAttachmentsProps {
  readonly artifacts: ReadonlyArray<WorkbenchArtifactAttachment>
  readonly selectedArtifactKey?: string
  readonly onSelectArtifact: (artifactKey: string) => void
}

export const ArtifactAttachments: React.FC<ArtifactAttachmentsProps> = ({
  artifacts,
  selectedArtifactKey,
  onSelectArtifact,
}) => {
  if (artifacts.length === 0) {
    return (
      <div className="text-[10px]" style={{ color: 'var(--dt-text-muted)' }}>
        No artifact attachments.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1" aria-label="WorkbenchArtifactAttachments">
      {artifacts.map((artifact) => {
        const selected = artifact.artifactKey === selectedArtifactKey
        return (
          <button
            key={artifact.artifactKey}
            type="button"
            onClick={() => onSelectArtifact(artifact.artifactKey)}
            className="text-left rounded-md border px-2 py-1"
            style={{
              backgroundColor: selected ? 'var(--dt-info-bg)' : 'var(--dt-bg-root)',
              borderColor: selected ? 'var(--dt-info-border)' : 'var(--dt-border)',
              color: selected ? 'var(--dt-info)' : 'var(--dt-text-secondary)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] truncate">{artifact.artifactKey}</span>
              <span className="text-[9px]">{artifact.artifactKind}</span>
            </div>
            {artifact.summary && (
              <div className="mt-1 text-[9px] truncate" style={{ color: 'var(--dt-text-muted)' }}>
                {artifact.summary}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
