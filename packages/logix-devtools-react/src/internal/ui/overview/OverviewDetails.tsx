import React from 'react'
import * as Logix from '@logixjs/core'
import { useDevtoolsDispatch } from '../hooks/DevtoolsHooks.js'
import { getDevtoolsSnapshotOverrideInfo } from '../../snapshot/index.js'

export interface OverviewDetailsSummary {
  readonly selection: {
    readonly selectedRuntime?: string
    readonly selectedModule?: string
    readonly selectedInstance?: string
    readonly selectedFieldPath?: string
    readonly selectedEventIndex?: number
  }
  readonly selectorLane: {
    readonly total: number
    readonly staticCount: number
    readonly dynamicCount: number
    readonly fallbackTop: ReadonlyArray<{ readonly reason: string; readonly count: number }>
  }
  readonly txnLane: {
    readonly total: number
    readonly last: {
      readonly lane: string
      readonly kind: string
      readonly pendingCount: number
      readonly ageMs: number | null
      readonly coalescedCount: number | null
      readonly canceledCount: number | null
      readonly reasons: ReadonlyArray<string>
    } | null
  }
  readonly timeline: {
    readonly length: number
    readonly lastTypes: ReadonlyArray<string>
    readonly timelineRange: { readonly start: number; readonly end: number } | null
  }
  readonly layout: {
    readonly viewportRect: { readonly width: number; readonly height: number } | null
    readonly barWidthPx: number
    readonly shiftPx: number
    readonly shiftOffsetPx: number
    readonly shift: {
      readonly phase: 'prep' | 'animating'
      readonly deltaBuckets: number
      readonly fromFirstBucketId: number
      readonly toTipBucketId: number
    } | null
    readonly refs: {
      readonly windowTipBucketId: number | null
      readonly snapTipBucketId: number | null
      readonly lastObservedTipBucketId: number | null
      readonly pendingShift: {
        readonly deltaBuckets: number
        readonly fromFirstBucketId: number
        readonly toTipBucketId: number
      } | null
    }
  }
  readonly buckets: {
    readonly count: number
    readonly emptyBuckets: number
    readonly nonEmptyBuckets: number
    readonly maxTxn: number
    readonly maxRender: number
    readonly maxValue: number
  }
}

export interface OverviewDetailsProps {
  readonly open: boolean
  readonly onToggleOpen: () => void
  readonly summary: OverviewDetailsSummary
  readonly debugText: string
}

export const OverviewDetails: React.FC<OverviewDetailsProps> = ({ open, onToggleOpen, summary, debugText }) => {
  const dispatch = useDevtoolsDispatch()

  const canCopy = open && debugText.length > 0 && typeof navigator !== 'undefined' && !!navigator.clipboard

  const [importJson, setImportJson] = React.useState('')
  const [exportJson, setExportJson] = React.useState('')

  const overrideInfo = getDevtoolsSnapshotOverrideInfo()
  const importedEvidence = overrideInfo?.kind === 'evidence' ? overrideInfo.evidence : undefined

  const canCopyEvidence = open && exportJson.length > 0 && typeof navigator !== 'undefined' && !!navigator.clipboard

  const selectionLabel = (() => {
    const parts: string[] = []
    if (summary.selection.selectedRuntime) parts.push(`runtime=${summary.selection.selectedRuntime}`)
    if (summary.selection.selectedModule) parts.push(`module=${summary.selection.selectedModule}`)
    if (summary.selection.selectedInstance) parts.push(`instance=${summary.selection.selectedInstance}`)
    return parts.length > 0 ? parts.join(' · ') : 'no selection'
  })()

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
            Details
          </span>
          <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
            {selectionLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
            style={{
              borderColor: 'var(--dt-border)',
              color: open ? 'var(--dt-primary)' : 'var(--dt-text-secondary)',
              backgroundColor: open ? 'var(--dt-primary-bg)' : 'transparent',
            }}
            onClick={onToggleOpen}
          >
            {open ? 'Hide' : 'Show'}
          </button>

          <button
            type="button"
            className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
            style={{
              borderColor: 'var(--dt-border)',
              color: canCopy ? 'var(--dt-text-secondary)' : 'var(--dt-text-dim)',
              backgroundColor: 'transparent',
              opacity: canCopy ? 1 : 0.6,
            }}
            disabled={!canCopy}
            onClick={() => {
              if (!canCopy) return
              navigator.clipboard.writeText(debugText).catch(() => undefined)
            }}
          >
            Copy
          </button>
        </div>
      </div>

      <div
        className="mt-1 rounded border p-2"
        style={{
          borderColor: 'var(--dt-border)',
          backgroundColor: 'var(--dt-bg-surface)',
          color: 'var(--dt-text-secondary)',
        }}
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono">
          <div>
            selectorLane: static {summary.selectorLane.staticCount}, dynamic {summary.selectorLane.dynamicCount}
          </div>
          <div>
            txnBacklog:{' '}
            {summary.txnLane.last
              ? `pending ${summary.txnLane.last.pendingCount}, age ${summary.txnLane.last.ageMs ?? 'n/a'}ms`
              : 'none'}
          </div>
          <div>
            fallbackTop:{' '}
            {summary.selectorLane.fallbackTop.length > 0
              ? summary.selectorLane.fallbackTop.map((x) => `${x.reason} ${x.count}`).join(' · ')
              : 'none'}
          </div>
          <div>
            txnReasons:{' '}
            {summary.txnLane.last && summary.txnLane.last.reasons.length > 0
              ? summary.txnLane.last.reasons.join(' · ')
              : 'none'}
          </div>
          <div>events: {summary.timeline.length}</div>
          <div>
            buckets: {summary.buckets.count} (non-empty: {summary.buckets.nonEmptyBuckets})
          </div>
          <div>
            max: {summary.buckets.maxValue} (txn: {summary.buckets.maxTxn}, render: {summary.buckets.maxRender})
          </div>
          <div>
            barWidthPx: {Number.isFinite(summary.layout.barWidthPx) ? summary.layout.barWidthPx.toFixed(2) : 'n/a'}
          </div>
          <div>
            windowTip: {summary.layout.refs.windowTipBucketId ?? 'null'} · observedTip:{' '}
            {summary.layout.refs.lastObservedTipBucketId ?? 'null'}
          </div>
          <div>
            shift:{' '}
            {summary.layout.shift ? `${summary.layout.shift.phase} Δ${summary.layout.shift.deltaBuckets}` : 'none'} ·
            offsetPx: {Math.round(summary.layout.shiftOffsetPx)}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="mt-2 rounded border p-2"
          style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-surface)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
              EvidencePackage
            </span>
            <span
              className="text-[9px] font-mono"
              style={{ color: importedEvidence ? 'var(--dt-warning)' : 'var(--dt-text-dim)' }}
            >
              {importedEvidence ? `imported · runId=${importedEvidence.runId}` : 'live'}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                borderColor: 'var(--dt-border)',
                color: 'var(--dt-text-secondary)',
                backgroundColor: 'transparent',
              }}
              onClick={() => {
                const evidence =
                  importedEvidence ??
                  Logix.Debug.exportEvidencePackage({
                    source: { host: 'browser', label: 'logix-devtools-react' },
                  })

                let text = ''
                try {
                  text = JSON.stringify(evidence, null, 2)
                } catch {
                  text = String(evidence)
                }

                setExportJson(text)

                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(text).catch(() => undefined)
                }
              }}
            >
              Export + Copy
            </button>

            {importedEvidence && (
              <button
                type="button"
                className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: 'var(--dt-border)',
                  color: 'var(--dt-primary)',
                  backgroundColor: 'var(--dt-primary-bg)',
                }}
                onClick={() => dispatch({ _tag: 'clearImportedEvidence', payload: undefined })}
              >
                Use Live
              </button>
            )}
          </div>

          {exportJson.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                  export.json
                </span>
                <button
                  type="button"
                  className="text-[9px] font-mono px-1 py-0.5 rounded border"
                  style={{
                    borderColor: 'var(--dt-border)',
                    color: canCopyEvidence ? 'var(--dt-text-secondary)' : 'var(--dt-text-dim)',
                    backgroundColor: 'transparent',
                    opacity: canCopyEvidence ? 1 : 0.6,
                  }}
                  disabled={!canCopyEvidence}
                  onClick={() => {
                    if (!canCopyEvidence) return
                    navigator.clipboard.writeText(exportJson).catch(() => undefined)
                  }}
                >
                  Copy
                </button>
              </div>
              <textarea
                readOnly
                spellCheck={false}
                value={exportJson}
                rows={6}
                className="w-full mt-1 rounded border font-mono text-[10px] p-2"
                style={{
                  borderColor: 'var(--dt-border)',
                  backgroundColor: 'var(--dt-bg-element)',
                  color: 'var(--dt-text-primary)',
                  resize: 'vertical',
                }}
              />
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                import.json
              </span>
              <button
                type="button"
                className="text-[9px] font-mono px-1 py-0.5 rounded border"
                style={{
                  borderColor: 'var(--dt-border)',
                  color: 'var(--dt-text-secondary)',
                  backgroundColor: 'transparent',
                }}
                onClick={() => dispatch({ _tag: 'importEvidenceJson', payload: importJson })}
              >
                Import
              </button>
            </div>

            <textarea
              spellCheck={false}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              rows={5}
              placeholder="Paste EvidencePackage JSON here…"
              className="w-full mt-1 rounded border font-mono text-[10px] p-2"
              style={{
                borderColor: 'var(--dt-border)',
                backgroundColor: 'var(--dt-bg-element)',
                color: 'var(--dt-text-primary)',
                resize: 'vertical',
              }}
            />

            <div className="mt-1 flex items-center justify-between">
              <input
                type="file"
                accept="application/json,.json"
                className="text-[9px] font-mono"
                style={{ color: 'var(--dt-text-secondary)' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  file
                    .text()
                    .then((text) => setImportJson(text))
                    .catch(() => undefined)
                }}
              />
              <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-dim)' }}>
                导入后将切换为离线快照视图
              </span>
            </div>
          </div>
        </div>
      )}

      {open && (
        <textarea
          readOnly
          spellCheck={false}
          value={debugText}
          rows={10}
          className="w-full mt-2 rounded border font-mono text-[10px] p-2"
          style={{
            borderColor: 'var(--dt-border)',
            backgroundColor: 'var(--dt-bg-surface)',
            color: 'var(--dt-text-primary)',
            resize: 'vertical',
          }}
        />
      )}
    </div>
  )
}
