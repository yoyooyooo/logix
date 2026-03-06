type EvidenceAgg = {
  readonly ok: number
  readonly unavailable: number
  readonly missing: number
  readonly value?: number | string
}

type EvidenceDelta = {
  readonly name: string
  readonly before: EvidenceAgg
  readonly after: EvidenceAgg
}

type WatchersPhaseDisplaySegment = {
  readonly name: string
  readonly label: string
  readonly afterMs: number
  readonly beforeMs?: number
  readonly deltaMs?: number
  readonly shareOfTrackedAfter: number
}

export type WatchersPhaseDisplay = {
  readonly kind: 'watchersPairedPhase'
  readonly suiteId: string
  readonly headline: string
  readonly guidance: string
  readonly dominantSegment: {
    readonly name: string
    readonly label: string
    readonly afterMs: number
    readonly shareOfTrackedAfter: number
  }
  readonly totalTrackedAfterMs: number
  readonly segments: ReadonlyArray<WatchersPhaseDisplaySegment>
}

export type PerfDiffHighlight = {
  readonly kind: 'watchersPairedPhase'
  readonly suiteId: string
  readonly headline: string
  readonly guidance: string
}

const WATCHERS_PHASES = [
  { name: 'watchers.phase.clickInvokeToNativeCaptureMs', label: 'clickInvokeToNativeCapture' },
  { name: 'watchers.phase.nativeCaptureToHandlerMs', label: 'nativeCaptureToHandler' },
  { name: 'watchers.phase.handlerToDomStableMs', label: 'handlerToDomStable' },
  { name: 'watchers.phase.domStableToPaintGapMs', label: 'domStableToPaintGap' },
] as const

const WATCHERS_PHASE_GUIDANCE =
  'use paired phase evidence from this suite sample; do not subtract independent suite aggregates such as watchers.clickToPaint - watchers.clickToDomStable'

const formatMs = (value: number): string => `${value.toFixed(1)}ms`

const asFiniteNumber = (value: number | string | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

export const buildWatchersPhaseDisplay = (
  suiteId: string,
  evidenceDeltas: ReadonlyArray<EvidenceDelta> | undefined,
): WatchersPhaseDisplay | undefined => {
  if (!suiteId.startsWith('watchers.') || !evidenceDeltas || evidenceDeltas.length === 0) {
    return undefined
  }

  const rawSegments = WATCHERS_PHASES.map((phase) => {
    const delta = evidenceDeltas.find((entry) => entry.name === phase.name)
    if (!delta) return undefined

    const afterMs = asFiniteNumber(delta.after.value)
    if (afterMs === undefined) return undefined

    const beforeMs = asFiniteNumber(delta.before.value)
    return {
      name: phase.name,
      label: phase.label,
      afterMs,
      beforeMs,
      deltaMs: beforeMs === undefined ? undefined : afterMs - beforeMs,
    }
  }).filter((segment): segment is NonNullable<typeof segment> => segment !== undefined)

  if (rawSegments.length === 0) {
    return undefined
  }

  const totalTrackedAfterMs = rawSegments.reduce((sum, segment) => sum + segment.afterMs, 0)
  if (!Number.isFinite(totalTrackedAfterMs) || totalTrackedAfterMs <= 0) {
    return undefined
  }

  const segments = rawSegments.map((segment) => ({
    ...segment,
    shareOfTrackedAfter: segment.afterMs / totalTrackedAfterMs,
  }))

  const dominantSegment = segments.reduce((best, segment) => (segment.afterMs > best.afterMs ? segment : best))

  const headline = `${suiteId} paired phase(after median): ${segments
    .map((segment) => `${segment.label}=${formatMs(segment.afterMs)}`)
    .join(', ')}; dominant=${dominantSegment.label} (${(dominantSegment.shareOfTrackedAfter * 100).toFixed(1)}%)`

  return {
    kind: 'watchersPairedPhase',
    suiteId,
    headline,
    guidance: WATCHERS_PHASE_GUIDANCE,
    dominantSegment: {
      name: dominantSegment.name,
      label: dominantSegment.label,
      afterMs: dominantSegment.afterMs,
      shareOfTrackedAfter: dominantSegment.shareOfTrackedAfter,
    },
    totalTrackedAfterMs,
    segments,
  }
}

export const buildWatchersPhaseHighlight = (
  display: WatchersPhaseDisplay | undefined,
): PerfDiffHighlight | undefined => {
  if (!display) return undefined
  return {
    kind: display.kind,
    suiteId: display.suiteId,
    headline: display.headline,
    guidance: display.guidance,
  }
}

export const applyWatchersPhaseDisplayToNotes = (
  notes: string | undefined,
  display: WatchersPhaseDisplay | undefined,
): string | undefined => {
  if (!display) return notes

  const prefix = `${display.headline}; guidance=${display.guidance}`
  return notes ? `${prefix}; ${notes}` : prefix
}

