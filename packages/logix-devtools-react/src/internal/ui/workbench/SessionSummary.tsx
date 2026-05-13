import React from 'react'
import type { WorkbenchSession } from '../../state/workbench/index.js'

export interface SessionSummaryProps {
  readonly session?: WorkbenchSession
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ session }) => {
  if (!session) {
    return (
      <div className="rounded-md border p-3 text-xs" style={{ borderColor: 'var(--dt-border)', color: 'var(--dt-text-muted)' }}>
        No session selected.
      </div>
    )
  }

  const metricItems = [
    ['events', session.metrics.eventCount],
    ['actions', session.metrics.actionCount],
    ['states', session.metrics.stateCount],
    ['renders', session.metrics.renderCount],
    ['diagnostics', session.metrics.diagnosticCount],
    ['durationMs', session.metrics.durationMs],
  ] as const

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2" aria-label="WorkbenchSessionSummary">
      {metricItems.map(([label, value]) => (
        <div
          key={label}
          className="rounded-md border px-3 py-2"
          style={{ backgroundColor: 'var(--dt-bg-element)', borderColor: 'var(--dt-border-light)' }}
        >
          <div className="text-[9px] uppercase" style={{ color: 'var(--dt-text-muted)' }}>
            {label}
          </div>
          <div className="mt-1 text-sm font-mono" style={{ color: 'var(--dt-text-primary)' }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
