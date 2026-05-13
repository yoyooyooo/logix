import type { Effect } from 'effect'
import type { ObservationEnvelope } from '../../../verification/evidence.js'

export type HotLifecycleDecision = 'reset' | 'dispose'

export type HotLifecycleReason = 'hot-update' | 'dispose-without-successor' | 'test-simulated'

export type RuntimeResourceCategory =
  | 'task'
  | 'timer'
  | 'watcher'
  | 'subscription'
  | 'module-cache-entry'
  | 'imports-scope'
  | 'runtime-store-topic'
  | 'debug-sink'

export type RuntimeResourceStatus = 'active' | 'closing' | 'closed' | 'failed'

export type HostBindingCleanupCategory =
  | 'external-store-listener'
  | 'provider-layer-overlay'
  | 'host-subscription-binding'
  | 'hmr-boundary-adapter'

export interface RuntimeResourceRef {
  readonly resourceId: string
  readonly category: RuntimeResourceCategory
  readonly ownerId: string
  readonly moduleId?: string
  readonly moduleInstanceId?: string
  readonly cleanup?: () => Effect.Effect<void, never, never>
}

export interface RuntimeResourceRecord extends Omit<RuntimeResourceRef, 'cleanup'> {
  readonly status: RuntimeResourceStatus
}

export interface RuntimeResourceCategorySummary {
  readonly active: number
  readonly closing: number
  readonly closed: number
  readonly failed: number
}

export type RuntimeResourceSummary = Record<RuntimeResourceCategory, RuntimeResourceCategorySummary>

export interface HostBindingCleanupSummaryItem {
  readonly closed: number
  readonly failed: number
}

export type HostBindingCleanupSummary = Partial<Record<HostBindingCleanupCategory, HostBindingCleanupSummaryItem>>

export interface HotLifecycleCleanupResult {
  readonly cleanupId: string
  readonly status: 'closed' | 'failed'
  readonly idempotent: boolean
  readonly errors: ReadonlyArray<string>
}

export interface HotLifecycleEvidence {
  readonly type: 'runtime.hot-lifecycle'
  readonly ownerId: string
  readonly eventId: string
  readonly cleanupId: string
  readonly decision: HotLifecycleDecision
  readonly reason: HotLifecycleReason
  readonly previousRuntimeInstanceId: string
  readonly nextRuntimeInstanceId?: string
  readonly resourceSummary: RuntimeResourceSummary
  readonly hostCleanupSummary?: HostBindingCleanupSummary
  readonly cleanupStatus: 'closed' | 'failed'
  readonly idempotent: boolean
  readonly residualActiveCount: number
  readonly errors: ReadonlyArray<string>
}

export interface MakeHotLifecycleEvidenceOptions {
  readonly ownerId: string
  readonly eventSeq: number
  readonly decision: HotLifecycleDecision
  readonly reason: HotLifecycleReason
  readonly previousRuntimeInstanceId: string
  readonly nextRuntimeInstanceId?: string
  readonly cleanupId: string
  readonly resourceSummary: RuntimeResourceSummary
  readonly hostCleanupSummary?: HostBindingCleanupSummary
  readonly cleanupStatus?: 'closed' | 'failed'
  readonly idempotent?: boolean
  readonly errors?: ReadonlyArray<unknown>
}

export interface RuntimeHotLifecycleOwnerStatus {
  readonly ownerId: string
  readonly runtimeInstanceId: string
  readonly disposed: boolean
  readonly eventSeq: number
  readonly cleanupSeq: number
}

export interface RuntimeHotLifecycleTransition extends HotLifecycleEvidence {}

export interface RuntimeHotLifecycleOwner {
  readonly ownerId: string
  readonly registry: HotLifecycleResourceRegistry
  readonly reset: (args: {
    readonly nextRuntimeInstanceId: string
    readonly reason?: HotLifecycleReason
    readonly hostCleanupSummary?: HostBindingCleanupSummary
  }) => Effect.Effect<RuntimeHotLifecycleTransition, never, never>
  readonly dispose: (args?: {
    readonly reason?: HotLifecycleReason
    readonly hostCleanupSummary?: HostBindingCleanupSummary
  }) => Effect.Effect<RuntimeHotLifecycleTransition, never, never>
  readonly getStatus: () => RuntimeHotLifecycleOwnerStatus
}

export interface HotLifecycleResourceRegistry {
  readonly ownerId: string
  readonly register: (ref: RuntimeResourceRef) => RuntimeResourceRecord
  readonly unregister: (resourceId: string) => void
  readonly markClosing: (resourceId: string) => RuntimeResourceRecord | undefined
  readonly markClosed: (resourceId: string) => RuntimeResourceRecord | undefined
  readonly markFailed: (resourceId: string) => RuntimeResourceRecord | undefined
  readonly cleanupActive: () => Effect.Effect<RuntimeResourceSummary, never, never>
  readonly activeCount: () => number
  readonly records: () => ReadonlyArray<RuntimeResourceRecord>
  readonly summary: () => RuntimeResourceSummary
}

export const normalizeHotLifecycleDecision = (value: HotLifecycleDecision): HotLifecycleDecision => {
  if (value === 'reset' || value === 'dispose') return value
  throw new Error(`Unsupported hot lifecycle decision: ${String(value)}`)
}

export const HOT_LIFECYCLE_EVIDENCE_TYPE = 'runtime.hot-lifecycle'

export type HotLifecycleObservationEnvelope = ObservationEnvelope & {
  readonly type: typeof HOT_LIFECYCLE_EVIDENCE_TYPE
  readonly payload: HotLifecycleEvidence
}
