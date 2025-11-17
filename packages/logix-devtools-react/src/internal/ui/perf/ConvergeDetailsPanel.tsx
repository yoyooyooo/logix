import React from 'react'
import { parseConvergeDecisionEvidence } from '../../state/converge/evidence.js'
import type { ConvergeAuditFinding, ConvergeTxnRow } from '../../state/converge/model.js'

const renderValue = (value: unknown): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'n/a'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const ConvergeDetailsPanel: React.FC<{
  readonly rows: ReadonlyArray<ConvergeTxnRow>
  readonly audits: ReadonlyArray<ConvergeAuditFinding>
  readonly selectedTxn?: ConvergeTxnRow
  readonly selectedAuditId?: string
  readonly highlightedAuditIds?: ReadonlySet<string>
  readonly onSelectAudit: (auditId: string) => void
}> = ({ rows, audits, selectedTxn, selectedAuditId, highlightedAuditIds, onSelectAudit }) => {
  const selectedAudit = audits.find((a) => a.id === selectedAuditId) ?? audits[0]

  return (
    <div className="h-full min-h-0 flex flex-col border-l" style={{ borderColor: 'var(--dt-border)' }}>
      <div
        className="px-4 py-2 border-b text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--dt-text-muted)', borderColor: 'var(--dt-border)' }}
      >
        Details
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {!selectedTxn ? (
          <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--dt-text-muted)' }}>
            Select a converge transaction to view details
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div
              className="rounded border"
              style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}
            >
              <div
                className="px-3 py-2 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-header)' }}
              >
                <div className="text-[10px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
                  Transaction
                </div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                  t{selectedTxn.txnSeq}
                </div>
              </div>

              {(() => {
                const p = parseConvergeDecisionEvidence(selectedTxn.evidence)
                const rows: Array<{ k: string; v: unknown }> = [
                  { k: 'moduleId', v: selectedTxn.moduleId },
                  { k: 'instanceId', v: selectedTxn.instanceId },
                  { k: 'txnId', v: selectedTxn.txnId },
                  { k: 'requestedMode', v: p.requestedMode },
                  { k: 'executedMode', v: p.executedMode },
                  { k: 'outcome', v: p.outcome },
                  { k: 'configScope', v: p.configScope },
                  { k: 'executionBudgetMs', v: p.executionBudgetMs },
                  { k: 'executionDurationMs', v: p.executionDurationMs },
                  { k: 'decisionBudgetMs', v: p.decisionBudgetMs },
                  { k: 'decisionDurationMs', v: p.decisionDurationMs },
                  { k: 'reasons', v: (p.reasons ?? []).join(', ') },
                  {
                    k: 'stepStats',
                    v: p.stepStats
                      ? {
                          total: p.stepStats.totalSteps,
                          executed: p.stepStats.executedSteps,
                          skipped: p.stepStats.skippedSteps,
                          changed: p.stepStats.changedSteps,
                          affected: p.stepStats.affectedSteps,
                        }
                      : undefined,
                  },
                  { k: 'dirty', v: p.dirty },
                  { k: 'cache', v: p.cache },
                  { k: 'staticIrDigest', v: p.staticIrDigest },
                  { k: 'downgradeReason', v: selectedTxn.downgradeReason },
                ]

                return (
                  <div className="px-3 py-2">
                    <table className="w-full text-[10px] font-mono">
                      <tbody>
                        {rows.map(({ k, v }) => (
                          <tr key={k} className="align-top">
                            <td className="pr-3 py-1" style={{ color: 'var(--dt-text-muted)', width: 120 }}>
                              {k}
                            </td>
                            <td className="py-1" style={{ color: 'var(--dt-text-secondary)' }}>
                              {renderValue(v)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>

            <div
              className="rounded border"
              style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}
            >
              <div
                className="px-3 py-2 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-header)' }}
              >
                <div className="text-[10px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
                  Audits
                </div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                  {audits.length} findings · {rows.length} txns
                </div>
              </div>

              <div className="p-2 space-y-1">
                {audits.length === 0 ? (
                  <div className="px-2 py-2 text-xs italic" style={{ color: 'var(--dt-text-muted)' }}>
                    No findings
                  </div>
                ) : (
                  audits.map((a) => {
                    const selected = a.id === selectedAuditId
                    const highlighted = highlightedAuditIds?.has(a.id) ?? false
                    const severityColor =
                      a.severity === 'error'
                        ? 'var(--dt-danger)'
                        : a.severity === 'warning'
                          ? 'var(--dt-warning)'
                          : 'var(--dt-text-muted)'
                    return (
                      <button
                        key={a.id}
                        type="button"
                        aria-label={`ConvergeAudit:${a.id}`}
                        onClick={() => onSelectAudit(a.id)}
                        className="w-full text-left px-2 py-1 rounded border transition-colors"
                        style={{
                          borderColor: selected
                            ? 'var(--dt-info-border)'
                            : highlighted
                              ? severityColor
                              : 'var(--dt-border)',
                          backgroundColor: selected
                            ? 'var(--dt-info-bg)'
                            : highlighted
                              ? 'var(--dt-bg-element)'
                              : 'transparent',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono truncate" style={{ color: severityColor }}>
                              {a.id} · {a.summary}
                            </div>
                            <div className="text-[9px] truncate" style={{ color: 'var(--dt-text-muted)' }}>
                              {a.requires.status === 'ok'
                                ? 'ok'
                                : `insufficient_evidence${a.requires.missingFields?.length ? `: ${a.requires.missingFields.join(', ')}` : ''}`}
                            </div>
                          </div>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded border font-mono shrink-0"
                            style={{
                              borderColor: severityColor,
                              color: severityColor,
                              backgroundColor: 'transparent',
                            }}
                          >
                            {a.severity}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {selectedAudit && (
                <div className="px-3 pb-3">
                  <div className="mt-3 text-[10px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
                    {selectedAudit.id} Details
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--dt-text-muted)' }}>
                    {selectedAudit.explanation}
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="text-[9px] uppercase" style={{ color: 'var(--dt-text-muted)' }}>
                      Recommendations
                    </div>
                    <ul className="list-disc pl-5 text-[10px]" style={{ color: 'var(--dt-text-secondary)' }}>
                      {selectedAudit.recommendations.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {selectedAudit.snippets.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[9px] uppercase" style={{ color: 'var(--dt-text-muted)' }}>
                        Snippets
                      </div>
                      {selectedAudit.snippets.map((s) => (
                        <div
                          key={s.kind}
                          className="rounded border p-2"
                          style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-element)' }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[9px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
                              {s.kind} · expected={s.expectedConfigScope}
                            </div>
                            <div className="text-[9px]" style={{ color: 'var(--dt-text-muted)' }}>
                              {s.scope}
                            </div>
                          </div>
                          <pre
                            className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-all"
                            style={{ color: 'var(--dt-text-primary)' }}
                          >
                            {s.text}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
