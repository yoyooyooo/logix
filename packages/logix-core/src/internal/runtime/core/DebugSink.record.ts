import { Cause, Effect, Layer, Logger, Option, ServiceMap } from 'effect'
import {
  projectJsonValue,
  type DowngradeReason as JsonDowngradeReason,
  type JsonValue,
  type JsonValueProjectionStats,
} from '../../observability/jsonValue.js'
import type * as ReplayLog from './ReplayLog.js'
import {
  toSerializableErrorSummary,
  type DowngradeReason as ErrorDowngradeReason,
  type SerializableErrorSummary,
} from './errorSummary.js'
import * as EffectOpCore from './EffectOpCore.js'
import type * as ProcessProtocol from './process/protocol.js'

export interface TriggerRef {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

type TraceEventType = `trace:${string}`
type GenericTraceEventType = Exclude<
  TraceEventType,
  'trace:trait:converge' | 'trace:trait:check' | 'trace:trait:validate'
>

/**
 * ReplayEventRef：
 * - Replay event structure referenced from Debug events.
 * - Based on ReplayLog.Event, enriched with txn/trigger association fields for Devtools aggregation and explanation.
 */
export type ReplayEventRef = ReplayLog.ReplayLogEvent & {
  readonly txnId?: string
  readonly trigger?: TriggerRef
}

export type Event =
  | {
      readonly type: 'module:init'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'module:destroy'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'lifecycle:phase'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly phase: 'init' | 'run' | 'destroy' | 'platform'
      readonly name: string
      readonly payload?: unknown
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'action:dispatch'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly action: unknown
      readonly actionTag?: string
      readonly unknownAction?: boolean
      readonly txnSeq?: number
      readonly txnId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'state:update'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly state: unknown
      readonly txnSeq?: number
      readonly txnId?: string
      /**
       * Optional: Static IR digest aligned with FieldPathId/StepId (for consumer-side reverse-mapping & alignment).
       * - When missing or mismatched, consumers must not attempt to reverse-map rootIds -> rootPaths (avoid wrong UI).
       * - Allowed to be omitted on near-zero-cost diagnostics=off paths.
       */
      readonly staticIrDigest?: string
      /**
       * Optional: the affected scope aggregated by this commit (field-level dirty-set).
       * - Populated by Runtime at commit time;
       * - Must stay slim and serializable;
       * - Devtools can use it to explain "why converge/validate ran / why it degraded to full".
       */
      readonly dirtySet?: unknown
      /**
       * Optional: patch count aggregated by this commit (from StateTransaction).
       * - Populated by Runtime only on transaction paths.
       * - Devtools can use it as a lightweight transaction summary metric.
       */
      readonly patchCount?: number
      /**
       * Optional: whether patch records were truncated (bounded) under full instrumentation.
       */
      readonly patchesTruncated?: boolean
      /**
       * Optional: truncation reason code (stable enum).
       */
      readonly patchesTruncatedReason?: 'max_patches'
      /**
       * Optional: commit mode (normal/batched/low-priority, etc).
       * - Populated by Runtime;
       * - Default is chosen by the caller (typically "normal").
       */
      readonly commitMode?: string
      /**
       * Optional: external visibility priority (normal/low).
       * - Populated by Runtime.
       * - Mainly used by React external subscription scheduling (avoid unnecessary renders).
       */
      readonly priority?: string
      /**
       * Optional: transaction origin kind (origin.kind) that triggered this state commit:
       * - e.g. "action" / "source-refresh" / "service-callback" / "devtools".
       * - Populated by Runtime only on StateTransaction-based paths.
       * - Devtools can distinguish app transactions vs devtools time-travel operations.
       */
      readonly originKind?: string
      /**
       * Optional: transaction origin name (origin.name) that triggered this state commit:
       * - e.g. action dispatch / fieldPath / task:success/task:failure, etc.
       * - Populated by Runtime only on StateTransaction-based paths.
       */
      readonly originName?: string
      /**
       * Reserved: Trait converge summary (for Devtools window-level stats / TopN costs / degrade reasons, etc.).
       * - Phase 2: field slot only; structure is not fixed.
       * - Later phases will align with the Trait/Replay event model into an explainable structure.
       */
      readonly traitSummary?: unknown
      /**
       * Reserved: replay event associated with this transaction (re-emit source of truth from ReplayLog).
       * - Phase 2: field slot only.
       * - Later phases will align with ReplayLog.Event structure.
       */
      readonly replayEvent?: ReplayEventRef
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type:
        | 'process:start'
        | 'process:stop'
        | 'process:restart'
        | 'process:trigger'
        | 'process:dispatch'
        | 'process:error'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly identity: ProcessProtocol.ProcessInstanceIdentity
      readonly severity: 'info' | 'warning' | 'error'
      readonly eventSeq: number
      readonly timestampMs: number
      readonly trigger?: ProcessProtocol.ProcessTrigger
      readonly dispatch?: {
        readonly moduleId: string
        readonly instanceId: string
        readonly actionId: string
      }
      readonly error?: ProcessProtocol.SerializableErrorSummary
      readonly budgetEnvelope?: ProcessProtocol.ProcessEvent['budgetEnvelope']
      readonly degrade?: ProcessProtocol.ProcessEvent['degrade']
      readonly txnSeq?: number
      readonly txnId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'lifecycle:error'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly cause: unknown
      readonly phase?: 'init' | 'run' | 'destroy' | 'platform'
      readonly hook?: 'initRequired' | 'start' | 'destroy' | 'suspend' | 'resume' | 'reset' | 'unknown'
      readonly taskId?: string
      readonly opSeq?: number
      readonly origin?: string
      readonly txnSeq?: number
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'diagnostic'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly code: string
      readonly severity: 'error' | 'warning' | 'info'
      readonly message: string
      readonly hint?: string
      readonly actionTag?: string
      readonly kind?: string
      readonly txnSeq?: number
      readonly txnId?: string
      readonly opSeq?: number
      readonly trigger?: TriggerRef
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'warn:priority-inversion'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly tickSeq: number
      readonly reason: 'deferredBacklog' | 'subscribedNonUrgent'
      readonly selectorId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'warn:microtask-starvation'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly tickSeq: number
      readonly microtaskChainDepth?: number
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  /**
   * trace:* events:
   * - Extension hook for runtime tracing / Playground / Alignment Lab.
   * - Only the type prefix and moduleId are standardized; payload shape is defined by higher layers (e.g. spanId/attributes in data).
   */
  | {
      readonly type: 'trace:trait:converge'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly data: JsonValue
      readonly txnSeq?: number
      readonly txnId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'trace:trait:check'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly data: JsonValue
      readonly txnSeq?: number
      readonly txnId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: 'trace:trait:validate'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly data: JsonValue
      readonly txnSeq?: number
      readonly txnId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: GenericTraceEventType
      readonly moduleId?: string
      readonly instanceId?: string
      readonly data?: unknown
      readonly txnSeq?: number
      readonly txnId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }

export interface Sink {
  readonly record: (event: Event) => Effect.Effect<void>
}
export const currentDebugSinks = ServiceMap.Reference<ReadonlyArray<Sink>>('@logixjs/core/Debug.currentDebugSinks', {
  defaultValue: () => [],
})
export const currentRuntimeLabel = ServiceMap.Reference<string | undefined>('@logixjs/core/Debug.currentRuntimeLabel', {
  defaultValue: () => undefined,
})
export const currentTxnId = ServiceMap.Reference<string | undefined>('@logixjs/core/Debug.currentTxnId', {
  defaultValue: () => undefined,
})
export const currentOpSeq = ServiceMap.Reference<number | undefined>('@logixjs/core/Debug.currentOpSeq', {
  defaultValue: () => undefined,
})
export type DiagnosticsLevel = 'off' | 'light' | 'sampled' | 'full'
export const currentDiagnosticsLevel = ServiceMap.Reference<DiagnosticsLevel>('@logixjs/core/Debug.currentDiagnosticsLevel', {
  defaultValue: () => 'off',
})

export const diagnosticsLevel = (level: DiagnosticsLevel): Layer.Layer<any, never, never> =>
  Layer.succeed(currentDiagnosticsLevel, level) as Layer.Layer<any, never, never>

export type DiagnosticsMaterialization = 'eager' | 'lazy'
export const currentDiagnosticsMaterialization = ServiceMap.Reference<DiagnosticsMaterialization>(
  '@logixjs/core/Debug.currentDiagnosticsMaterialization',
  {
    defaultValue: () => 'eager',
  },
)

export const diagnosticsMaterialization = (mode: DiagnosticsMaterialization): Layer.Layer<any, never, never> =>
  Layer.succeed(currentDiagnosticsMaterialization, mode) as Layer.Layer<any, never, never>

export type TraceMode = 'off' | 'on'
export const currentTraceMode = ServiceMap.Reference<TraceMode>('@logixjs/core/Debug.currentTraceMode', {
  defaultValue: () => 'on',
})

export const traceMode = (mode: TraceMode): Layer.Layer<any, never, never> =>
  Layer.succeed(currentTraceMode, mode) as Layer.Layer<any, never, never>

export interface TraitConvergeDiagnosticsSamplingConfig {
  /**
   * Sample once every N txns (deterministic, based on stable txnSeq).
   * - 1: sample every txn (timing granularity similar to full, while keeping payload slim)
   */
  readonly sampleEveryN: number
  /**
   * Max number of TopK hotspots to output (recommended ≤ 3).
   */
  readonly topK: number
}

export const currentTraitConvergeDiagnosticsSampling = ServiceMap.Reference<TraitConvergeDiagnosticsSamplingConfig>(
  '@logixjs/core/Debug.currentTraitConvergeDiagnosticsSampling',
  {
    defaultValue: () => ({
      sampleEveryN: 32,
      topK: 3,
    }),
  },
)

export const traitConvergeDiagnosticsSampling = (
  config: TraitConvergeDiagnosticsSamplingConfig,
): Layer.Layer<any, never, never> =>
  Layer.succeed(currentTraitConvergeDiagnosticsSampling, config) as Layer.Layer<any, never, never>

export const appendSinks = (sinks: ReadonlyArray<Sink>): Layer.Layer<any, never, never> =>
  Layer.effect(
    currentDebugSinks,
    Effect.gen(function* () {
      const current = yield* Effect.service(currentDebugSinks)
      return [...current, ...sinks]
    }),
  ) as Layer.Layer<any, never, never>

export type RuntimeDebugEventKind =
  | 'action'
  | 'state'
  | 'service'
  | 'process'
  | 'trait-computed'
  | 'trait-link'
  | 'trait-source'
  | 'lifecycle'
  | 'react-render'
  | 'devtools'
  | 'diagnostic'
  | (string & {})

export interface RuntimeDebugEventRef {
  readonly eventId: string
  readonly eventSeq: number
  readonly moduleId: string
  readonly instanceId: string
  readonly runtimeLabel?: string
  readonly txnSeq: number
  readonly txnId?: string
  /**
   * linkId：
   * - Current operation chain id (shared by boundary ops in the same chain).
   * - Created by Runtime at the boundary root and propagated via FiberRef across nested/cross-module chains.
   */
  readonly linkId?: string
  readonly timestamp: number
  readonly kind: RuntimeDebugEventKind
  readonly label: string
  readonly meta?: JsonValue
  readonly errorSummary?: SerializableErrorSummary
  readonly downgrade?: {
    readonly reason?: 'non_serializable' | 'oversized' | 'budget_exceeded' | 'unknown'
  }
}

export type TxnLaneEvidenceReason =
  | 'disabled'
  | 'forced_off'
  | 'forced_sync'
  | 'queued_non_urgent'
  | 'preempted_by_urgent'
  | 'budget_yield'
  | 'coalesced'
  | 'canceled'
  | 'max_lag_forced'
  | 'starvation_protection'

export type TxnLaneNonUrgentYieldReason = 'none' | 'input_pending' | 'budget_exceeded' | 'forced_frame_yield'

export type TxnLaneEvidence = {
  readonly anchor: {
    readonly moduleId: string
    readonly instanceId: string
    readonly txnSeq: number
    readonly opSeq?: number
  }
  readonly lane: 'urgent' | 'nonUrgent'
  readonly kind: string
  readonly policy: {
    readonly enabled: boolean
    readonly overrideMode?: 'forced_off' | 'forced_sync'
    readonly configScope: 'provider' | 'runtime_module' | 'runtime_default' | 'builtin'
    readonly budgetMs: number
    readonly debounceMs: number
    readonly maxLagMs: number
    readonly allowCoalesce: boolean
    readonly yieldStrategy?: 'baseline' | 'inputPending'
    readonly queueMode?: 'fifo' | 'lanes'
  }
  readonly backlog: {
    readonly pendingCount: number
    readonly ageMs?: number
    readonly coalescedCount?: number
    readonly canceledCount?: number
  }
  readonly budget?: {
    readonly budgetMs?: number
    readonly sliceDurationMs?: number
    readonly yieldCount?: number
    readonly yielded?: boolean
    readonly yieldReason?: TxnLaneNonUrgentYieldReason
  }
  readonly starvation?: {
    readonly triggered?: boolean
    readonly reason?: string
  }
  readonly reasons: ReadonlyArray<TxnLaneEvidenceReason>
}

let nextGlobalEventSeq = 0

export const clearRuntimeDebugEventSeq = (): void => {
  nextGlobalEventSeq = 0
}

const nextEventSeq = (): number => {
  nextGlobalEventSeq += 1
  return nextGlobalEventSeq
}

const makeEventId = (instanceId: string, eventSeq: number): string => `${instanceId}::e${eventSeq}`

type DowngradeReason = JsonDowngradeReason | ErrorDowngradeReason | 'budget_exceeded'

const mergeDowngrade = (
  current: DowngradeReason | undefined,
  next: DowngradeReason | undefined,
): DowngradeReason | undefined => {
  if (!current) return next
  if (!next) return current
  if (current === 'non_serializable' || next === 'non_serializable') return 'non_serializable'
  if (current === 'oversized' || next === 'oversized') return 'oversized'
  if (current === 'budget_exceeded' || next === 'budget_exceeded') return 'budget_exceeded'
  return 'unknown'
}

const stripDirtyRootPaths = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const { rootPaths, ...rest } = value as Record<string, unknown> & { readonly rootPaths?: unknown }
  return rest
}

const stripTraitConvergeLegacyFields = (value: JsonValue): JsonValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const anyValue = value as any
  const { dirtyRoots, ...rest } = anyValue
  const dirty = (rest as any).dirty
  if (!dirty || typeof dirty !== 'object' || Array.isArray(dirty)) {
    return rest as JsonValue
  }

  return {
    ...rest,
    dirty: stripDirtyRootPaths(dirty),
  } as JsonValue
}

const stripTraitConvergeLight = (value: JsonValue): JsonValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const anyValue = value as any
  const dirty = anyValue.dirty
  const dirtySlim =
    dirty && typeof dirty === 'object' && !Array.isArray(dirty)
      ? {
          dirtyAll: (dirty as any).dirtyAll,
          ...(typeof (dirty as any).reason === 'string' ? { reason: (dirty as any).reason } : null),
          ...(Array.isArray((dirty as any).rootIds) ? { rootIds: (dirty as any).rootIds } : null),
          ...(typeof (dirty as any).rootIdsTruncated === 'boolean'
            ? { rootIdsTruncated: (dirty as any).rootIdsTruncated }
            : null),
        }
      : undefined

  const { top3, dirtyRoots, ...rest } = anyValue
  return (dirtySlim ? { ...rest, dirty: dirtySlim } : rest) as JsonValue
}

const stripTraitConvergeSampled = (value: JsonValue): JsonValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const anyValue = value as any
  const dirty = anyValue.dirty
  const dirtySlim =
    dirty && typeof dirty === 'object' && !Array.isArray(dirty)
      ? {
          dirtyAll: (dirty as any).dirtyAll,
          ...(typeof (dirty as any).reason === 'string' ? { reason: (dirty as any).reason } : null),
        }
      : undefined

  const { dirtyRoots, ...rest } = anyValue
  return (dirtySlim ? { ...rest, dirty: dirtySlim } : rest) as JsonValue
}

const stripTraitCheckLight = (value: JsonValue): JsonValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const anyValue = value as any
  const degraded = anyValue.degraded
  const degradedSlim =
    degraded && typeof degraded === 'object' && !Array.isArray(degraded) ? { kind: (degraded as any).kind } : undefined
  const summary = anyValue.summary
  let summarySlim: Record<string, number> | undefined
  if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
    const candidate: Record<string, number> = {}
    let hasSummaryField = false
    if (typeof (summary as any).scannedRows === 'number') {
      candidate.scannedRows = (summary as any).scannedRows
      hasSummaryField = true
    }
    if (typeof (summary as any).affectedRows === 'number') {
      candidate.affectedRows = (summary as any).affectedRows
      hasSummaryField = true
    }
    if (typeof (summary as any).changedRows === 'number') {
      candidate.changedRows = (summary as any).changedRows
      hasSummaryField = true
    }
    if (hasSummaryField) {
      summarySlim = candidate
    }
  }

  const slim: Record<string, unknown> = {}
  if (typeof anyValue.ruleId === 'string') slim.ruleId = anyValue.ruleId
  if (Array.isArray(anyValue.scopeFieldPath)) slim.scopeFieldPath = anyValue.scopeFieldPath
  if (typeof anyValue.mode === 'string') slim.mode = anyValue.mode
  if (anyValue.trigger && typeof anyValue.trigger === 'object' && !Array.isArray(anyValue.trigger)) {
    slim.trigger = anyValue.trigger
  }
  if (typeof anyValue.rowIdMode === 'string') slim.rowIdMode = anyValue.rowIdMode
  if (summarySlim) slim.summary = summarySlim
  if (degradedSlim) slim.degraded = degradedSlim

  return slim as JsonValue
}

// In browsers, to reduce duplicated noise caused by React StrictMode, etc.,
// de-duplicate lifecycle:error and diagnostic events: print the same moduleId+payload only once.
const browserLifecycleSeen = new Set<string>()
const browserDiagnosticSeen = new Set<string>()

// Align trace:react-render events with the most recent state:update txn (UI-only association).
const lastTxnByInstance = new Map<string, { readonly txnId: string; readonly txnSeq: number }>()

// trace:react-render / trace:react-selector may enter the sink before state:update (reordering due to concurrency/scheduling).
// To provide usable txn anchors in Devtools/UI, we allow a one-time backfill for refs missing txn fields.
const pendingTxnAlignmentByInstance = new Map<string, Array<RuntimeDebugEventRef>>()

const enqueuePendingTxnAlignment = (instanceId: string, ref: RuntimeDebugEventRef): void => {
  const list = pendingTxnAlignmentByInstance.get(instanceId)
  if (!list) {
    pendingTxnAlignmentByInstance.set(instanceId, [ref])
    return
  }
  list.push(ref)
  if (list.length > 64) {
    list.shift()
  }
}

const backfillPendingTxnAlignment = (
  instanceId: string,
  txn: { readonly txnId: string; readonly txnSeq: number },
): void => {
  const pending = pendingTxnAlignmentByInstance.get(instanceId)
  if (!pending || pending.length === 0) {
    pendingTxnAlignmentByInstance.delete(instanceId)
    return
  }

  for (const ref of pending) {
    const anyRef: any = ref as any
    if (anyRef.txnId == null) {
      anyRef.txnId = txn.txnId
    }
    if (typeof anyRef.txnSeq !== 'number' || anyRef.txnSeq <= 0) {
      anyRef.txnSeq = txn.txnSeq
    }
  }

  pendingTxnAlignmentByInstance.delete(instanceId)
}

const lifecycleErrorLog = (event: Extract<Event, { readonly type: 'lifecycle:error' }>) => {
  const moduleId = event.moduleId ?? 'unknown'
  const causePretty = (() => {
    try {
        return Cause.pretty(event.cause as Cause.Cause<unknown>)
    } catch {
      try {
        return JSON.stringify(event.cause, null, 2)
      } catch {
        return String(event.cause)
      }
    }
  })()

  const message = `[Logix][module=${moduleId}] lifecycle:error\n${causePretty}`

  return Effect.logError(message).pipe(
    Effect.annotateLogs({
      'logix.moduleId': moduleId,
      'logix.event': 'lifecycle:error',
      'logix.cause': causePretty,
    }),
  )
}

const diagnosticLog = (event: Extract<Event, { readonly type: 'diagnostic' }>) => {
  const moduleId = event.moduleId ?? 'unknown'
  const header = `[Logix][module=${moduleId}] diagnostic(${event.severity})`
  const detail = `code=${event.code} message=${event.message}${
    event.actionTag ? ` action=${event.actionTag}` : ''
  }${event.hint ? `\nhint: ${event.hint}` : ''}`
  const msg = `${header}\n${detail}`

  const base =
    event.severity === 'warning'
      ? Effect.logWarning(msg)
      : event.severity === 'info'
        ? Effect.logInfo(msg)
        : Effect.logError(msg)

  const annotations: Record<string, unknown> = {
    'logix.moduleId': moduleId,
    'logix.event': `diagnostic(${event.severity})`,
    'logix.diagnostic.code': event.code,
    'logix.diagnostic.message': event.message,
  }
  if (event.hint) {
    annotations['logix.diagnostic.hint'] = event.hint
  }
  if (event.actionTag) {
    annotations['logix.diagnostic.actionTag'] = event.actionTag
  }

  return base.pipe(Effect.annotateLogs(annotations))
}

/**
 * Default Layer composition based on FiberRef.currentDebugSinks:
 * - Uses Layer.locallyScoped to inject Debug sinks via FiberRef state.
 * - Avoids misusing FiberRef as a Context.Tag.
 */
export const noopLayer = Layer.succeed(currentDebugSinks, [])

/**
 * errorOnlyLayer：
 * - Default DebugSink implementation that only cares about lifecycle:error events.
 * - Suitable as a "minimum observability" layer so fatal errors don't silently disappear.
 * - Other events (module:init/destroy, action:dispatch, state:update) are not recorded by default.
 */
const errorOnlySink: Sink = {
  record: (event: Event) =>
    event.type === 'lifecycle:error'
      ? lifecycleErrorLog(event)
      : event.type === 'diagnostic' && event.severity !== 'info'
        ? diagnosticLog(event)
        : Effect.void,
}

export const errorOnlyLayer = Layer.succeed(currentDebugSinks, [errorOnlySink])

export const isErrorOnlyOnlySinks = (sinks: ReadonlyArray<Sink>): boolean => sinks.length === 1 && sinks[0] === errorOnlySink

/**
 * consoleLayer：
 * - Full debug layer that logs all Debug events via Effect logs (logfmt / structured).
 * - Suitable as an observability layer for general environments (Node / tests).
 */
const consoleSink: Sink = {
  record: (event: Event) =>
    event.type === 'lifecycle:error'
      ? lifecycleErrorLog(event)
      : event.type === 'diagnostic'
        ? diagnosticLog(event)
        : Effect.logDebug({ debugEvent: event }),
}

export const consoleLayer = Layer.succeed(currentDebugSinks, [consoleSink])

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

// Shared browser console rendering logic used by the default DebugSink and browserConsoleLayer.
const renderBrowserConsoleEvent = (event: Event): Effect.Effect<void> => {
  // trace:* events: shown as separate groups in browsers for Playground / DevTools observation.
  if (typeof (event as any).type === 'string' && (event as any).type.startsWith('trace:')) {
    const moduleId = (event as any).moduleId ?? 'unknown'
    const type = (event as any).type

    return Effect.sync(() => {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        '%c[Logix]%c trace %c' + moduleId + '%c ' + String(type),
        'color:#6b7280;font-weight:bold', // tag
        'color:#3b82f6', // label
        'color:#9ca3af', // module id
        'color:#6b7280', // type
      )
      // eslint-disable-next-line no-console
      console.log(event)
      // eslint-disable-next-line no-console
      console.groupEnd()
    })
  }

  if (event.type === 'lifecycle:error') {
    const moduleId = event.moduleId ?? 'unknown'
    const causePretty = (() => {
      try {
        return Cause.pretty(event.cause as Cause.Cause<unknown>)
      } catch {
        try {
          return JSON.stringify(event.cause, null, 2)
        } catch {
          return String(event.cause)
        }
      }
    })()

    const key = `${moduleId}|${causePretty}`
    if (browserLifecycleSeen.has(key)) {
      return Effect.void
    }
    browserLifecycleSeen.add(key)

    return Effect.sync(() => {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        '%c[Logix]%c lifecycle:error %c' + moduleId,
        'color:#ef4444;font-weight:bold', // tag
        'color:#ef4444', // label
        'color:#9ca3af', // module id
      )
      // eslint-disable-next-line no-console
      console.error(causePretty)
      // eslint-disable-next-line no-console
      console.groupEnd()
    })
  }

  if (event.type === 'diagnostic') {
    const moduleId = event.moduleId ?? 'unknown'
    const detail = `code=${event.code} message=${event.message}${
      event.actionTag ? ` action=${event.actionTag}` : ''
    }${event.hint ? `\nhint: ${event.hint}` : ''}`

    const color =
      event.severity === 'warning' ? 'color:#d97706' : event.severity === 'info' ? 'color:#3b82f6' : 'color:#ef4444'

    const label =
      event.severity === 'warning'
        ? 'diagnostic(warning)'
        : event.severity === 'info'
          ? 'diagnostic(info)'
          : 'diagnostic(error)'

    const key = `${moduleId}|${event.code}|${event.message}`
    if (browserDiagnosticSeen.has(key)) {
      return Effect.void
    }
    browserDiagnosticSeen.add(key)

    return Effect.sync(() => {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        '%c[Logix]%c ' + label + '%c module=' + moduleId,
        'color:#6b7280;font-weight:bold',
        color,
        'color:#9ca3af',
      )
      if (event.severity === 'warning') {
        // eslint-disable-next-line no-console
        console.warn(detail)
      } else if (event.severity === 'info') {
        // eslint-disable-next-line no-console
        console.info(detail)
      } else {
        // eslint-disable-next-line no-console
        console.error(detail)
      }
      // eslint-disable-next-line no-console
      console.groupEnd()
    })
  }

  // Other events are not printed to the browser console by default to avoid being too noisy during development.
  // For internal debug events, use a custom Debug sink or use consoleLayer in Node.
  return Effect.void
}

/**
 * Browser console debug layer:
 * - In browsers, uses console.groupCollapsed + colored labels to simulate pretty logger grouping.
 * - In non-browser environments, falls back to consoleLayer's Effect logging implementation.
 */
const browserConsoleSink: Sink = {
  record: (event: Event) => {
    if (!isBrowser) {
      // Non-browser: fall back to consoleLayer behavior (Effect.log*).
      return event.type === 'lifecycle:error'
        ? lifecycleErrorLog(event)
        : event.type === 'diagnostic'
          ? diagnosticLog(event)
          : Effect.logDebug({ debugEvent: event })
    }

    return renderBrowserConsoleEvent(event)
  },
}

export const browserConsoleLayer = Layer.succeed(currentDebugSinks, [browserConsoleSink])

/**
 * Browser diagnostic-only debug layer:
 * - In browsers, prints only lifecycle:error + diagnostic(warning/error) via console.groupCollapsed.
 * - Drops trace:* and other high-frequency events from the browser console (use DevtoolsHub instead).
 * - In non-browser environments, behaves like errorOnlySink (Effect.log*).
 */
const browserDiagnosticConsoleSink: Sink = {
  record: (event: Event) => {
    if (!isBrowser) {
      return event.type === 'lifecycle:error'
        ? lifecycleErrorLog(event)
        : event.type === 'diagnostic' && event.severity !== 'info'
          ? diagnosticLog(event)
          : Effect.void
    }

    return event.type === 'lifecycle:error' || (event.type === 'diagnostic' && event.severity !== 'info')
      ? renderBrowserConsoleEvent(event)
      : Effect.void
  },
}

export const browserDiagnosticConsoleLayer = Layer.succeed(currentDebugSinks, [browserDiagnosticConsoleSink])

/**
 * Browser-friendly Logger layer: replaces the default logger with Effect's pretty logger (browser mode).
 * - Avoids hand-written console styles; reuses Effect's colored/grouped formatting.
 * - Safely degrades to the default logger in server environments.
 */
export const browserPrettyLoggerLayer = Layer.effect(
  Logger.CurrentLoggers,
  Effect.gen(function* () {
    const current = yield* Effect.service(Logger.CurrentLoggers)
    return new Set(
      [...current].filter((logger) => logger !== Logger.defaultLogger).concat(Logger.consolePretty({ mode: 'browser', colors: true })),
    )
  }),
)

/**
 * defaultLayer：
 * - Public default layer; currently equivalent to errorOnlyLayer.
 * - Records lifecycle:error only, avoiding a large volume of action/state logs by default.
 */
export const defaultLayer = errorOnlyLayer

export const record = (event: Event) =>
  Effect.gen(function* () {
    const sinks = yield* Effect.service(currentDebugSinks)

    // Fast path: production default installs errorOnlyLayer (sinks=1).
    // Avoid paying diagnostics FiberRef + enrichment costs for high-frequency events that are always dropped by errorOnly.
    if (isErrorOnlyOnlySinks(sinks)) {
      if (event.type === 'lifecycle:error') {
        yield* lifecycleErrorLog(event)
        return
      }
      if (event.type === 'diagnostic' && event.severity !== 'info') {
        yield* diagnosticLog(event)
      }
      return
    }

    // Fast path: when no sinks are installed, only a small subset of events are ever surfaced.
    // Avoid paying per-event FiberRef + enrichment costs for high-frequency events like state:update.
    if (sinks.length === 0) {
      if (isBrowser) {
        if (event.type === 'lifecycle:error' || event.type === 'diagnostic') {
          yield* renderBrowserConsoleEvent(event)
        }
        return
      }

      if (event.type === 'lifecycle:error') {
        yield* lifecycleErrorLog(event)
        return
      }
      if (event.type === 'diagnostic') {
        yield* diagnosticLog(event)
      }
      return
    }

    // Trace events are performance-sensitive and should be explicitly enabled.
    // Keep the check scoped to trace:* only so non-trace events stay on the fast path.
    if (typeof event.type === 'string' && event.type.startsWith('trace:')) {
      const mode = yield* Effect.service(currentTraceMode)
      if (mode === 'off') return
    }

    const enriched = event as Event

    const diagnosticsLevel = yield* Effect.service(currentDiagnosticsLevel)

    // Enrich Debug.Event with basic fields (enabled only when diagnosticsLevel!=off):
    // - timestamp: for Devtools/Timeline/Overview time aggregation; avoids UI-side "first observed time" distortion.
    // - runtimeLabel: from FiberRef for grouping by runtime (injected only when not already provided by the event).
    let now: number | undefined
    const getNow = (): number => {
      if (now === undefined) now = Date.now()
      return now
    }

    // diagnostics=off: keep near-zero cost; do not add timestamp for high-frequency events (avoid extra Date.now()).
    // Low-frequency events (lifecycle:error/diagnostic) may still get timestamp for easier debugging.
    if (
      enriched.timestamp === undefined &&
      (diagnosticsLevel !== 'off' || enriched.type === 'lifecycle:error' || enriched.type === 'diagnostic')
    ) {
      ;(enriched as any).timestamp = getNow()
    }
    if (diagnosticsLevel !== 'off' && enriched.runtimeLabel === undefined) {
      const runtimeLabel = yield* Effect.service(currentRuntimeLabel)
      if (runtimeLabel) {
        ;(enriched as any).runtimeLabel = runtimeLabel
      }
    }

    if (enriched.type === 'diagnostic' && (enriched as any).txnId === undefined) {
      const txnId = yield* Effect.service(currentTxnId)
      if (txnId) {
        ;(enriched as any).txnId = txnId
      }
    }

    if (
      diagnosticsLevel !== 'off' &&
      (enriched as any).type === 'trace:effectop' &&
      (enriched as any).linkId === undefined
    ) {
      const maybeLinkId = yield* Effect.serviceOption(EffectOpCore.currentLinkId)
      if (Option.isSome(maybeLinkId) && maybeLinkId.value) {
        ;(enriched as any).linkId = maybeLinkId.value
      }
    }

    if (sinks.length === 1) {
      yield* sinks[0]!.record(enriched)
      return
    }

    yield* Effect.forEach(sinks as ReadonlyArray<Sink>, (sink) => sink.record(enriched), { discard: true })
  })

/**
 * Normalizes internal Debug.Event into RuntimeDebugEventRef:
 * - Allows Devtools / Runtime to consume Debug events uniformly.
 * - Does not change DebugSink behavior; provides a structured view only.
 */
export const toRuntimeDebugEventRef = (
  event: Event,
  options?: {
    readonly diagnosticsLevel?: DiagnosticsLevel
    readonly materialization?: DiagnosticsMaterialization
    readonly eventSeq?: number
    readonly onMetaProjection?: (projection: {
      readonly stats: JsonValueProjectionStats
      readonly downgrade?: JsonDowngradeReason
    }) => void
  },
): RuntimeDebugEventRef | undefined => {
  const diagnosticsLevel = options?.diagnosticsLevel ?? 'full'
  if (diagnosticsLevel === 'off') {
    return undefined
  }

  const isLightLike = diagnosticsLevel === 'light' || diagnosticsLevel === 'sampled'
  const materialization = options?.materialization ?? 'eager'
  const isLazyMaterialization = materialization === 'lazy'

  const timestamp =
    typeof event.timestamp === 'number' && Number.isFinite(event.timestamp) ? event.timestamp : Date.now()

  const moduleIdRaw = (event as any).moduleId
  const moduleId = typeof moduleIdRaw === 'string' && moduleIdRaw.length > 0 ? moduleIdRaw : 'unknown'

  const instanceIdRaw = (event as any).instanceId
  const instanceId = typeof instanceIdRaw === 'string' && instanceIdRaw.length > 0 ? instanceIdRaw : 'unknown'

  const runtimeLabelRaw = (event as any).runtimeLabel
  const runtimeLabel = typeof runtimeLabelRaw === 'string' && runtimeLabelRaw.length > 0 ? runtimeLabelRaw : undefined

  const txnSeqRaw = (event as any).txnSeq
  const txnSeq =
    typeof txnSeqRaw === 'number' && Number.isFinite(txnSeqRaw) && txnSeqRaw >= 0 ? Math.floor(txnSeqRaw) : 0

  const txnIdRaw = (event as any).txnId
  const txnId =
    typeof txnIdRaw === 'string' && txnIdRaw.length > 0
      ? txnIdRaw
      : txnSeq > 0
        ? `${instanceId}::t${txnSeq}`
        : undefined

  const linkId = (() => {
    const linkIdRaw = (event as any).linkId
    if (typeof linkIdRaw === 'string' && linkIdRaw.length > 0) return linkIdRaw

    // trace:*: allow fallback extraction from data.meta.linkId (avoid UI diving into deep meta).
    if (typeof (event as any).type !== 'string' || !(event as any).type.startsWith('trace:')) {
      return undefined
    }

    const data: any = (event as any).data
    const meta: any = data?.meta
    const linkIdFromMeta = meta?.linkId
    if (typeof linkIdFromMeta === 'string' && linkIdFromMeta.length > 0) return linkIdFromMeta

    return undefined
  })()

  const eventSeqRaw = options?.eventSeq
  const eventSeq =
    typeof eventSeqRaw === 'number' && Number.isFinite(eventSeqRaw) && eventSeqRaw > 0
      ? Math.floor(eventSeqRaw)
      : nextEventSeq()
  const eventId = makeEventId(instanceId, eventSeq)

  const base = {
    eventId,
    eventSeq,
    moduleId,
    instanceId,
    runtimeLabel,
    txnSeq,
    txnId,
    linkId,
    timestamp,
  } as const

  let downgrade: DowngradeReason | undefined

  const withDowngrade = (ref: Omit<RuntimeDebugEventRef, 'downgrade'>): RuntimeDebugEventRef => {
    if (!downgrade) return ref
    return { ...ref, downgrade: { reason: downgrade } }
  }

  switch (event.type) {
    case 'module:init':
      return withDowngrade({
        ...base,
        kind: 'lifecycle',
        label: 'module:init',
      })
    case 'module:destroy':
      return withDowngrade({
        ...base,
        kind: 'lifecycle',
        label: 'module:destroy',
      })
    case 'lifecycle:phase': {
      const e = event as Extract<Event, { readonly type: 'lifecycle:phase' }>
      const metaInput = isLightLike
        ? { type: 'lifecycle:phase', phase: e.phase, name: e.name }
        : { type: 'lifecycle:phase', phase: e.phase, name: e.name, payload: e.payload }
      const metaProjection = projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)
      return withDowngrade({
        ...base,
        kind: 'lifecycle',
        label: e.name,
        meta: metaProjection.value,
      })
    }
    case 'action:dispatch': {
      const action: any = (event as any).action
      const actionTagRaw = (event as any).actionTag
      const tag = typeof actionTagRaw === 'string' && actionTagRaw.length > 0 ? actionTagRaw : (action?._tag ?? action?.type)
      const label = String(tag ?? 'action:dispatch')
      const labelNormalized = label.length > 0 ? label : 'unknown'
      const unknownAction = (event as any).unknownAction === true ? true : undefined
      const metaInput = isLightLike
        ? { actionTag: labelNormalized, ...(unknownAction ? { unknownAction: true } : {}) }
        : { action, ...(unknownAction ? { unknownAction: true } : {}) }
      const metaProjection = projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)
      if (unknownAction) {
        downgrade = mergeDowngrade(downgrade, 'unknown')
      }
      return withDowngrade({
        ...base,
        kind: 'action',
        label: labelNormalized,
        meta: metaProjection.value,
      })
    }
    case 'state:update': {
      const e = event as Extract<Event, { readonly type: 'state:update' }>
      const dirtySetCanonical = stripDirtyRootPaths(e.dirtySet)
      const slimMetaInput: Record<string, unknown> = {}
      if (dirtySetCanonical !== undefined) slimMetaInput.dirtySet = dirtySetCanonical
      if (e.patchCount !== undefined) slimMetaInput.patchCount = e.patchCount
      if (e.patchesTruncated !== undefined) slimMetaInput.patchesTruncated = e.patchesTruncated
      if (e.patchesTruncatedReason !== undefined) slimMetaInput.patchesTruncatedReason = e.patchesTruncatedReason
      if (e.staticIrDigest !== undefined) slimMetaInput.staticIrDigest = e.staticIrDigest
      if (e.commitMode !== undefined) slimMetaInput.commitMode = e.commitMode
      if (e.priority !== undefined) slimMetaInput.priority = e.priority
      if (e.originKind !== undefined) slimMetaInput.originKind = e.originKind
      if (e.originName !== undefined) slimMetaInput.originName = e.originName

      const metaInput = isLightLike
        ? isLazyMaterialization
          ? slimMetaInput
          : { state: e.state, ...slimMetaInput }
        : isLazyMaterialization
          ? slimMetaInput
          : { state: e.state, ...slimMetaInput, traitSummary: e.traitSummary, replayEvent: e.replayEvent }

      const metaProjection = isLazyMaterialization
        ? {
            value: metaInput as unknown as JsonValue,
            stats: { dropped: 0, oversized: 0, nonSerializable: 0 } satisfies JsonValueProjectionStats,
            downgrade: undefined,
          }
        : projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)
      if (txnId) {
        lastTxnByInstance.set(instanceId, { txnId, txnSeq })
        backfillPendingTxnAlignment(instanceId, { txnId, txnSeq })
      }
      return withDowngrade({
        ...base,
        kind: 'state',
        label: 'state:update',
        meta: metaProjection.value,
      })
    }
    case 'process:start':
    case 'process:stop':
    case 'process:restart':
    case 'process:trigger':
    case 'process:dispatch':
    case 'process:error': {
      const e = event as Extract<
        Event,
        {
          readonly type:
            | 'process:start'
            | 'process:stop'
            | 'process:restart'
            | 'process:trigger'
            | 'process:dispatch'
            | 'process:error'
        }
      >

      const ts2 = typeof e.timestampMs === 'number' && Number.isFinite(e.timestampMs) ? e.timestampMs : timestamp

      const metaInput = {
        identity: e.identity,
        severity: e.severity,
        eventSeq: e.eventSeq,
        timestampMs: e.timestampMs,
        trigger: e.trigger,
        dispatch: e.dispatch,
        error: e.error,
        budgetEnvelope: (e as any).budgetEnvelope,
        degrade: (e as any).degrade,
      }
      const metaProjection = projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

      const processDegradeReason = (() => {
        const marker = (e as any).degrade
        if (!marker || typeof marker !== 'object' || Array.isArray(marker)) return undefined
        if ((marker as any).degraded !== true) return undefined
        const reason = (marker as any).reason
        if (reason === 'budget_exceeded') return 'budget_exceeded' as const
        if (reason === 'payload_oversized') return 'oversized' as const
        if (reason === 'payload_non_serializable') return 'non_serializable' as const
        return 'unknown' as const
      })()
      downgrade = mergeDowngrade(downgrade, processDegradeReason)

      const errorSummary =
        e.type === 'process:error' || e.type === 'process:restart'
          ? (e.error as any as SerializableErrorSummary | undefined)
          : undefined

      return withDowngrade({
        ...base,
        timestamp: ts2,
        kind: 'process',
        label: e.type,
        meta: metaProjection.value,
        errorSummary,
      })
    }
    case 'lifecycle:error': {
      const e = event as Extract<Event, { readonly type: 'lifecycle:error' }>
      const summary = toSerializableErrorSummary(e.cause)
      downgrade = mergeDowngrade(downgrade, summary.downgrade)
      const metaInput = isLightLike
        ? { type: 'lifecycle:error', phase: e.phase, name: e.hook }
        : {
            type: 'lifecycle:error',
            phase: e.phase,
            name: e.hook,
            hook: e.hook,
            taskId: e.taskId,
            origin: e.origin,
            txnSeq: e.txnSeq,
            opSeq: e.opSeq,
          }
      const metaProjection = projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)
      return withDowngrade({
        ...base,
        kind: 'lifecycle',
        label: 'lifecycle:error',
        meta: metaProjection.value,
        errorSummary: summary.errorSummary,
      })
    }
    case 'diagnostic': {
      const e = event as Extract<Event, { readonly type: 'diagnostic' }>
      const metaInput = {
        code: e.code,
        severity: e.severity,
        message: e.message,
        hint: e.hint,
        actionTag: e.actionTag,
        kind: e.kind,
        opSeq: e.opSeq,
        trigger: e.trigger,
      }
      const metaProjection = projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)
      return withDowngrade({
        ...base,
        kind: 'diagnostic',
        label: e.code,
        meta: metaProjection.value,
      })
    }
    case 'warn:priority-inversion': {
      const e = event as Extract<Event, { readonly type: 'warn:priority-inversion' }>
      const metaInput = isLightLike
        ? {
            tickSeq: e.tickSeq,
            reason: e.reason,
            selectorId: e.selectorId,
          }
        : {
            tickSeq: e.tickSeq,
            reason: e.reason,
            selectorId: e.selectorId,
          }

      const metaProjection = projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

      return withDowngrade({
        ...base,
        kind: 'diagnostic',
        label: e.type,
        meta: metaProjection.value,
      })
    }
    case 'warn:microtask-starvation': {
      const e = event as Extract<Event, { readonly type: 'warn:microtask-starvation' }>
      const metaInput = isLightLike
        ? {
            tickSeq: e.tickSeq,
            microtaskChainDepth: e.microtaskChainDepth,
          }
        : {
            tickSeq: e.tickSeq,
            microtaskChainDepth: e.microtaskChainDepth,
          }

      const metaProjection = projectJsonValue(metaInput)
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

      return withDowngrade({
        ...base,
        kind: 'diagnostic',
        label: e.type,
        meta: metaProjection.value,
      })
    }
    default: {
      if (typeof event.type !== 'string' || !event.type.startsWith('trace:')) {
        return undefined
      }

      // trace:devtools:ring-trim-policy: emit a stable slim payload for ring trim policy changes.
      if (event.type === 'trace:devtools:ring-trim-policy') {
        const data = (event as {
          readonly data?: {
            readonly mode?: unknown
            readonly threshold?: unknown
            readonly bufferSize?: unknown
          }
        }).data
        const metaInput = {
          mode: data?.mode,
          threshold: data?.threshold,
          bufferSize: data?.bufferSize,
        }
        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:tick: runtime tick evidence; keep Slim payload even in light tier.
      if (event.type === 'trace:tick') {
        const data: any = (event as any).data
        const metaInput = isLightLike
          ? {
              tickSeq: data?.tickSeq,
              phase: data?.phase,
              schedule: data?.schedule,
              triggerSummary: data?.triggerSummary,
              anchors: data?.anchors,
              budget: data?.budget,
              backlog: data?.backlog,
              result: data?.result,
            }
          : {
              data,
            }

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:txn-lane: slim evidence for Txn Lanes (lane/backlog/reasons), used for Devtools summary and offline export.
      if (event.type === 'trace:txn-lane') {
        const data: any = (event as any).data
        const evidence = data?.evidence ?? data

        const metaProjection = projectJsonValue(evidence)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        const label =
          typeof evidence?.kind === 'string' && evidence.kind.length > 0 ? String(evidence.kind) : 'txn-lane'

        return withDowngrade({
          ...base,
          kind: 'txn-lane',
          label,
          meta: metaProjection.value,
        })
      }

      if (event.type === 'trace:txn-phase') {
        const data: any = (event as any).data
        const metaInput = isLightLike
          ? {
              kind: data?.kind,
              originKind: data?.originKind,
              originName: data?.originName,
              commitMode: data?.commitMode,
              priority: data?.priority,
              txnPreludeMs: data?.txnPreludeMs,
              queue: data?.queue
                ? {
                    lane: data.queue.lane,
                    contextLookupMs: data.queue.contextLookupMs,
                    resolvePolicyMs: data.queue.resolvePolicyMs,
                    backpressureMs: data.queue.backpressureMs,
                    enqueueBookkeepingMs: data.queue.enqueueBookkeepingMs,
                    queueWaitMs: data.queue.queueWaitMs,
                    startHandoffMs: data.queue.startHandoffMs,
                    startMode: data.queue.startMode,
                  }
                : undefined,
              dispatchActionRecordMs: data?.dispatchActionRecordMs,
              dispatchActionCommitHubMs: data?.dispatchActionCommitHubMs,
              dispatchActionCount: data?.dispatchActionCount,
              bodyShellMs: data?.bodyShellMs,
              asyncEscapeGuardMs: data?.asyncEscapeGuardMs,
              traitConvergeMs: data?.traitConvergeMs,
              scopedValidateMs: data?.scopedValidateMs,
              sourceSyncMs: data?.sourceSyncMs,
              commit: data?.commit
                ? {
                    totalMs: data.commit.totalMs,
                    rowIdSyncMs: data.commit.rowIdSyncMs,
                    publishCommitMs: data.commit.publishCommitMs,
                    stateUpdateDebugRecordMs: data.commit.stateUpdateDebugRecordMs,
                    onCommitBeforeStateUpdateMs: data.commit.onCommitBeforeStateUpdateMs,
                    onCommitAfterStateUpdateMs: data.commit.onCommitAfterStateUpdateMs,
                  }
                : undefined,
            }
          : data

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:react-render / trace:react-selector: keep slim meta only (field trimming is handled by JsonValue projection).
      if (event.type === 'trace:react-render' || event.type === 'trace:react-selector') {
        const data: any = (event as any).data
        const metaProjection = projectJsonValue(
          isLightLike
            ? {
                componentLabel: data?.componentLabel,
                selectorKey: data?.selectorKey,
                fieldPaths: data?.fieldPaths,
                selectorId: data?.selectorId,
                lane: data?.lane,
                producer: data?.producer,
                fallbackReason: data?.fallbackReason,
                readsDigest: data?.readsDigest,
                equalsKind: data?.equalsKind,
                strictModePhase: data?.strictModePhase,
              }
            : {
                componentLabel: data?.componentLabel,
                selectorKey: data?.selectorKey,
                fieldPaths: data?.fieldPaths,
                selectorId: data?.selectorId,
                lane: data?.lane,
                producer: data?.producer,
                fallbackReason: data?.fallbackReason,
                readsDigest: data?.readsDigest,
                equalsKind: data?.equalsKind,
                strictModePhase: data?.strictModePhase,
                meta: data?.meta,
              },
        )
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)
        const label =
          typeof data?.componentLabel === 'string' && data.componentLabel.length > 0
            ? data.componentLabel
            : event.type === 'trace:react-selector'
              ? 'react-selector'
              : 'react-render'
        const last = lastTxnByInstance.get(instanceId)
        const txnSeqFromMeta =
          typeof data?.meta?.txnSeq === 'number' && Number.isFinite(data.meta.txnSeq) && data.meta.txnSeq >= 0
            ? Math.floor(data.meta.txnSeq)
            : undefined
        const txnIdFromMeta =
          typeof data?.meta?.txnId === 'string' && data.meta.txnId.length > 0 ? data.meta.txnId : undefined
        const txnIdAligned = txnIdFromMeta ?? base.txnId ?? last?.txnId
        const txnSeqAligned = txnSeqFromMeta ?? (base.txnSeq > 0 ? base.txnSeq : (last?.txnSeq ?? base.txnSeq))
        const ref = withDowngrade({
          ...base,
          txnId: txnIdAligned,
          txnSeq: txnSeqAligned,
          kind: event.type === 'trace:react-selector' ? 'react-selector' : 'react-render',
          label,
          meta: metaProjection.value,
        })

        if (instanceId !== 'unknown' && (ref.txnId == null || ref.txnSeq <= 0)) {
          enqueuePendingTxnAlignment(instanceId, ref)
        }

        return ref
      }

      // trace:selector:eval: SelectorGraph evaluation evidence within commit (used for txn→selector→render causal chain).
      if (event.type === 'trace:selector:eval') {
        const data: any = (event as any).data
        const metaInput = {
          selectorId: data?.selectorId,
          lane: data?.lane,
          producer: data?.producer,
          fallbackReason: data?.fallbackReason,
          readsDigest: data?.readsDigest,
          equalsKind: data?.equalsKind,
          changed: data?.changed,
          evalMs: data?.evalMs,
        }

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:exec-vm: Exec VM hit/miss evidence (049). In light tier we keep minimal summary fields.
      if (event.type === 'trace:exec-vm') {
        const data: any = (event as any).data
        const metaInput = {
          version: data?.version,
          stage: data?.stage,
          hit: data?.hit,
          reasonCode: data?.reasonCode ?? data?.reason,
          reasonDetail: data?.reasonDetail,
          execIrVersion: data?.execIrVersion,
          execIrHash: data?.execIrHash,
          serviceId: data?.serviceId,
          implId: data?.implId,
        }

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:trait:converge: converge evidence must be exportable (JsonValue hard gate) and trims heavy fields in light tier.
      if (event.type === 'trace:trait:converge') {
        const data = (event as Extract<Event, { readonly type: 'trace:trait:converge' }>).data
        const metaInput =
          diagnosticsLevel === 'light'
            ? stripTraitConvergeLight(data)
            : diagnosticsLevel === 'sampled'
              ? stripTraitConvergeSampled(data)
              : stripTraitConvergeLegacyFields(data)
        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'trait:converge',
          label: 'trait:converge',
          meta: metaProjection.value,
        })
      }

      // trace:trait:check: validation diagnostics must be exportable and stay slim in light tier (keep key fields).
      if (event.type === 'trace:trait:check') {
        const data = (event as Extract<Event, { readonly type: 'trace:trait:check' }>).data
        const metaInput = isLightLike ? stripTraitCheckLight(data) : data
        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'trait:check',
          label: 'trait:check',
          meta: metaProjection.value,
        })
      }

      // trace:trait:validate: validation decision summary must be exportable and slim in light tier (no heavy fields by default).
      if (event.type === 'trace:trait:validate') {
        const data = (event as Extract<Event, { readonly type: 'trace:trait:validate' }>).data
        const metaProjection = projectJsonValue(data)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'trait:validate',
          label: 'trait:validate',
          meta: metaProjection.value,
        })
      }

      // trace:module:traits: final traits snapshot must be exportable and slim in light tier (digest/count).
      if (event.type === 'trace:module:traits') {
        const data: any = (event as any).data
        const metaInput = isLightLike
          ? {
              digest: data?.digest,
              count: data?.count,
            }
          : {
              digest: data?.digest,
              count: data?.count,
              traits: data?.traits,
              provenanceIndex: data?.provenanceIndex,
            }

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:module:traits:conflict: conflict details must be exportable; avoid relying on truncated lifecycle:error messages.
      if (event.type === 'trace:module:traits:conflict') {
        const data: any = (event as any).data
        const metaInput = isLightLike
          ? {
              conflictCount: data?.conflictCount,
              traitIds: data?.traitIds,
            }
          : {
              conflictCount: data?.conflictCount,
              conflicts: data?.conflicts,
            }

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:module:descriptor: keep key anchors even in light tier (avoid data being fully trimmed).
      if (event.type === 'trace:module:descriptor') {
        const data: any = (event as any).data
        const metaInput = isLightLike
          ? {
              id: data?.id,
              traits: data?.traits,
              source: data?.source,
            }
          : { data }

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          kind: 'devtools',
          label: event.type,
          meta: metaProjection.value,
        })
      }

      // trace:effectop: keep slim op meta and prefer EffectOp.meta.moduleId when present.
      if (event.type === 'trace:effectop') {
        const data: any = (event as any).data
        const opMeta: any = data?.meta
        const opKind = (data?.kind ?? 'service') as RuntimeDebugEventKind
        const label = typeof data?.name === 'string' ? data.name : 'effectop'
        const moduleId2 = typeof opMeta?.moduleId === 'string' ? opMeta.moduleId : moduleId
        const txnId2 = typeof opMeta?.txnId === 'string' && opMeta.txnId.length > 0 ? opMeta.txnId : base.txnId
        const txnSeq2 =
          typeof opMeta?.txnSeq === 'number' && Number.isFinite(opMeta.txnSeq) && opMeta.txnSeq >= 0
            ? Math.floor(opMeta.txnSeq)
            : base.txnSeq

        const metaInput = isLightLike
          ? {
              id: data?.id,
              kind: data?.kind,
              name: data?.name,
              meta: opMeta,
            }
          : {
              id: data?.id,
              kind: data?.kind,
              name: data?.name,
              payload: data?.payload,
              meta: opMeta,
            }

        const metaProjection = projectJsonValue(metaInput)
        options?.onMetaProjection?.({
          stats: metaProjection.stats,
          downgrade: metaProjection.downgrade,
        })
        downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)

        return withDowngrade({
          ...base,
          moduleId: moduleId2,
          txnId: txnId2,
          txnSeq: txnSeq2,
          kind: opKind,
          label,
          meta: metaProjection.value,
        })
      }

      // Other trace:* events: categorize as devtools and trim meta by tier.
      const metaProjection = projectJsonValue(
        isLightLike
          ? {
              data: undefined,
            }
          : {
              data: (event as any).data,
            },
      )
      options?.onMetaProjection?.({
        stats: metaProjection.stats,
        downgrade: metaProjection.downgrade,
      })
      downgrade = mergeDowngrade(downgrade, metaProjection.downgrade)
      return withDowngrade({
        ...base,
        kind: 'devtools',
        label: event.type,
        meta: metaProjection.value,
      })
    }
  }
}
