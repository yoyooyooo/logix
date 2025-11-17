import type { ConvergeOrderKey, ConvergeTxnRow } from './model.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const asNonNegativeInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n >= 0 ? n : undefined
}

const readTraitConvergeRef = (
  event: unknown,
):
  | {
      readonly moduleId: string
      readonly instanceId: string
      readonly txnId?: string
      readonly txnSeq: number
      readonly eventSeq: number
      readonly timestamp: number
      readonly meta: unknown
      readonly downgradeReason?: string
    }
  | undefined => {
  if (!isRecord(event)) return undefined
  if (event.kind !== 'trait:converge') return undefined

  const moduleId = asNonEmptyString(event.moduleId)
  const instanceId = asNonEmptyString(event.instanceId)
  const txnSeq = asNonNegativeInt(event.txnSeq)
  const eventSeq = asNonNegativeInt(event.eventSeq)
  const timestamp = asFiniteNumber(event.timestamp)

  if (!moduleId || !instanceId || txnSeq == null || eventSeq == null || timestamp == null) {
    return undefined
  }

  const txnId = asNonEmptyString(event.txnId)
  const meta = (event as any).meta as unknown

  const downgrade = (event as any).downgrade
  const downgradeReason =
    isRecord(downgrade) && asNonEmptyString(downgrade.reason) ? (downgrade.reason as string) : undefined

  return {
    moduleId,
    instanceId,
    txnId,
    txnSeq,
    eventSeq,
    timestamp,
    meta,
    downgradeReason,
  }
}

export const makeConvergeLaneKey = (params: { readonly moduleId: string; readonly instanceId: string }): string =>
  `${params.moduleId}::${params.instanceId}`

export const makeConvergeTxnKey = (row: Pick<ConvergeTxnRow, 'moduleId' | 'instanceId' | 'txnSeq'>): string =>
  `${row.moduleId}::${row.instanceId}::t${row.txnSeq}`

export type ConvergeLane = {
  readonly laneKey: string
  readonly moduleId: string
  readonly instanceId: string
  readonly transactions: ReadonlyArray<ConvergeTxnRow>
}

type TimelineRange = { readonly start: number; readonly end: number }

export const extractConvergeTxnRows = (
  timeline: ReadonlyArray<{ readonly event: unknown }>,
  options?: {
    readonly timelineRange?: TimelineRange
    readonly moduleId?: string
    readonly instanceId?: string
  },
): ReadonlyArray<ConvergeTxnRow> => {
  const out: ConvergeTxnRow[] = []
  const seenTxnKey = new Set<string>()

  for (let index = 0; index < timeline.length; index++) {
    if (options?.timelineRange && (index < options.timelineRange.start || index > options.timelineRange.end)) {
      continue
    }

    const ref = readTraitConvergeRef(timeline[index]?.event)
    if (!ref) continue

    if (options?.moduleId && ref.moduleId !== options.moduleId) continue
    if (options?.instanceId && ref.instanceId !== options.instanceId) continue

    const orderKey: ConvergeOrderKey = {
      kind: 'instance',
      seq: ref.txnSeq > 0 ? ref.txnSeq : ref.eventSeq,
    }

    const row: ConvergeTxnRow = {
      moduleId: ref.moduleId,
      instanceId: ref.instanceId,
      txnId: ref.txnId,
      txnSeq: ref.txnSeq,
      eventSeq: ref.eventSeq,
      timestamp: ref.timestamp,
      orderKey,
      evidence: ref.meta,
      downgradeReason: ref.downgradeReason,
    }

    const key = makeConvergeTxnKey(row)
    if (seenTxnKey.has(key)) continue
    seenTxnKey.add(key)

    out.push(row)
  }

  out.sort((a, b) => {
    if (a.moduleId !== b.moduleId) return a.moduleId.localeCompare(b.moduleId)
    if (a.instanceId !== b.instanceId) return a.instanceId.localeCompare(b.instanceId)
    if (a.orderKey.seq !== b.orderKey.seq) return a.orderKey.seq - b.orderKey.seq
    return a.eventSeq - b.eventSeq
  })

  return out
}

export const groupConvergeLanes = (rows: ReadonlyArray<ConvergeTxnRow>): ReadonlyArray<ConvergeLane> => {
  const byLane = new Map<string, { moduleId: string; instanceId: string; rows: ConvergeTxnRow[] }>()

  for (const row of rows) {
    const laneKey = makeConvergeLaneKey({ moduleId: row.moduleId, instanceId: row.instanceId })
    const lane = byLane.get(laneKey) ?? { moduleId: row.moduleId, instanceId: row.instanceId, rows: [] }
    lane.rows.push(row)
    byLane.set(laneKey, lane)
  }

  const lanes: ConvergeLane[] = Array.from(byLane.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([laneKey, lane]) => ({
      laneKey,
      moduleId: lane.moduleId,
      instanceId: lane.instanceId,
      transactions: lane.rows.slice().sort((a, b) => {
        if (a.orderKey.seq !== b.orderKey.seq) return a.orderKey.seq - b.orderKey.seq
        return a.eventSeq - b.eventSeq
      }),
    }))

  return lanes
}

export const computeConvergeLanes = (
  timeline: ReadonlyArray<{ readonly event: unknown }>,
  options?: {
    readonly timelineRange?: TimelineRange
    readonly moduleId?: string
    readonly instanceId?: string
  },
): { readonly rows: ReadonlyArray<ConvergeTxnRow>; readonly lanes: ReadonlyArray<ConvergeLane> } => {
  const rows = extractConvergeTxnRows(timeline, options)
  return { rows, lanes: groupConvergeLanes(rows) }
}
