import React from 'react'
import { getInstanceLabel } from '../../snapshot/index.js'
import type { ConvergeLane } from '../../state/converge/compute.js'
import { makeConvergeTxnKey } from '../../state/converge/compute.js'
import { parseConvergeDecisionEvidence } from '../../state/converge/evidence.js'
import type { ConvergeTxnRow } from '../../state/converge/model.js'

export const ConvergeTimeline: React.FC<{
  readonly lanes: ReadonlyArray<ConvergeLane>
  readonly selectedTxnKey?: string
  readonly highlightedTxnKeys?: ReadonlySet<string>
  readonly onSelectTxn: (row: ConvergeTxnRow) => void
}> = ({ lanes, selectedTxnKey, highlightedTxnKeys, onSelectTxn }) => {
  const maxTotalDurationMs = React.useMemo(() => {
    let max = 0
    for (const lane of lanes) {
      for (const row of lane.transactions) {
        const p = parseConvergeDecisionEvidence(row.evidence)
        const decision = Math.max(0, p.decisionDurationMs ?? 0)
        const exec = Math.max(0, p.executionDurationMs ?? 0)
        max = Math.max(max, decision + exec)
      }
    }
    return max
  }, [lanes])

  const scale = maxTotalDurationMs > 0 ? maxTotalDurationMs : 1

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div
        className="px-4 py-2 border-b text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--dt-text-muted)', borderColor: 'var(--dt-border)' }}
      >
        Converge Timeline
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-3 overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {lanes.map((lane) => {
          const instanceLabel = getInstanceLabel(lane.instanceId) ?? lane.instanceId
          return (
            <div key={lane.laneKey} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono truncate" style={{ color: 'var(--dt-text-secondary)' }}>
                    {lane.moduleId}
                  </div>
                  <div className="text-[9px] font-mono truncate" style={{ color: 'var(--dt-text-dim)' }}>
                    {instanceLabel}
                  </div>
                </div>
                <div
                  className="text-[9px] px-1.5 py-0.5 rounded border font-mono"
                  style={{
                    backgroundColor: 'var(--dt-bg-element)',
                    color: 'var(--dt-text-muted)',
                    borderColor: 'var(--dt-border)',
                  }}
                >
                  {lane.transactions.length} txns
                </div>
              </div>

              <div className="space-y-1">
                {lane.transactions.map((row) => {
                  const key = makeConvergeTxnKey(row)
                  const selected = key === selectedTxnKey
                  const highlighted = highlightedTxnKeys?.has(key) ?? false

                  const p = parseConvergeDecisionEvidence(row.evidence)
                  const decision = Math.max(0, p.decisionDurationMs ?? 0)
                  const exec = Math.max(0, p.executionDurationMs ?? 0)
                  const total = decision + exec

                  const widthPct = Math.max(6, Math.min(100, (total / scale) * 100))
                  const decisionPct = total > 0 ? (decision / total) * 100 : 0
                  const execPct = total > 0 ? (exec / total) * 100 : 100

                  const outcome = p.outcome ?? 'Unknown'
                  const outcomeColor =
                    outcome === 'Converged'
                      ? 'var(--dt-primary)'
                      : outcome === 'Noop'
                        ? 'var(--dt-text-muted)'
                        : outcome === 'Degraded'
                          ? 'var(--dt-danger)'
                          : 'var(--dt-info)'

                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={`ConvergeTxn:${row.txnSeq}`}
                      onClick={() => onSelectTxn(row)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded border transition-colors"
                      style={{
                        borderColor: selected
                          ? 'var(--dt-info-border)'
                          : highlighted
                            ? 'var(--dt-warning)'
                            : 'var(--dt-border)',
                        backgroundColor: selected
                          ? 'var(--dt-info-bg)'
                          : highlighted
                            ? 'var(--dt-warning-bg)'
                            : 'transparent',
                      }}
                    >
                      <div className="w-10 shrink-0 text-[10px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                        t{row.txnSeq}
                      </div>

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div
                            className="h-3 rounded overflow-hidden border"
                            style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}
                          >
                            <div className="h-full flex" style={{ width: `${widthPct}%` }}>
                              {decision > 0 && (
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${decisionPct}%`,
                                    backgroundColor: 'var(--dt-text-dim)',
                                  }}
                                  title={`decision: ${decision}ms`}
                                />
                              )}
                              <div
                                className="h-full"
                                style={{
                                  width: `${execPct}%`,
                                  backgroundColor: outcomeColor,
                                }}
                                title={`execution: ${exec}ms`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded border font-mono"
                            style={{
                              backgroundColor: 'var(--dt-bg-element)',
                              color: 'var(--dt-text-secondary)',
                              borderColor: 'var(--dt-border)',
                            }}
                            title="executedMode"
                          >
                            {p.executedMode ?? 'n/a'}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded border font-mono"
                            style={{
                              backgroundColor: 'var(--dt-bg-element)',
                              color: outcomeColor,
                              borderColor: outcomeColor,
                            }}
                            title="outcome"
                          >
                            {outcome}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
