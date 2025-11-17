import React from 'react'
import { useDevtoolsState } from '../hooks/DevtoolsHooks.js'
import { computeConvergeLanes, makeConvergeTxnKey } from '../../state/converge/compute.js'
import { computeConvergeAudits, computeConvergeAuditMatchTxnKeys } from '../../state/converge/audits.js'
import { ConvergeTimeline } from './ConvergeTimeline.js'
import { ConvergeDetailsPanel } from './ConvergeDetailsPanel.js'

export const ConvergePerformancePane: React.FC = () => {
  const state = useDevtoolsState()

  const { selectedRuntime, selectedModule, selectedInstance, timeline, timelineRange } = state

  const { rows, lanes } = React.useMemo(() => {
    if (!selectedModule) {
      return { rows: [], lanes: [] }
    }
    return computeConvergeLanes(timeline, {
      timelineRange,
      moduleId: selectedModule,
      instanceId: selectedInstance,
    })
  }, [timeline, timelineRange, selectedModule, selectedInstance])

  const audits = React.useMemo(() => computeConvergeAudits(rows), [rows])
  const auditMatchTxnKeysById = React.useMemo(() => computeConvergeAuditMatchTxnKeys(rows), [rows])

  const [selectedTxnKey, setSelectedTxnKey] = React.useState<string | undefined>(undefined)
  const [selectedAuditId, setSelectedAuditId] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (!selectedTxnKey && rows.length > 0) {
      setSelectedTxnKey(makeConvergeTxnKey(rows[0]))
    }
  }, [rows, selectedTxnKey])

  const selectedTxn = React.useMemo(() => {
    if (!selectedTxnKey) return undefined
    return rows.find((r) => makeConvergeTxnKey(r) === selectedTxnKey)
  }, [rows, selectedTxnKey])

  const highlightedTxnKeys = React.useMemo(() => {
    if (!selectedAuditId) return undefined
    const keys = auditMatchTxnKeysById[selectedAuditId] ?? []
    return new Set(keys)
  }, [auditMatchTxnKeysById, selectedAuditId])

  const highlightedAuditIds = React.useMemo(() => {
    if (!selectedTxnKey) return undefined
    const hits = new Set<string>()
    for (const [auditId, keys] of Object.entries(auditMatchTxnKeysById)) {
      if (keys.includes(selectedTxnKey)) {
        hits.add(auditId)
      }
    }
    return hits
  }, [auditMatchTxnKeysById, selectedTxnKey])

  if (!selectedRuntime) {
    return (
      <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--dt-text-muted)' }}>
        Please select a Runtime
      </div>
    )
  }

  if (!selectedModule) {
    return (
      <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--dt-text-muted)' }}>
        Please select a Module
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="text-xs font-medium" style={{ color: 'var(--dt-text-secondary)' }}>
          No converge evidence found
        </div>
        <div className="text-[10px] leading-relaxed" style={{ color: 'var(--dt-text-muted)' }}>
          Requires evidence events with <span className="font-mono">kind="trait:converge"</span>.
          <br />
          Make sure DiagnosticsLevel is not <span className="font-mono">off</span>, then trigger a converge transaction.
        </div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex">
      <div className="flex-1 min-w-0">
        <ConvergeTimeline
          lanes={lanes}
          selectedTxnKey={selectedTxnKey}
          highlightedTxnKeys={highlightedTxnKeys}
          onSelectTxn={(row) => {
            setSelectedTxnKey(makeConvergeTxnKey(row))
            setSelectedAuditId(undefined)
          }}
        />
      </div>
      <div className="w-[380px] shrink-0">
        <ConvergeDetailsPanel
          rows={rows}
          audits={audits}
          selectedTxn={selectedTxn}
          selectedAuditId={selectedAuditId}
          highlightedAuditIds={highlightedAuditIds}
          onSelectAudit={(auditId) => setSelectedAuditId(auditId)}
        />
      </div>
    </div>
  )
}
