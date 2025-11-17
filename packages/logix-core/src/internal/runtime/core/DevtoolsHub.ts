import { Effect, FiberRef } from 'effect'
import type { JsonValue } from '../../observability/jsonValue.js'
import type { EvidencePackage, EvidencePackageSource } from '../../observability/evidence.js'
import { exportEvidencePackage, OBSERVABILITY_PROTOCOL_VERSION } from '../../observability/evidence.js'
import type { ConvergeStaticIrExport } from '../../state-trait/converge-ir.js'
import type { ConvergeStaticIrCollector } from './ConvergeStaticIrCollector.js'
import {
  currentDiagnosticsLevel,
  clearRuntimeDebugEventSeq,
  toRuntimeDebugEventRef,
  type Event,
  type RuntimeDebugEventRef,
  type Sink,
} from './DebugSink.js'

/**
 * DevtoolsHub：
 * - Process/page-level Debug event aggregator (global singleton).
 *
 * Note: this hub is only appended to Debug sinks when devtoolsHubLayer is explicitly enabled.
 * The Snapshot API is always available (returns empty snapshots when disabled).
 *
 * Performance:
 * - Devtools Debug events can be extremely dense in hot paths (EffectOp / Trait / StateTxn, etc.).
 * - The previous implementation copied ringBuffer and Maps per event to build an "immutable snapshot" (O(bufferSize)).
 * - The current implementation lets Snapshot reference internal Map/Array directly (read-only convention) and batches
 *   subscriber notifications in microtasks, avoiding per-event copies and reducing main-thread interference.
 */

export interface DevtoolsSnapshot {
  /**
   * SnapshotToken：
   * - Monotonic snapshot change token (a subscription-safe source of truth).
   * - Any externally visible change must advance the token.
   * - If the token does not change, externally visible snapshot fields must not change (avoid tearing / missed updates).
   */
  readonly snapshotToken: SnapshotToken
  readonly instances: ReadonlyMap<string, number>
  readonly events: ReadonlyArray<RuntimeDebugEventRef>
  readonly latestStates: ReadonlyMap<string, JsonValue>
  readonly latestTraitSummaries: ReadonlyMap<string, JsonValue>
  /**
   * exportBudget：
   * - Tracks "degrade counts" caused by export boundaries (JsonValue projection/trimming), for explainability.
   * - Counts are cumulative (may differ from the ring buffer window); clearDevtoolsEvents resets them.
   */
  readonly exportBudget: {
    readonly dropped: number
    readonly oversized: number
  }
}

export interface DevtoolsHubOptions {
  readonly bufferSize?: number
}

export type SnapshotToken = number

// ---- Global mutable state (singleton) ----

const instances = new Map<string, number>()
const latestStates = new Map<string, JsonValue>()
const latestTraitSummaries = new Map<string, JsonValue>()
const instanceLabels = new Map<string, string>()
const convergeStaticIrByDigest = new Map<string, ConvergeStaticIrExport>()
const liveInstanceKeys = new Set<string>()

const exportBudget = {
  dropped: 0,
  oversized: 0,
}

let lastRunTs = 0
let lastRunTsSeq = 0

const nextRunId = (): string => {
  const ts = Date.now()
  if (ts === lastRunTs) {
    lastRunTsSeq += 1
  } else {
    lastRunTs = ts
    lastRunTsSeq = 0
  }

  return lastRunTsSeq === 0 ? `run-${ts}` : `run-${ts}.${lastRunTsSeq}`
}

let currentRunId = nextRunId()
let nextSeq = 1

let bufferSize = 500
const ringBuffer: RuntimeDebugEventRef[] = []
const ringBufferSeq: number[] = []

let snapshotToken: SnapshotToken = 0

const ensureRingBufferSize = (): void => {
  if (bufferSize <= 0) {
    ringBuffer.length = 0
    ringBufferSeq.length = 0
    return
  }

  if (ringBuffer.length <= bufferSize) return
  const excess = ringBuffer.length - bufferSize
  ringBuffer.splice(0, excess)
  ringBufferSeq.splice(0, excess)
}

const trimRingBufferIfNeeded = (): void => {
  if (bufferSize <= 0) {
    ringBuffer.length = 0
    ringBufferSeq.length = 0
    return
  }

  // Small windows keep a strict upper bound to avoid "size=5 but events.length briefly > 5" surprises.
  // Large windows allow short bursts + batch trimming to avoid linear shift() costs under sustained load.
  if (bufferSize <= 64) {
    ensureRingBufferSize()
    return
  }

  const slack = Math.min(1024, Math.floor(bufferSize / 2))
  const threshold = bufferSize + Math.max(1, slack)
  if (ringBuffer.length <= threshold) return

  const excess = ringBuffer.length - bufferSize
  ringBuffer.splice(0, excess)
  ringBufferSeq.splice(0, excess)
}

// Snapshot references internal structures directly (read-only convention) to avoid copy costs in hot paths.
const currentSnapshot: DevtoolsSnapshot = {
  snapshotToken,
  instances,
  events: ringBuffer,
  latestStates,
  latestTraitSummaries,
  exportBudget,
}

const listeners = new Set<() => void>()

let notifyScheduled = false
const scheduleNotify = () => {
  if (notifyScheduled) return
  notifyScheduled = true
  queueMicrotask(() => {
    notifyScheduled = false
    for (const listener of listeners) {
      listener()
    }
  })
}

let devtoolsEnabled = false

const bumpSnapshotToken = (): void => {
  snapshotToken += 1
  ;(currentSnapshot as any).snapshotToken = snapshotToken
}

const markSnapshotChanged = (): void => {
  bumpSnapshotToken()
  scheduleNotify()
}

export const configureDevtoolsHub = (options?: DevtoolsHubOptions) => {
  devtoolsEnabled = true
  if (typeof options?.bufferSize === 'number' && Number.isFinite(options.bufferSize)) {
    const next = Math.floor(options.bufferSize)
    const nextBufferSize = next >= 0 ? next : 0
    if (nextBufferSize !== bufferSize) {
      bufferSize = nextBufferSize
      ensureRingBufferSize()
      markSnapshotChanged()
    }
  }
}

export const isDevtoolsEnabled = (): boolean => devtoolsEnabled

// ---- Snapshot public helpers ----

export const getDevtoolsSnapshot = (): DevtoolsSnapshot => currentSnapshot
export const getDevtoolsSnapshotToken = (): SnapshotToken => snapshotToken

export const subscribeDevtoolsSnapshot = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getDevtoolsRunId = (): string => currentRunId

export const setDevtoolsRunId = (runId: string): void => {
  if (typeof runId !== 'string' || runId.length === 0) return
  if (runId !== currentRunId) {
    currentRunId = runId
    markSnapshotChanged()
  }
}

export const startDevtoolsRun = (runId?: string): string => {
  currentRunId = typeof runId === 'string' && runId.length > 0 ? runId : nextRunId()
  nextSeq = 1
  clearRuntimeDebugEventSeq()
  clearDevtoolsEvents()
  return currentRunId
}

export const clearDevtoolsEvents = (): void => {
  ringBuffer.length = 0
  ringBufferSeq.length = 0
  exportBudget.dropped = 0
  exportBudget.oversized = 0
  markSnapshotChanged()
}

export const setInstanceLabel = (instanceId: string, label: string): void => {
  instanceLabels.set(instanceId, label)
  markSnapshotChanged()
}

export const getInstanceLabel = (instanceId: string): string | undefined => instanceLabels.get(instanceId)

const registerConvergeStaticIr = (ir: ConvergeStaticIrExport): void => {
  convergeStaticIrByDigest.set(ir.staticIrDigest, ir)
}

export const devtoolsHubConvergeStaticIrCollector: ConvergeStaticIrCollector = {
  register: registerConvergeStaticIr,
}

export const exportDevtoolsEvidencePackage = (options?: {
  readonly runId?: string
  readonly source?: EvidencePackageSource
  readonly protocolVersion?: string
}): EvidencePackage => {
  const protocolVersion = options?.protocolVersion ?? OBSERVABILITY_PROTOCOL_VERSION
  const runId = options?.runId ?? currentRunId
  const source = options?.source ?? { host: 'unknown' }

  const events = ringBuffer.map((payload, i) => ({
    protocolVersion,
    runId,
    seq: ringBufferSeq[i] ?? i + 1,
    timestamp: payload.timestamp,
    type: 'debug:event',
    payload: payload as unknown as JsonValue,
  }))

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

  // In full diagnostics: de-duplicate by staticIrDigest and export matching ConvergeStaticIR (for offline explanation/replay).
  const convergeDigests = new Set<string>()
  let sawFullConverge = false

  for (const ref of ringBuffer) {
    if (ref.kind !== 'trait:converge') continue
    const meta = ref.meta
    if (!isRecord(meta)) continue

    const digest = meta.staticIrDigest
    if (typeof digest === 'string' && digest.length > 0) {
      convergeDigests.add(digest)
    }

    const dirty = meta.dirty
    if (isRecord(dirty) && typeof dirty.rootCount === 'number') {
      sawFullConverge = true
    }
  }

  let summary: JsonValue | undefined
  if (sawFullConverge && convergeDigests.size > 0) {
    const staticIrByDigest: Record<string, JsonValue> = {}
    for (const digest of convergeDigests) {
      const ir = convergeStaticIrByDigest.get(digest)
      if (ir) {
        staticIrByDigest[digest] = ir as unknown as JsonValue
      }
    }
    if (Object.keys(staticIrByDigest).length > 0) {
      summary = { converge: { staticIrByDigest } } as unknown as JsonValue
    }
  }

  return exportEvidencePackage({
    protocolVersion,
    runId,
    source,
    events,
    summary,
  })
}

// ---- Hub Sink ----

export const devtoolsHubSink: Sink = {
  record: (event: Event) =>
    Effect.gen(function* () {
      // NOTE: the hub is a global singleton, but whether events are exportable/written to the buffer is controlled by FiberRef,
      // enabling different perf baselines/diagnostics tiers across scopes within the same process.
      const level = yield* FiberRef.get(currentDiagnosticsLevel)

      let changed = false

      // trace:instanceLabel: set a human-readable label for a runtime instance.
      if (event.type === 'trace:instanceLabel') {
        const instanceId = (event as any).instanceId as string | undefined
        const data = (event as any).data
        const label = data && typeof data === 'object' && 'label' in data ? String((data as any).label) : undefined
        if (instanceId && label) {
          instanceLabels.set(instanceId, label)
          changed = true
        }
      }

      // Instance counters: maintain active instance counts by runtimeLabel::moduleId.
      if (event.type === 'module:init' || event.type === 'module:destroy') {
        const moduleId = (event as any).moduleId ?? 'unknown'
        const runtimeLabel = (event as any).runtimeLabel ?? 'unknown'
        const instanceId = (event as any).instanceId as string | undefined
        const key = `${runtimeLabel}::${moduleId}`
        const prev = instances.get(key) ?? 0
        if (event.type === 'module:init') {
          instances.set(key, prev + 1)
          changed = true
          if (instanceId) {
            const instanceKey = `${runtimeLabel}::${moduleId}::${instanceId}`
            liveInstanceKeys.add(instanceKey)
            // If instanceId is reused, ensure derived caches do not carry leftovers from the previous lifetime.
            if (latestStates.delete(instanceKey)) changed = true
            if (latestTraitSummaries.delete(instanceKey)) changed = true
          }
        } else {
          const next = prev - 1
          if (next <= 0) {
            if (instances.delete(key)) changed = true
          } else {
            instances.set(key, next)
            changed = true
          }

          if (instanceId) {
            const instanceKey = `${runtimeLabel}::${moduleId}::${instanceId}`
            liveInstanceKeys.delete(instanceKey)
            if (latestStates.delete(instanceKey)) changed = true
            if (latestTraitSummaries.delete(instanceKey)) changed = true
            if (instanceLabels.delete(instanceId)) changed = true
            changed = true
          }
        }
      }

      let exportBudgetChanged = false
      const ref = toRuntimeDebugEventRef(event, {
        diagnosticsLevel: level,
        resolveConvergeStaticIr: (staticIrDigest) => convergeStaticIrByDigest.get(staticIrDigest),
        onMetaProjection: ({ stats }) => {
          if (stats.dropped !== 0 || stats.oversized !== 0) {
            exportBudgetChanged = true
          }
          exportBudget.dropped += stats.dropped
          exportBudget.oversized += stats.oversized
        },
      })
      if (exportBudgetChanged) {
        changed = true
      }
      if (!ref) {
        // off tier: do not write ring buffer / latestStates, but keep minimal counters/labels (including module:destroy cleanup).
        if (changed) {
          markSnapshotChanged()
        }
        return
      }

      // latestStates / latestTraitSummaries: record latest snapshots by runtimeLabel::moduleId::instanceId.
      if (ref.kind === 'state' && ref.label === 'state:update') {
        const runtimeLabel = ref.runtimeLabel ?? 'unknown'
        const key = `${runtimeLabel}::${ref.moduleId}::${ref.instanceId}`

        // Late/replayed events after module:destroy: allow entering the window for replay, but do not rebuild latest* caches.
        if (liveInstanceKeys.has(key)) {
          if (ref.meta && typeof ref.meta === 'object' && !Array.isArray(ref.meta)) {
            const anyMeta = ref.meta as any
            if ('state' in anyMeta) {
              latestStates.set(key, anyMeta.state as JsonValue)
              changed = true
            }
            if ('traitSummary' in anyMeta && anyMeta.traitSummary !== undefined) {
              latestTraitSummaries.set(key, anyMeta.traitSummary as JsonValue)
              changed = true
            }
          }
        }
      }

      // ring buffer: keep the most recent bufferSize RuntimeDebugEventRefs.
      if (bufferSize > 0) {
        const seq = nextSeq++
        ringBuffer.push(ref)
        ringBufferSeq.push(seq)
        trimRingBufferIfNeeded()
        changed = true
      }

      if (changed) {
        markSnapshotChanged()
      }
    }),
}
