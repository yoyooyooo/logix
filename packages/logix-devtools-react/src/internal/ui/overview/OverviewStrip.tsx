import React from 'react'
import * as Logix from '@logixjs/core'
import { useDevtoolsState, useDevtoolsDispatch } from '../hooks/DevtoolsHooks.js'
import { OverviewDetails, type OverviewDetailsSummary } from './OverviewDetails.js'

const MAX_BUCKETS = 24
const GAP_PX = 2
const DEFAULT_BUCKET_MS = 100
const BUCKET_MS_STEPS = [
  25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10_000,
] as const
const SHIFT_MS = 180
const HIGHLIGHT_THROTTLE_MS = 180
const MIN_BAR_SCALE = 0.08

interface Bucket {
  readonly bucketId: number
  readonly txnCount: number
  readonly renderCount: number
  readonly level: 'ok' | 'warn' | 'danger'
  readonly startIndex?: number
  readonly endIndex?: number
  readonly lastChangedAt?: number
  readonly isTip: boolean
  readonly isEmpty: boolean
}

// Snapshot.events is already RuntimeDebugEventRef, and timestamp always exists (core falls back to Date.now).
const getEventTimestamp = (event: Logix.Debug.RuntimeDebugEventRef): number => event.timestamp

type ShiftState = {
  readonly token: number
  readonly deltaBuckets: number
  readonly fromFirstBucketId: number
  readonly toTipBucketId: number
  readonly phase: 'prep' | 'animating'
}

const pickBucketMs = (targetBucketMs: number): number => {
  for (const step of BUCKET_MS_STEPS) {
    if (targetBucketMs <= step) return step
  }
  return BUCKET_MS_STEPS[BUCKET_MS_STEPS.length - 1]
}

export const OverviewStrip: React.FC = () => {
  const state = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()

  const {
    timeline,
    settings,
    timelineRange,
    selectedRuntime,
    selectedModule,
    selectedInstance,
    selectedFieldPath,
    selectedEventIndex,
  } = state

  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [barWidthPx, setBarWidthPx] = React.useState<number>(0)
  const hasTimeline = timeline.length > 0
  const bucketMs = React.useMemo(() => {
    if (timeline.length <= 1) return DEFAULT_BUCKET_MS
    const first = timeline[0]?.event as Logix.Debug.RuntimeDebugEventRef | undefined
    const last = timeline[timeline.length - 1]?.event as Logix.Debug.RuntimeDebugEventRef | undefined
    if (!first || !last) return DEFAULT_BUCKET_MS

    const firstTs = getEventTimestamp(first)
    const lastTs = getEventTimestamp(last)
    const spanMs = Math.max(0, lastTs - firstTs)
    const minWindowMs = DEFAULT_BUCKET_MS * MAX_BUCKETS
    const targetWindowMs = Math.max(minWindowMs, spanMs)
    const targetBucketMs = Math.ceil(targetWindowMs / MAX_BUCKETS)
    return pickBucketMs(targetBucketMs)
  }, [timeline])
  const [detailsOpen, setDetailsOpen] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('logix.devtools.overviewDebug') === '1'
    } catch {
      return false
    }
  })

  // Keep bar width stable (in px) so we can animate track shifts without layout reflow.
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (!hasTimeline) {
      return
    }
    const el = viewportRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      return
    }

    const recalc = () => {
      const width = el.getBoundingClientRect().width
      if (!Number.isFinite(width) || width <= 0) return
      const raw = (width - GAP_PX * (MAX_BUCKETS - 1)) / MAX_BUCKETS
      // Keep sub-pixel precision so the track "fills" the viewport (avoid blank area on the right).
      setBarWidthPx(Math.max(4, raw))
    }

    recalc()

    const ro = new ResizeObserver(() => recalc())
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasTimeline])

  const lastChangedRef = React.useRef<Map<number, number>>(new Map())
  const prevCountsRef = React.useRef<Map<number, { txnCount: number; renderCount: number }>>(new Map())
  const insertedAtRef = React.useRef<Map<number, number>>(new Map())
  const insertedDelayRef = React.useRef<Map<number, number>>(new Map())
  const highlightDelayRef = React.useRef<Map<number, number>>(new Map())
  const bucketMsRef = React.useRef<number>(bucketMs)
  const lastObservedTipBucketIdRef = React.useRef<number | undefined>(undefined)

  // "Window tip" is the right-most bucket currently rendered when no shift is in progress.
  // We keep it stable so we can animate towards the new tip instead of jumping immediately.
  const windowTipBucketIdRef = React.useRef<number | undefined>(undefined)
  const snapTipBucketIdRef = React.useRef<number | null>(null)

  const pendingShiftRef = React.useRef<{
    readonly deltaBuckets: number
    readonly fromFirstBucketId: number
    readonly toTipBucketId: number
  } | null>(null)
  const shiftTokenRef = React.useRef(0)
  const [shift, setShift] = React.useState<ShiftState | null>(null)

  const buckets = React.useMemo<Bucket[]>(() => {
    const prevBucketMs = bucketMsRef.current
    const bucketMsChanged = prevBucketMs !== bucketMs
    if (bucketMsChanged) {
      bucketMsRef.current = bucketMs
      lastChangedRef.current.clear()
      prevCountsRef.current.clear()
      insertedAtRef.current.clear()
      insertedDelayRef.current.clear()
      highlightDelayRef.current.clear()
      lastObservedTipBucketIdRef.current = undefined
      windowTipBucketIdRef.current = undefined
      snapTipBucketIdRef.current = null
      pendingShiftRef.current = null
      shiftTokenRef.current = 0
    }

    const effectiveShift = bucketMsChanged ? null : shift

    if (timeline.length === 0) {
      return []
    }

    const now = Date.now()

    const lastEvent = timeline[timeline.length - 1]?.event as Logix.Debug.RuntimeDebugEventRef | undefined
    const tipTs = lastEvent ? getEventTimestamp(lastEvent) : now
    const tipBucketId = Math.floor(tipTs / bucketMs)

    // Establish a stable "rendered window tip" on first render.
    if (windowTipBucketIdRef.current == null) {
      windowTipBucketIdRef.current = tipBucketId
    }

    // prune highlight maps to avoid unbounded growth (bucketId is monotone increasing)
    const renderTipBucketId = effectiveShift
      ? effectiveShift.toTipBucketId
      : (windowTipBucketIdRef.current ?? tipBucketId)
    const renderFirstBucketId = effectiveShift
      ? effectiveShift.fromFirstBucketId
      : renderTipBucketId - (MAX_BUCKETS - 1)

    for (const key of lastChangedRef.current.keys()) {
      if (key < renderFirstBucketId || key > tipBucketId) {
        lastChangedRef.current.delete(key)
      }
    }
    for (const key of insertedAtRef.current.keys()) {
      if (key < renderFirstBucketId || key > tipBucketId) {
        insertedAtRef.current.delete(key)
      }
    }
    for (const key of insertedDelayRef.current.keys()) {
      if (key < renderFirstBucketId || key > tipBucketId) {
        insertedDelayRef.current.delete(key)
      }
    }
    for (const key of highlightDelayRef.current.keys()) {
      if (key < renderFirstBucketId || key > tipBucketId) {
        highlightDelayRef.current.delete(key)
      }
    }

    // Mark newly inserted buckets (by bucketId jump) so the user can visually count "how many bars got inserted".
    const prevObservedTipBucketId = lastObservedTipBucketIdRef.current
    if (prevObservedTipBucketId != null && tipBucketId > prevObservedTipBucketId) {
      const shiftBaseTipBucketId = effectiveShift
        ? effectiveShift.toTipBucketId
        : (windowTipBucketIdRef.current ?? tipBucketId)
      const needsShift = tipBucketId > shiftBaseTipBucketId
      const flashDelayMs = needsShift ? SHIFT_MS + 40 : 0

      const insertedStart = Math.max(renderFirstBucketId, prevObservedTipBucketId + 1)
      for (let id = insertedStart; id <= tipBucketId; id++) {
        insertedAtRef.current.set(id, now)
        insertedDelayRef.current.set(id, flashDelayMs)
      }
    }
    lastObservedTipBucketIdRef.current = tipBucketId

    // Queue a lightweight "track shift" animation:
    // render [prevWindow .. insertedBuckets] then translateX(-deltaBuckets) to reveal the new window.
    const shiftBaseTipBucketId = effectiveShift
      ? effectiveShift.toTipBucketId
      : (windowTipBucketIdRef.current ?? tipBucketId)

    const delta = tipBucketId - shiftBaseTipBucketId
    if (delta > 0) {
      if (delta > MAX_BUCKETS) {
        // If we fell too far behind (e.g. long idle), snap without animating.
        if (effectiveShift) {
          snapTipBucketIdRef.current = tipBucketId
          pendingShiftRef.current = null
        } else {
          windowTipBucketIdRef.current = tipBucketId
          pendingShiftRef.current = null
        }
      } else {
        pendingShiftRef.current = {
          deltaBuckets: delta,
          fromFirstBucketId: shiftBaseTipBucketId - (MAX_BUCKETS - 1),
          toTipBucketId: tipBucketId,
        }
      }
    }

    const rawBuckets: {
      txnIds: Set<string>
      renderCount: number
      startIndex?: number
      endIndex?: number
      bucketId: number
    }[] = []

    const bucketCount = Math.max(0, renderTipBucketId - renderFirstBucketId + 1)

    for (let i = 0; i < bucketCount; i++) {
      const bucketId = renderFirstBucketId + i
      rawBuckets.push({
        txnIds: new Set<string>(),
        renderCount: 0,
        startIndex: undefined,
        endIndex: undefined,
        bucketId,
      })
    }

    for (let idx = 0; idx < timeline.length; idx++) {
      const entry = timeline[idx]
      const ref = entry.event as Logix.Debug.RuntimeDebugEventRef | undefined
      if (!ref) continue
      const ts = getEventTimestamp(ref)
      const bucketId = Math.floor(ts / bucketMs)
      if (bucketId < renderFirstBucketId || bucketId > renderTipBucketId) continue

      const bucketIndex = bucketId - renderFirstBucketId
      const bucket = rawBuckets[bucketIndex]

      // Transaction counting:
      // - Prefer txnId: multiple events within the same transaction count only once.
      // - If txnId is missing:
      //   - state/action: fall back to index-based keys (at least shows density signal).
      //   - others (trait/service/...): try to group by EffectOp.linkId, otherwise fall back to event index.
      let txnKey: string | undefined = ref.txnId
      if (!txnKey && (ref.kind === 'state' || ref.kind === 'action')) {
        txnKey = `${ref.kind}@${idx}`
      }
      if (!txnKey && ref.kind !== 'react-render') {
        // Runtime has promoted linkId to a first-class field; older events may still need fallback from meta.meta.linkId.
        const metaAny = ref.meta as any
        const opMeta = metaAny && typeof metaAny === 'object' ? metaAny.meta : undefined
        const linkId =
          ref.linkId ??
          (opMeta && typeof opMeta === 'object' && typeof opMeta.linkId === 'string'
            ? (opMeta.linkId as string)
            : undefined)
        txnKey = linkId ? `link@${linkId}` : `event@${idx}`
      }
      if (txnKey) bucket.txnIds.add(txnKey)

      // Render event counting: counts only react-render, used to evaluate render density.
      if (ref.kind === 'react-render') {
        bucket.renderCount += 1
      }

      if (bucket.startIndex == null) {
        bucket.startIndex = idx
        bucket.endIndex = idx
      } else {
        bucket.endIndex = idx
      }
    }

    const { txnPerSecondWarn, txnPerSecondDanger, renderPerTxnWarn, renderPerTxnDanger } = settings.overviewThresholds

    const nextCounts = new Map<number, { txnCount: number; renderCount: number }>()

    const buckets = rawBuckets.map((b) => {
      const txnCount = b.txnIds.size
      const renderCount = b.renderCount
      const isTip = b.bucketId === renderTipBucketId
      const isEmpty = txnCount === 0 && renderCount === 0

      const prev = prevCountsRef.current.get(b.bucketId)

      // Determine if visual update is needed:
      // 1. If it's the "Tip" (latest bucket), any increase in count is significant activity.
      // 2. Ideally we only flash if count INCREASED, not just changed (re-scale might decrease).
      // 3. For historical buckets (non-tip), we only flash if it goes from empty -> non-empty (avoid re-scale noise).
      const wasEmpty = !prev || (prev.txnCount === 0 && prev.renderCount === 0)

      let changed = false
      if (isTip) {
        // Tip logic: Flash on any *increase* or if it was empty.
        // Even if count is same but reference changed, we might check strictly count.
        // Assuming monotone increase for tip usually.
        if (prev) {
          if (txnCount > prev.txnCount || renderCount > prev.renderCount) {
            changed = true
          }
        } else {
          // Newly created tip bucket
          changed = !isEmpty
        }
      } else {
        // History logic: Stable, only flash if woke up from empty.
        changed = wasEmpty && !isEmpty
      }

      if (changed) {
        const last = lastChangedRef.current.get(b.bucketId)
        if (!isTip || last == null || now - last > HIGHLIGHT_THROTTLE_MS) {
          lastChangedRef.current.set(b.bucketId, now)
          highlightDelayRef.current.set(b.bucketId, effectiveShift ? SHIFT_MS + 40 : 0)
        }
      }
      nextCounts.set(b.bucketId, { txnCount, renderCount })

      // level is based on "per second" thresholds: convert bucketMs time buckets into per-second values.
      const txnPerSecond = (txnCount * 1000) / bucketMs
      const renderPerSecond = (renderCount * 1000) / bucketMs

      let level: Bucket['level'] = 'ok'
      if (
        txnPerSecond >= txnPerSecondDanger ||
        (txnCount > 0 &&
          // renderPerTxn* is still judged by "renders per transaction" density;
          // renderPerSecond is only used together with txnPerSecond to trigger overall danger thresholds.
          (renderCount >= renderPerTxnDanger * Math.max(1, txnCount) || renderPerSecond >= txnPerSecondDanger))
      ) {
        level = 'danger'
      } else if (
        txnPerSecond >= txnPerSecondWarn ||
        (txnCount > 0 &&
          (renderCount >= renderPerTxnWarn * Math.max(1, txnCount) || renderPerSecond >= txnPerSecondWarn))
      ) {
        level = 'warn'
      }

      return {
        bucketId: b.bucketId,
        txnCount,
        renderCount,
        level,
        startIndex: b.startIndex,
        endIndex: b.endIndex,
        lastChangedAt: lastChangedRef.current.get(b.bucketId),
        isTip,
        isEmpty,
      }
    })

    prevCountsRef.current = nextCounts
    return buckets
  }, [bucketMs, timeline, settings, shift])

  React.useEffect(() => {
    setShift(null)
  }, [bucketMs])

  // Start a shift animation (before paint) when new buckets are inserted.
  React.useLayoutEffect(() => {
    if (shift) return
    const pending = pendingShiftRef.current
    if (!pending) return
    pendingShiftRef.current = null

    // If we don't have a stable bar width yet (e.g. first render after “no events”),
    // fall back to snapping the window instead of starting an animation that can never finish.
    if (barWidthPx <= 0) {
      windowTipBucketIdRef.current = pending.toTipBucketId
      return
    }

    const token = ++shiftTokenRef.current
    setShift({
      token,
      deltaBuckets: pending.deltaBuckets,
      fromFirstBucketId: pending.fromFirstBucketId,
      toTipBucketId: pending.toTipBucketId,
      phase: 'prep',
    })
  }, [barWidthPx, shift, timeline])

  // Two-phase shift: render (prep, translateX=0) -> next frame (animating, translateX=-delta).
  React.useLayoutEffect(() => {
    if (!shift || shift.phase !== 'prep') return
    if (typeof window === 'undefined') return
    const token = shift.token
    const id = window.requestAnimationFrame(() => {
      setShift((prev) => {
        if (!prev || prev.token !== token) return prev
        return { ...prev, phase: 'animating' }
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [shift])

  const handleBucketClick = (bucket: Bucket) => {
    if (bucket.startIndex == null || bucket.endIndex == null) {
      return
    }
    if (timelineRange && timelineRange.start === bucket.startIndex && timelineRange.end === bucket.endIndex) {
      dispatch({ _tag: 'clearTimelineRange', payload: undefined })
      return
    }

    dispatch({
      _tag: 'setTimelineRange',
      payload: { start: bucket.startIndex, end: bucket.endIndex },
    })
  }

  const maxTxn = buckets.reduce((acc, b) => Math.max(acc, b.txnCount), 0)
  const maxRender = buckets.reduce((acc, b) => Math.max(acc, b.renderCount), 0)
  const maxValue = Math.max(1, maxTxn, maxRender)
  const now = Date.now()
  const shiftPx = barWidthPx > 0 ? barWidthPx + GAP_PX : 0
  const shiftOffsetPx = shift && shift.phase === 'animating' && shiftPx > 0 ? shift.deltaBuckets * shiftPx : 0

  const detailsSummary = React.useMemo<OverviewDetailsSummary>(() => {
    const lastTypes = timeline
      .slice(Math.max(0, timeline.length - 12))
      .map((e) => ((e.event as any)?.type ? String((e.event as any).type) : 'unknown'))

    const emptyBuckets = buckets.filter((b) => b.isEmpty).length

    const entries = timelineRange ? timeline.slice(timelineRange.start, timelineRange.end + 1) : timeline
    let selectorTotal = 0
    let selectorStatic = 0
    let selectorDynamic = 0
    const fallbackCounts = new Map<string, number>()

    let txnLaneTotal = 0
    let lastTxnLaneRef: any | undefined = undefined

    for (const entry of entries) {
      const ref: any = (entry as any)?.event
      if (!ref || ref.kind !== 'react-selector') continue
      selectorTotal += 1

      const meta: any = ref.meta
      const lane = meta?.lane
      if (lane === 'static') selectorStatic += 1
      else if (lane === 'dynamic') selectorDynamic += 1

      const fallbackReason = meta?.fallbackReason
      if (typeof fallbackReason === 'string' && fallbackReason.length > 0) {
        fallbackCounts.set(fallbackReason, (fallbackCounts.get(fallbackReason) ?? 0) + 1)
      }
    }

    for (const entry of entries) {
      const ref: any = (entry as any)?.event
      if (!ref || ref.kind !== 'txn-lane') continue
      txnLaneTotal += 1
      lastTxnLaneRef = ref
    }

    const fallbackTop = Array.from(fallbackCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }))

    const lastTxnLaneMeta: any = lastTxnLaneRef?.meta
    const backlog: any = lastTxnLaneMeta?.backlog
    const txnReasons = Array.isArray(lastTxnLaneMeta?.reasons)
      ? lastTxnLaneMeta.reasons.filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
      : []

    const txnLaneLast =
      txnLaneTotal > 0
        ? {
            lane:
              typeof lastTxnLaneMeta?.lane === 'string' && lastTxnLaneMeta.lane.length > 0
                ? lastTxnLaneMeta.lane
                : 'unknown',
            kind:
              typeof lastTxnLaneMeta?.kind === 'string' && lastTxnLaneMeta.kind.length > 0
                ? lastTxnLaneMeta.kind
                : 'unknown',
            pendingCount:
              typeof backlog?.pendingCount === 'number' &&
              Number.isFinite(backlog.pendingCount) &&
              backlog.pendingCount >= 0
                ? Math.floor(backlog.pendingCount)
                : 0,
            ageMs:
              typeof backlog?.ageMs === 'number' && Number.isFinite(backlog.ageMs) && backlog.ageMs >= 0
                ? backlog.ageMs
                : null,
            coalescedCount:
              typeof backlog?.coalescedCount === 'number' &&
              Number.isFinite(backlog.coalescedCount) &&
              backlog.coalescedCount >= 0
                ? Math.floor(backlog.coalescedCount)
                : null,
            canceledCount:
              typeof backlog?.canceledCount === 'number' &&
              Number.isFinite(backlog.canceledCount) &&
              backlog.canceledCount >= 0
                ? Math.floor(backlog.canceledCount)
                : null,
            reasons: txnReasons,
          }
        : null

    return {
      selection: {
        selectedRuntime,
        selectedModule,
        selectedInstance,
        selectedFieldPath,
        selectedEventIndex,
      },
      selectorLane: {
        total: selectorTotal,
        staticCount: selectorStatic,
        dynamicCount: selectorDynamic,
        fallbackTop,
      },
      txnLane: {
        total: txnLaneTotal,
        last: txnLaneLast,
      },
      timeline: {
        length: timeline.length,
        lastTypes,
        timelineRange: timelineRange ?? null,
      },
      layout: {
        viewportRect: null,
        barWidthPx,
        shiftPx,
        shiftOffsetPx,
        shift: shift
          ? {
              phase: shift.phase,
              deltaBuckets: shift.deltaBuckets,
              fromFirstBucketId: shift.fromFirstBucketId,
              toTipBucketId: shift.toTipBucketId,
            }
          : null,
        refs: {
          windowTipBucketId: windowTipBucketIdRef.current ?? null,
          snapTipBucketId: snapTipBucketIdRef.current ?? null,
          lastObservedTipBucketId: lastObservedTipBucketIdRef.current ?? null,
          pendingShift: pendingShiftRef.current ?? null,
        },
      },
      buckets: {
        count: buckets.length,
        emptyBuckets,
        nonEmptyBuckets: buckets.length - emptyBuckets,
        maxTxn,
        maxRender,
        maxValue,
      },
    }
  }, [
    barWidthPx,
    buckets,
    maxRender,
    maxTxn,
    maxValue,
    selectedEventIndex,
    selectedFieldPath,
    selectedInstance,
    selectedModule,
    selectedRuntime,
    shift,
    shiftOffsetPx,
    shiftPx,
    timeline,
    timelineRange,
  ])

  const debugText = React.useMemo(() => {
    if (!detailsOpen) return ''

    const viewportRect = (() => {
      if (typeof window === 'undefined') return undefined
      const el = viewportRef.current
      if (!el) return undefined
      const rect = el.getBoundingClientRect()
      return {
        width: rect.width,
        height: rect.height,
      }
    })()

    const payload = {
      ...detailsSummary,
      overview: {
        constants: {
          MAX_BUCKETS,
          GAP_PX,
          DEFAULT_BUCKET_MS,
          bucketMs,
          windowMs: bucketMs * MAX_BUCKETS,
          SHIFT_MS,
        },
        viewportRect,
        buckets: {
          count: buckets.length,
          items: buckets.map((b) => ({
            bucketId: b.bucketId,
            txnCount: b.txnCount,
            renderCount: b.renderCount,
            level: b.level,
            isTip: b.isTip,
            isEmpty: b.isEmpty,
            startIndex: b.startIndex ?? null,
            endIndex: b.endIndex ?? null,
            lastChangedAt: b.lastChangedAt ?? null,
          })),
        },
      },
    }

    try {
      return JSON.stringify(payload, null, 2)
    } catch {
      return String(payload)
    }
  }, [buckets, bucketMs, detailsOpen, detailsSummary])

  if (buckets.length === 0) {
    return (
      <div
        className="px-4 py-1.5 text-[10px] font-mono border-b"
        style={{
          borderColor: 'var(--dt-border)',
          backgroundColor: 'var(--dt-bg-root)',
          color: 'var(--dt-text-muted)',
        }}
      >
        Overview: no events yet
      </div>
    )
  }

  return (
    <div
      className="px-4 py-2 border-b flex flex-col gap-1"
      style={{
        borderColor: 'var(--dt-border)',
        backgroundColor: 'var(--dt-bg-root)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--dt-text-muted)' }}>
          Overview
        </span>
        <span
          className="text-[9px] font-mono"
          style={{ color: 'var(--dt-text-secondary)' }}
          title="Render density uses trace:react-render event count (per useModule call, per commit)"
        >
          Txn / react-render density
        </span>
      </div>
      <div ref={viewportRef} className="dt-overview-viewport h-10">
        <div
          className="dt-overview-track flex items-end h-full"
          style={{
            transform: shiftOffsetPx > 0 ? `translateX(-${shiftOffsetPx}px)` : 'translateX(0px)',
            transition: shift && shift.phase === 'animating' ? `transform ${SHIFT_MS}ms ease-out` : 'none',
            gap: `${GAP_PX}px`,
          }}
          onTransitionEnd={(e) => {
            if (!shift || shift.phase !== 'animating') return
            if (e.target !== e.currentTarget) return
            if (e.propertyName !== 'transform') return
            // Commit the new window.
            windowTipBucketIdRef.current = shift.toTipBucketId
            if (snapTipBucketIdRef.current != null) {
              windowTipBucketIdRef.current = snapTipBucketIdRef.current
              snapTipBucketIdRef.current = null
            }
            setShift(null)
          }}
        >
          {buckets.map((bucket) => {
            const isActive =
              bucket.startIndex != null &&
              bucket.endIndex != null &&
              timelineRange &&
              timelineRange.start === bucket.startIndex &&
              timelineRange.end === bucket.endIndex

            const highlightMs = settings.overviewHighlightDurationMs ?? 0
            const isHighlighted =
              !isActive && highlightMs > 0 && bucket.lastChangedAt != null && now - bucket.lastChangedAt < highlightMs

            const insertedAt = insertedAtRef.current.get(bucket.bucketId)
            const insertedDelayMs = insertedDelayRef.current.get(bucket.bucketId) ?? 0
            const insertedWindowMs = 900
            const isInserted = insertedAt != null && now - insertedAt < insertedWindowMs

            const heightRatio = bucket.txnCount / maxValue
            const renderRatio = bucket.renderCount / maxValue

            const txnScale = bucket.txnCount > 0 ? Math.max(MIN_BAR_SCALE, heightRatio) : 0
            const renderScale = bucket.renderCount > 0 ? Math.max(MIN_BAR_SCALE, renderRatio) : 0
            const highlightDelayMs = highlightDelayRef.current.get(bucket.bucketId) ?? 0

            // Default bar color (txn density):
            // - ok: primary (green) should remain visible on dark backgrounds.
            // - warn/danger: use strong warning/danger colors for emphasis.
            let backgroundColor = 'var(--dt-primary)'
            if (bucket.level === 'danger') {
              backgroundColor = 'var(--dt-danger)'
            } else if (bucket.level === 'warn') {
              backgroundColor = 'var(--dt-warning)'
            }

            let accentBg = 'var(--dt-primary-bg)'
            if (bucket.level === 'danger') {
              accentBg = 'var(--dt-danger-bg)'
            } else if (bucket.level === 'warn') {
              accentBg = 'var(--dt-warning-bg)'
            }

            const showInsertFlash = isInserted && !bucket.isEmpty
            const showHighlightFlash = isHighlighted && !bucket.isEmpty

            return (
              <button
                key={bucket.bucketId}
                type="button"
                onClick={() => handleBucketClick(bucket)}
                aria-label="OverviewBucket"
                aria-disabled={bucket.isEmpty ? true : undefined}
                disabled={bucket.isEmpty}
                className="dt-overview-bucket relative h-full overflow-hidden rounded-sm"
                data-active={isActive ? 'true' : 'false'}
                data-empty={bucket.isEmpty ? 'true' : 'false'}
                style={{
                  minWidth: 4,
                  flex: barWidthPx > 0 ? `0 0 ${barWidthPx}px` : '1 1 0%',
                  transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                  ['--dt-overview-accent' as any]: backgroundColor,
                  ['--dt-overview-accent-bg' as any]: accentBg,
                }}
              >
                {/* Insert Flash - helps users perceive "how many bars were inserted" during bursts */}
                {showInsertFlash && (
                  <div
                    key={`insert-${bucket.bucketId}-${insertedAt}`}
                    className="dt-overview-insert absolute inset-0 rounded-sm pointer-events-none"
                    style={{
                      zIndex: 6,
                      animationDelay: insertedDelayMs ? `${insertedDelayMs}ms` : undefined,
                    }}
                  />
                )}

                {/* Count Highlight - short flash to indicate activity */}
                {showHighlightFlash && bucket.lastChangedAt != null && (
                  <div
                    key={`highlight-${bucket.lastChangedAt}`}
                    className="dt-overview-highlight absolute rounded-sm pointer-events-none"
                    style={{
                      zIndex: 10,
                      animationDelay: highlightDelayMs ? `${highlightDelayMs}ms` : undefined,
                    }}
                  />
                )}

                <div className="relative w-full h-full">
                  <div
                    className="dt-overview-bar absolute inset-x-0 bottom-0 h-full"
                    style={{
                      transform: `scaleY(${txnScale})`,
                      backgroundColor,
                      opacity: isActive ? 1 : 0.92,
                    }}
                  />
                  {renderScale > 0 && (
                    <div
                      className="dt-overview-bar absolute inset-x-0 bottom-0 h-full"
                      style={{
                        transform: `scaleY(${renderScale})`,
                        backgroundColor: 'var(--dt-warning)',
                        opacity: 0.55,
                      }}
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <OverviewDetails
        open={detailsOpen}
        onToggleOpen={() => {
          setDetailsOpen((prev) => {
            const next = !prev
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem('logix.devtools.overviewDebug', next ? '1' : '0')
              } catch {
                // ignore
              }
            }
            return next
          })
        }}
        summary={{
          ...detailsSummary,
          layout: {
            ...detailsSummary.layout,
            viewportRect:
              detailsOpen && typeof window !== 'undefined' && viewportRef.current
                ? (() => {
                    const rect = viewportRef.current?.getBoundingClientRect()
                    if (!rect) return null
                    return {
                      width: rect.width,
                      height: rect.height,
                    }
                  })()
                : null,
          },
        }}
        debugText={debugText}
      />
    </div>
  )
}
