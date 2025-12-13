import React from 'react'

export interface OverviewDetailsSummary {
  readonly selection: {
    readonly selectedRuntime?: string
    readonly selectedModule?: string
    readonly selectedInstance?: string
    readonly selectedFieldPath?: string
    readonly selectedEventIndex?: number
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
    readonly shift:
      | {
          readonly phase: 'prep' | 'animating'
          readonly deltaBuckets: number
          readonly fromFirstBucketId: number
          readonly toTipBucketId: number
        }
      | null
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
  const canCopy = open && debugText.length > 0 && typeof navigator !== 'undefined' && !!navigator.clipboard

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
          <div>events: {summary.timeline.length}</div>
          <div>
            buckets: {summary.buckets.count} (non-empty: {summary.buckets.nonEmptyBuckets})
          </div>
          <div>
            max: {summary.buckets.maxValue} (txn: {summary.buckets.maxTxn}, render: {summary.buckets.maxRender})
          </div>
          <div>barWidthPx: {Number.isFinite(summary.layout.barWidthPx) ? summary.layout.barWidthPx.toFixed(2) : 'n/a'}</div>
          <div>
            windowTip: {summary.layout.refs.windowTipBucketId ?? 'null'} · observedTip:{' '}
            {summary.layout.refs.lastObservedTipBucketId ?? 'null'}
          </div>
          <div>
            shift: {summary.layout.shift ? `${summary.layout.shift.phase} Δ${summary.layout.shift.deltaBuckets}` : 'none'} ·
            offsetPx: {Math.round(summary.layout.shiftOffsetPx)}
          </div>
        </div>
      </div>

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

