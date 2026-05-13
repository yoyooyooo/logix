import React from 'react'
import type { WorkbenchEvidenceGap } from '../../state/workbench/index.js'

export interface EvidenceGapListProps {
  readonly gaps: ReadonlyArray<WorkbenchEvidenceGap>
}

export const EvidenceGapList: React.FC<EvidenceGapListProps> = ({ gaps }) => {
  if (gaps.length === 0) {
    return (
      <div className="text-[10px]" style={{ color: 'var(--dt-text-muted)' }}>
        Evidence gaps closed for this view.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1" aria-label="WorkbenchEvidenceGaps">
      {gaps.map((gap, index) => (
        <div
          key={`${gap.code}:${index}`}
          className="rounded-md border px-2 py-1 text-[10px] font-mono"
          style={{ backgroundColor: 'var(--dt-warning-bg)', borderColor: 'var(--dt-border)', color: 'var(--dt-warning)' }}
        >
          {gap.code}
        </div>
      ))}
    </div>
  )
}
