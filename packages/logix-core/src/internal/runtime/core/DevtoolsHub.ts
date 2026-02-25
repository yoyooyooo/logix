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
  type DiagnosticsLevel,
  type Event,
  type RuntimeDebugEventRef,
  type Sink,
} from './DebugSink.js'
import { getGlobalHostScheduler } from './HostScheduler.js'

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
  readonly diagnosticsLevel?: DiagnosticsLevel
}

export type SnapshotToken = number

// ---- Global mutable state (singleton hub + runtime buckets) ----

const instances = new Map<string, number>()
const instanceLabels = new Map<string, string>()
const convergeStaticIrByDigest = new Map<string, ConvergeStaticIrExport>()

interface RuntimeDevtoolsBucket {
  readonly runtimeLabel: string
  readonly ringBuffer: RuntimeDebugEventRef[]
  readonly latestStates: Map<string, JsonValue>
  readonly latestTraitSummaries: Map<string, JsonValue>
  readonly exportBudget: {
    dropped: number
    oversized: number
  }
}

const runtimeBuckets = new Map<string, RuntimeDevtoolsBucket>()

const getRuntimeBucket = (runtimeLabel: string): RuntimeDevtoolsBucket | undefined => runtimeBuckets.get(runtimeLabel)

const getOrCreateRuntimeBucket = (runtimeLabel: string): RuntimeDevtoolsBucket => {
  const existing = runtimeBuckets.get(runtimeLabel)
  if (existing) return existing
  const created: RuntimeDevtoolsBucket = {
    runtimeLabel,
    ringBuffer: [],
    latestStates: new Map<string, JsonValue>(),
    latestTraitSummaries: new Map<string, JsonValue>(),
    exportBudget: {
      dropped: 0,
      oversized: 0,
    },
  }
  runtimeBuckets.set(runtimeLabel, created)
  return created
}

// Backward-compatible global aggregate views.
const latestStates = new Map<string, JsonValue>()
const latestTraitSummaries = new Map<string, JsonValue>()

interface RuntimeModuleEntry {
  readonly moduleKey: string
  readonly instanceKeyById: Map<string, string>
}

const runtimeModules = new Map<string, Map<string, RuntimeModuleEntry>>()

const normalizeKeyPart = (value: unknown): string => (value === undefined || value === null ? 'unknown' : String(value))

const getRuntimeModuleEntry = (runtimeLabel: string, moduleId: string): RuntimeModuleEntry | undefined =>
  runtimeModules.get(runtimeLabel)?.get(moduleId)

const getOrCreateRuntimeModuleEntry = (runtimeLabel: string, moduleId: string): RuntimeModuleEntry => {
  let modulesById = runtimeModules.get(runtimeLabel)
  if (!modulesById) {
    modulesById = new Map<string, RuntimeModuleEntry>()
    runtimeModules.set(runtimeLabel, modulesById)
  }

  let moduleEntry = modulesById.get(moduleId)
  if (!moduleEntry) {
    moduleEntry = {
      moduleKey: `${runtimeLabel}::${moduleId}`,
      instanceKeyById: new Map<string, string>(),
    }
    modulesById.set(moduleId, moduleEntry)
  }

  return moduleEntry
}

const cleanupRuntimeModuleEntryIfUnused = (runtimeLabel: string, moduleId: string, moduleKey: string): void => {
  const modulesById = runtimeModules.get(runtimeLabel)
  if (!modulesById) return
  const moduleEntry = modulesById.get(moduleId)
  if (!moduleEntry) return
  if (moduleEntry.instanceKeyById.size > 0) return
  if ((instances.get(moduleKey) ?? 0) > 0) return
  modulesById.delete(moduleId)
  if (modulesById.size === 0) {
    runtimeModules.delete(runtimeLabel)
  }
}

const resolveLiveInstanceKey = (runtimeLabel: string, moduleId: string, instanceId: string): string | undefined =>
  runtimeModules.get(runtimeLabel)?.get(moduleId)?.instanceKeyById.get(instanceId)

const exportBudget = {
  dropped: 0,
  oversized: 0,
}

const recalculateGlobalExportBudget = (): void => {
  let dropped = 0
  let oversized = 0
  for (const bucket of runtimeBuckets.values()) {
    dropped += bucket.exportBudget.dropped
    oversized += bucket.exportBudget.oversized
  }
  exportBudget.dropped = dropped
  exportBudget.oversized = oversized
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

let bufferSize = 500
const ringBuffer: RuntimeDebugEventRef[] = []

type RingTrimMode = 'disabled' | 'strict' | 'burst'
let ringTrimMode: RingTrimMode = 'burst'
let ringTrimThreshold = bufferSize

const RING_TRIM_POLICY_EVENT_LABEL = 'trace:devtools:ring-trim-policy' as const
const RING_TRIM_POLICY_MODULE_ID = 'devtools:hub'
const RING_TRIM_POLICY_INSTANCE_ID = 'devtools:hub'
const RING_TRIM_POLICY_RUNTIME_LABEL = 'DevtoolsHub'

const normalizeRuntimeLabel = (runtimeLabel: unknown): string => normalizeKeyPart(runtimeLabel)

const getRingTrimPolicySnapshot = () => ({
  mode: ringTrimMode,
  threshold: ringTrimThreshold,
  bufferSize,
} as const)

const refreshRingTrimPolicy = (): boolean => {
  const prevMode = ringTrimMode
  const prevThreshold = ringTrimThreshold

  if (bufferSize <= 0) {
    ringTrimMode = 'disabled'
    ringTrimThreshold = 0
    return prevMode !== ringTrimMode || prevThreshold !== ringTrimThreshold
  }

  if (bufferSize <= 64) {
    ringTrimMode = 'strict'
    ringTrimThreshold = bufferSize
    return prevMode !== ringTrimMode || prevThreshold !== ringTrimThreshold
  }

  ringTrimMode = 'burst'
  const slack = Math.min(1024, Math.floor(bufferSize / 2))
  ringTrimThreshold = bufferSize + Math.max(1, slack)
  return prevMode !== ringTrimMode || prevThreshold !== ringTrimThreshold
}

refreshRingTrimPolicy()

let snapshotToken: SnapshotToken = 0

const ensureRingBufferSize = (targetRingBuffer: RuntimeDebugEventRef[]): void => {
  if (ringTrimMode === 'disabled') {
    targetRingBuffer.length = 0
    return
  }

  if (targetRingBuffer.length <= bufferSize) return
  const excess = targetRingBuffer.length - bufferSize
  targetRingBuffer.splice(0, excess)
}

const trimRingBufferIfNeeded = (targetRingBuffer: RuntimeDebugEventRef[]): void => {
  if (ringTrimMode === 'disabled') {
    targetRingBuffer.length = 0
    return
  }

  // Small windows keep a strict upper bound to avoid "size=5 but events.length briefly > 5" surprises.
  // Large windows allow short bursts + batch trimming to avoid linear shift() costs under sustained load.
  if (ringTrimMode === 'strict') {
    ensureRingBufferSize(targetRingBuffer)
    return
  }

  if (targetRingBuffer.length <= ringTrimThreshold) return

  const excess = targetRingBuffer.length - bufferSize
  targetRingBuffer.splice(0, excess)
}

const parseDiagnosticsLevel = (value: unknown): DiagnosticsLevel =>
  value === 'off' || value === 'light' || value === 'sampled' || value === 'full' ? value : 'light'

const appendRuntimeRef = (runtimeLabel: string, ref: RuntimeDebugEventRef): void => {
  const bucket = getOrCreateRuntimeBucket(runtimeLabel)
  bucket.ringBuffer.push(ref)
  trimRingBufferIfNeeded(bucket.ringBuffer)

  ringBuffer.push(ref)
  trimRingBufferIfNeeded(ringBuffer)
}

const clearRuntimeBucketEvents = (runtimeLabel: string): boolean => {
  const bucket = getRuntimeBucket(runtimeLabel)
  if (!bucket) return false

  let changed = false
  if (bucket.ringBuffer.length > 0) {
    bucket.ringBuffer.length = 0
    changed = true
  }
  if (bucket.exportBudget.dropped !== 0 || bucket.exportBudget.oversized !== 0) {
    bucket.exportBudget.dropped = 0
    bucket.exportBudget.oversized = 0
    changed = true
  }

  if (!changed) return false

  let writeIndex = 0
  for (const event of ringBuffer) {
    if (normalizeRuntimeLabel(event.runtimeLabel) !== runtimeLabel) {
      ringBuffer[writeIndex++] = event
    }
  }
  ringBuffer.length = writeIndex
  recalculateGlobalExportBudget()
  return true
}

const clearAllRuntimeBucketEvents = (): boolean => {
  let changed = false
  for (const bucket of runtimeBuckets.values()) {
    if (bucket.ringBuffer.length > 0) {
      bucket.ringBuffer.length = 0
      changed = true
    }
    if (bucket.exportBudget.dropped !== 0 || bucket.exportBudget.oversized !== 0) {
      bucket.exportBudget.dropped = 0
      bucket.exportBudget.oversized = 0
      changed = true
    }
  }
  if (ringBuffer.length > 0) {
    ringBuffer.length = 0
    changed = true
  }
  recalculateGlobalExportBudget()
  return changed
}

const emitRingTrimPolicyEvent = (diagnosticsLevel: DiagnosticsLevel): void => {
  if (diagnosticsLevel === 'off') return
  if (bufferSize <= 0) return

  const ref = toRuntimeDebugEventRef(
    {
      type: RING_TRIM_POLICY_EVENT_LABEL,
      moduleId: RING_TRIM_POLICY_MODULE_ID,
      instanceId: RING_TRIM_POLICY_INSTANCE_ID,
      runtimeLabel: RING_TRIM_POLICY_RUNTIME_LABEL,
      data: getRingTrimPolicySnapshot(),
    } as Event,
    { diagnosticsLevel },
  )
  if (!ref) return

  appendRuntimeRef(RING_TRIM_POLICY_RUNTIME_LABEL, ref)
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
  if (listeners.size === 0) return
  if (notifyScheduled) return
  notifyScheduled = true
  getGlobalHostScheduler().scheduleMicrotask(() => {
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
      const policyChanged = refreshRingTrimPolicy()
      // Respect the caller's diagnostics setting when emitting hub policy metadata.
      // If diagnosticsLevel is omitted, keep previous behavior for snapshots but skip extra policy events.
      if (policyChanged && options?.diagnosticsLevel !== undefined) {
        emitRingTrimPolicyEvent(parseDiagnosticsLevel(options.diagnosticsLevel))
      }
      ensureRingBufferSize(ringBuffer)
      for (const bucket of runtimeBuckets.values()) {
        ensureRingBufferSize(bucket.ringBuffer)
      }
      markSnapshotChanged()
    }
  }
}

export const isDevtoolsEnabled = (): boolean => devtoolsEnabled

// ---- Snapshot public helpers ----

export const getDevtoolsSnapshot = (): DevtoolsSnapshot => currentSnapshot
export const getDevtoolsSnapshotToken = (): SnapshotToken => snapshotToken
export const getDevtoolsSnapshotByRuntimeLabel = (runtimeLabel: string): DevtoolsSnapshot => {
  const normalizedRuntimeLabel = normalizeRuntimeLabel(runtimeLabel)
  const bucket = getRuntimeBucket(normalizedRuntimeLabel)
  const runtimeInstances = new Map<string, number>()
  const runtimePrefix = `${normalizedRuntimeLabel}::`
  for (const [moduleKey, count] of instances.entries()) {
    if (moduleKey.startsWith(runtimePrefix)) {
      runtimeInstances.set(moduleKey, count)
    }
  }

  return {
    snapshotToken,
    instances: runtimeInstances,
    events: bucket?.ringBuffer ?? [],
    latestStates: bucket?.latestStates ?? new Map<string, JsonValue>(),
    latestTraitSummaries: bucket?.latestTraitSummaries ?? new Map<string, JsonValue>(),
    exportBudget: bucket?.exportBudget ?? { dropped: 0, oversized: 0 },
  }
}

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
  clearRuntimeDebugEventSeq()
  clearDevtoolsEvents()
  return currentRunId
}

export const clearDevtoolsEvents = (runtimeLabel?: string): void => {
  if (runtimeLabel !== undefined) {
    if (clearRuntimeBucketEvents(normalizeRuntimeLabel(runtimeLabel))) {
      markSnapshotChanged()
    }
    return
  }

  clearAllRuntimeBucketEvents()
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
    seq:
      typeof payload.eventSeq === 'number' && Number.isFinite(payload.eventSeq) && payload.eventSeq > 0
        ? Math.floor(payload.eventSeq)
        : i + 1,
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
      const eventRuntimeLabel = normalizeRuntimeLabel((event as any).runtimeLabel)

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
        const moduleId = normalizeKeyPart((event as any).moduleId)
        const runtimeLabel = eventRuntimeLabel
        const runtimeBucket = getOrCreateRuntimeBucket(runtimeLabel)
        const instanceId = (event as any).instanceId as string | undefined
        if (event.type === 'module:init') {
          const moduleEntry = getOrCreateRuntimeModuleEntry(runtimeLabel, moduleId)
          const moduleKey = moduleEntry.moduleKey
          const prev = instances.get(moduleKey) ?? 0
          instances.set(moduleKey, prev + 1)
          changed = true
          if (instanceId) {
            const cachedInstanceKey = moduleEntry.instanceKeyById.get(instanceId)
            const instanceKey = cachedInstanceKey ?? `${moduleKey}::${instanceId}`
            if (cachedInstanceKey === undefined) {
              moduleEntry.instanceKeyById.set(instanceId, instanceKey)
            }
            // If instanceId is reused, ensure derived caches do not carry leftovers from the previous lifetime.
            if (latestStates.delete(instanceKey)) changed = true
            if (latestTraitSummaries.delete(instanceKey)) changed = true
            if (runtimeBucket.latestStates.delete(instanceKey)) changed = true
            if (runtimeBucket.latestTraitSummaries.delete(instanceKey)) changed = true
          }
        } else {
          const moduleEntry = getRuntimeModuleEntry(runtimeLabel, moduleId)
          const moduleKey = moduleEntry?.moduleKey ?? `${runtimeLabel}::${moduleId}`
          const prev = instances.get(moduleKey) ?? 0
          const next = prev - 1
          if (next <= 0) {
            if (instances.delete(moduleKey)) changed = true
          } else {
            instances.set(moduleKey, next)
            changed = true
          }

          if (instanceId) {
            const instanceKey = moduleEntry?.instanceKeyById.get(instanceId) ?? `${moduleKey}::${instanceId}`
            moduleEntry?.instanceKeyById.delete(instanceId)
            if (latestStates.delete(instanceKey)) changed = true
            if (latestTraitSummaries.delete(instanceKey)) changed = true
            if (runtimeBucket.latestStates.delete(instanceKey)) changed = true
            if (runtimeBucket.latestTraitSummaries.delete(instanceKey)) changed = true
            if (instanceLabels.delete(instanceId)) changed = true
            changed = true
          }

          cleanupRuntimeModuleEntryIfUnused(runtimeLabel, moduleId, moduleKey)
        }
      }

      // off tier: keep only minimal counters/labels cleanup and skip heavy ref projection entirely.
      if (level === 'off') {
        if (changed) {
          markSnapshotChanged()
        }
        return
      }

      let projectedDropped = 0
      let projectedOversized = 0
      const ref = toRuntimeDebugEventRef(event, {
        diagnosticsLevel: level,
        resolveConvergeStaticIr: (staticIrDigest) => convergeStaticIrByDigest.get(staticIrDigest),
        onMetaProjection: ({ stats }) => {
          projectedDropped += stats.dropped
          projectedOversized += stats.oversized
        },
      })
      if (projectedDropped !== 0 || projectedOversized !== 0) {
        const budgetRuntimeLabel = normalizeRuntimeLabel(ref?.runtimeLabel ?? eventRuntimeLabel)
        const runtimeBucket = getOrCreateRuntimeBucket(budgetRuntimeLabel)
        runtimeBucket.exportBudget.dropped += projectedDropped
        runtimeBucket.exportBudget.oversized += projectedOversized
        exportBudget.dropped += projectedDropped
        exportBudget.oversized += projectedOversized
        changed = true
      }
      if (!ref) {
        // Unknown/non-exportable events: keep side caches/counters only.
        if (changed) {
          markSnapshotChanged()
        }
        return
      }

      const refRuntimeLabel = normalizeRuntimeLabel(ref.runtimeLabel)
      const runtimeBucket = getOrCreateRuntimeBucket(refRuntimeLabel)

      // latestStates / latestTraitSummaries: record latest snapshots by runtimeLabel::moduleId::instanceId.
      if (ref.kind === 'state' && ref.label === 'state:update') {
        const instanceKey = resolveLiveInstanceKey(refRuntimeLabel, ref.moduleId, ref.instanceId)

        // Late/replayed events after module:destroy: allow entering the window for replay, but do not rebuild latest* caches.
        if (instanceKey) {
          if (ref.meta && typeof ref.meta === 'object' && !Array.isArray(ref.meta)) {
            const anyMeta = ref.meta as any
            if ('state' in anyMeta) {
              latestStates.set(instanceKey, anyMeta.state as JsonValue)
              runtimeBucket.latestStates.set(instanceKey, anyMeta.state as JsonValue)
              changed = true
            }
            if ('traitSummary' in anyMeta && anyMeta.traitSummary !== undefined) {
              latestTraitSummaries.set(instanceKey, anyMeta.traitSummary as JsonValue)
              runtimeBucket.latestTraitSummaries.set(instanceKey, anyMeta.traitSummary as JsonValue)
              changed = true
            }
          }
        }
      }

      // ring buffer: keep the most recent bufferSize RuntimeDebugEventRefs.
      if (bufferSize > 0) {
        appendRuntimeRef(refRuntimeLabel, ref)
        changed = true
      }

      if (changed) {
        markSnapshotChanged()
      }
    }),
}
