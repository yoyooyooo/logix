import { Effect, Layer, Logger } from 'effect'
import type { AnyModuleShape, ModuleLike, ModuleRuntime, ModuleTag } from './module.js'
import type { FieldGraph, FieldPlan, FieldProgram } from './field-kernel/model.js'
import * as Internal from './runtime/core/DebugSink.js'
import * as DevtoolsHub from './runtime/core/DevtoolsHub.js'
import * as ConvergeStaticIrCollector from './runtime/core/ConvergeStaticIrCollector.js'
import * as ModuleFieldsRegistry from './debug/ModuleFieldsRegistry.js'
import type * as ModuleFields from './runtime/core/ModuleFields.js'
import { getModuleFieldsProgram, getRuntimeInternals } from './runtime/core/runtimeInternalsAccessor.js'
import { getNodeEnv } from './runtime/core/env.js'
import type { EvidencePackage, EvidencePackageSource } from './evidence-api.js'

// Repo-internal Debug API: a namespace-shaped facade for debugging capabilities used by in-repo owners.
// The event model and core Layers live under internal/runtime/core/DebugSink.ts.

export type Event = Internal.Event
export interface Sink extends Internal.Sink {}
export interface RuntimeDebugEventRef extends Internal.RuntimeDebugEventRef {}
export type DiagnosticsLevel = Internal.DiagnosticsLevel
export type DiagnosticsMaterialization = Internal.DiagnosticsMaterialization
export type TraceMode = Internal.TraceMode
export type FieldConvergeDiagnosticsSamplingConfig = Internal.FieldConvergeDiagnosticsSamplingConfig
export type SnapshotToken = DevtoolsHub.SnapshotToken

export const toRuntimeDebugEventRef = Internal.toRuntimeDebugEventRef

export const internal = {
  currentDebugSinks: Internal.currentDebugSinks,
  currentRuntimeLabel: Internal.currentRuntimeLabel,
  currentDiagnosticsLevel: Internal.currentDiagnosticsLevel,
  currentDiagnosticsMaterialization: Internal.currentDiagnosticsMaterialization,
  currentTraceMode: Internal.currentTraceMode,
  currentFieldConvergeDiagnosticsSampling: Internal.currentFieldConvergeDiagnosticsSampling,
  toRuntimeDebugEventRef: Internal.toRuntimeDebugEventRef,
}

export interface DevtoolsSnapshot extends DevtoolsHub.DevtoolsSnapshot {}
export interface DevtoolsHubOptions extends DevtoolsHub.DevtoolsHubOptions {
  readonly diagnosticsLevel?: DiagnosticsLevel
  /**
   * Diagnostics materialization mode:
   * - eager: include heavy payloads (e.g. state snapshot) in exportable events.
   * - lazy: keep slim anchors only; heavy payloads must be materialized on-demand by higher layers.
   */
  readonly materialization?: DiagnosticsMaterialization
  /**
   * Trace mode:
   * - on: enables `trace:*` events (e.g. trace:tick / trace:effectop).
   * - off: drops trace events at the Debug.record boundary (keeps non-trace diagnostics/events).
   */
  readonly traceMode?: TraceMode
  readonly fieldConvergeDiagnosticsSampling?: FieldConvergeDiagnosticsSamplingConfig
}

export const getDevtoolsSnapshot = DevtoolsHub.getDevtoolsSnapshot
export const getDevtoolsSnapshotByRuntimeLabel = DevtoolsHub.getDevtoolsSnapshotByRuntimeLabel
export const getDevtoolsSnapshotToken = DevtoolsHub.getDevtoolsSnapshotToken
export const subscribeDevtoolsSnapshot = DevtoolsHub.subscribeDevtoolsSnapshot
export const clearDevtoolsEvents = DevtoolsHub.clearDevtoolsEvents
export const getDevtoolsRunId = DevtoolsHub.getDevtoolsRunId
export const setDevtoolsRunId = DevtoolsHub.setDevtoolsRunId
export const startDevtoolsRun = DevtoolsHub.startDevtoolsRun
export const setInstanceLabel = DevtoolsHub.setInstanceLabel
export const getInstanceLabel = DevtoolsHub.getInstanceLabel

export const exportEvidencePackage = (options?: {
  readonly runId?: string
  readonly source?: EvidencePackageSource
  readonly protocolVersion?: string
}): EvidencePackage => DevtoolsHub.exportDevtoolsEvidencePackage(options)

/**
 * Diagnostics level for exportable events.
 *
 * Controls what DevtoolsHub exports (ring buffer / snapshots), without changing Debug.record's fallback semantics.
 */
export const diagnosticsLevel = (level: DiagnosticsLevel): Layer.Layer<any, never, never> =>
  Internal.diagnosticsLevel(level) as Layer.Layer<any, never, never>

export const diagnosticsMaterialization = (
  mode: DiagnosticsMaterialization,
): Layer.Layer<any, never, never> =>
  Internal.diagnosticsMaterialization(mode) as Layer.Layer<any, never, never>

export const traceMode = (mode: TraceMode): Layer.Layer<any, never, never> =>
  Internal.traceMode(mode) as Layer.Layer<any, never, never>

export const fieldConvergeDiagnosticsSampling = (
  config: FieldConvergeDiagnosticsSamplingConfig,
): Layer.Layer<any, never, never> => Internal.fieldConvergeDiagnosticsSampling(config)

/**
 * Whether Devtools is enabled.
 *
 * Used by React/Devtools UI to decide if extra instrumentation should be active; turned on by devtoolsHubLayer.
 */
export const isDevtoolsEnabled = DevtoolsHub.isDevtoolsEnabled

/**
 * A lightweight counter of active module runtimes.
 *
 * Derived from module:init / module:destroy events; suitable as a DevTools / Playground data source.
 */
export interface ModuleRuntimeCounter {
  readonly sink: Sink
  readonly getSnapshot: () => ReadonlyMap<string, number>
}

/**
 * A simple in-memory ring buffer for Debug events.
 *
 * No filtering/grouping; consumers can post-process snapshots (by moduleId/type/etc.).
 */
export interface RingBufferSink {
  readonly sink: Sink
  readonly getSnapshot: () => ReadonlyArray<Event>
  readonly clear: () => void
}

/**
 * Create a Debug sink that counts active instances per moduleId.
 *
 * Snapshots are exposed via getSnapshot(); bridging to UI (window/postMessage/etc.) is left to consumers.
 */
export const makeModuleRuntimeCounterSink = (): ModuleRuntimeCounter => {
  const counts = new Map<string, number>()

  const sink: Sink = {
    record: (event: Event) =>
      Effect.sync(() => {
        if (event.type === 'module:init') {
          const moduleId = event.moduleId ?? 'unknown'
          const runtimeLabel = 'runtimeLabel' in event && event.runtimeLabel ? event.runtimeLabel : 'unknown'
          const key = `${runtimeLabel}::${moduleId}`
          const prev = counts.get(key) ?? 0
          counts.set(key, prev + 1)
          return
        }
        if (event.type === 'module:destroy') {
          const moduleId = event.moduleId ?? 'unknown'
          const runtimeLabel = 'runtimeLabel' in event && event.runtimeLabel ? event.runtimeLabel : 'unknown'
          const key = `${runtimeLabel}::${moduleId}`
          const prev = counts.get(key) ?? 0
          const next = prev - 1
          if (next <= 0) {
            counts.delete(key)
          } else {
            counts.set(key, next)
          }
        }
      }),
  }

  const getSnapshot = (): ReadonlyMap<string, number> => new Map(counts)

  return { sink, getSnapshot }
}

/**
 * Create a ring-buffer Debug sink.
 *
 * Records the last N events in chronological order; a good foundation for event timelines.
 */
export const makeRingBufferSink = (capacity = 1000): RingBufferSink => {
  const boundedCapacity = Number.isFinite(capacity) ? Math.ceil(capacity) : 0
  const isBounded = boundedCapacity > 0

  const boundedBuffer: Array<Event | undefined> = isBounded ? new Array(boundedCapacity) : []
  const unboundedBuffer: Event[] = isBounded ? [] : []
  let head = 0
  let size = 0

  const sink: Sink = {
    record: (event: Event) =>
      Effect.sync(() => {
        if (capacity <= 0) {
          return
        }
        if (!isBounded) {
          unboundedBuffer.push(event)
          return
        }

        const writeIndex = (head + size) % boundedCapacity
        boundedBuffer[writeIndex] = event
        if (size < boundedCapacity) {
          size += 1
          return
        }
        head = (head + 1) % boundedCapacity
      }),
  }

  const getSnapshot = (): ReadonlyArray<Event> => {
    if (!isBounded) {
      return unboundedBuffer.slice()
    }
    if (size === 0) {
      return []
    }
    const snapshot = new Array<Event>(size)
    for (let i = 0; i < size; i++) {
      snapshot[i] = boundedBuffer[(head + i) % boundedCapacity]!
    }
    return snapshot
  }

  const clear = (): void => {
    if (!isBounded) {
      unboundedBuffer.length = 0
      return
    }
    for (let i = 0; i < size; i++) {
      boundedBuffer[(head + i) % boundedCapacity] = undefined
    }
    head = 0
    size = 0
  }

  return { sink, getSnapshot, clear }
}

/**
 * Emit a Debug event to sinks attached to the current Fiber.
 *
 * If no sink is provided, the runtime chooses a safe fallback (browser console grouping; node preserves error-class events).
 */
export const record = Internal.record

/**
 * A no-op Debug layer.
 *
 * Provides an empty sink set and drops all Debug events; useful for tests or explicitly disabling Debug.
 */
export const noopLayer = Internal.noopLayer as unknown as Layer.Layer<any, never, never>

/**
 * Debug mode selector.
 *
 * - `auto`: infer dev/prod from NODE_ENV.
 * - `dev`: verbose diagnostics.
 * - `prod`: keep only high-value diagnostics/errors.
 * - `off`: disable sinks (benchmarks/special tests).
 */
export type DebugMode = 'auto' | 'dev' | 'prod' | 'off'

export interface DebugLayerOptions {
  readonly mode?: DebugMode
  /**
   * In dev mode, choose what to print to the browser console:
   * - default: diagnostic + lifecycle:error + trace:* (current default behavior)
   * - diagnostic: diagnostic(warn/error) + lifecycle:error only (recommended for app dev with Devtools)
   */
  readonly devConsole?: 'default' | 'diagnostic'
  /**
   * Diagnostics level for exportable debug event refs (used by DevtoolsHub and debug sinks that normalize events).
   *
   * Equivalent to composing `Debug.diagnosticsLevel(level)` with `Debug.layer(...)`.
   */
  readonly diagnosticsLevel?: DiagnosticsLevel
  /**
   * Reserved for future use: enable high-noise action/state logs in dev.
   */
  readonly verboseActions?: boolean
  /**
   * Reserved for future use: emit key events into metrics in prod.
   */
  readonly enableMetrics?: boolean
}

const resolveMode = (mode: DebugMode | undefined): DebugMode => {
  if (mode && mode !== 'auto') {
    return mode
  }

  const env = getNodeEnv()
  return env === 'production' ? 'prod' : 'dev'
}

/**
 * Public entry: compose a Debug layer based on the environment or an explicit mode.
 *
 * Default mode is `auto`: non-production → `dev`; production → `prod`.
 *
 * @example
 * ```ts
 * const runtime = Runtime.make(AppImpl, {
 *   layer: Layer.mergeAll(Debug.layer(), businessLayer),
 * })
 * ```
 */
export const layer = (options?: DebugLayerOptions): Layer.Layer<any, never, never> => {
  const mode = resolveMode(options?.mode)
  const diagnostics = options?.diagnosticsLevel

  const sinks = (() => {
    switch (mode) {
      case 'off':
        return Internal.noopLayer as unknown as Layer.Layer<any, never, never>
      case 'prod':
        // Production: keep only high-value diagnostics/errors to avoid noisy logs.
        return Internal.errorOnlyLayer as unknown as Layer.Layer<any, never, never>
      case 'dev':
      case 'auto': {
        // Dev: enable browser-friendly Debug sink output by default.
        // Logger.pretty is intentionally opt-in by callers to avoid implicitly rewriting the logger.
        return options?.devConsole === 'diagnostic'
          ? (Internal.browserDiagnosticConsoleLayer as unknown as Layer.Layer<any, never, never>)
          : (Internal.browserConsoleLayer as unknown as Layer.Layer<any, never, never>)
      }
    }
  })()

  const trace = mode === 'dev' ? traceMode('on') : traceMode('off')

  const base = Layer.mergeAll(sinks, trace) as Layer.Layer<any, never, never>

  return diagnostics ? (Layer.mergeAll(base, diagnosticsLevel(diagnostics)) as Layer.Layer<any, never, never>) : base
}

export type PrettyLoggerOptions = Parameters<typeof Logger.consolePretty>[0]

export const withPrettyLogger = (
  base: Layer.Layer<any, any, any>,
  options?: PrettyLoggerOptions,
): Layer.Layer<any, any, any> =>
  Layer.merge(
    base,
    Layer.effect(
      Logger.CurrentLoggers,
      Effect.gen(function* () {
        const current = yield* Effect.service(Logger.CurrentLoggers)
        return new Set([...current].filter((logger) => logger !== Logger.defaultLogger).concat(Logger.consolePretty(options)))
      }),
    ) as Layer.Layer<any, never, never>,
  )

/**
 * Replace Debug sinks with the provided sink set.
 *
 * Advanced: use either `Debug.layer` or `Debug.replace` in a scope, not both.
 */
export const replace = (sinks: ReadonlyArray<Sink>): Layer.Layer<any, never, never> =>
  Layer.succeed(internal.currentDebugSinks, sinks as ReadonlyArray<Internal.Sink>) as Layer.Layer<any, never, never>

/**
 * Append sinks to the current Fiber's sink set (without overriding existing sinks).
 */
export const appendSinks = (sinks: ReadonlyArray<Sink>): Layer.Layer<any, never, never> =>
  Layer.effect(
    internal.currentDebugSinks,
    Effect.gen(function* () {
      const current = yield* internal.currentDebugSinks
      return [...current, ...(sinks as ReadonlyArray<Internal.Sink>)]
    }),
  ) as Layer.Layer<any, never, never>

/**
 * Append the DevtoolsHub sink to aggregate Debug events into snapshots.
 *
 * Works by appending sinks; it does not override `Debug.layer` / `Debug.replace` / custom sinks.
 */
export function devtoolsHubLayer(options?: DevtoolsHubOptions): Layer.Layer<any, never, never>
export function devtoolsHubLayer(
  base: Layer.Layer<any, any, any>,
  options?: DevtoolsHubOptions,
): Layer.Layer<any, never, any>
export function devtoolsHubLayer(
  baseOrOptions?: Layer.Layer<any, any, any> | DevtoolsHubOptions,
  maybeOptions?: DevtoolsHubOptions,
): Layer.Layer<any, never, any> {
  const isLayerValue = (value: unknown): value is Layer.Layer<any, any, any> => Layer.isLayer(value)

  const hasBase = isLayerValue(baseOrOptions)
  const base = hasBase
    ? (baseOrOptions as Layer.Layer<any, any, any>)
    : (Layer.empty as unknown as Layer.Layer<any, any, any>)
  const options = hasBase ? maybeOptions : (baseOrOptions as DevtoolsHubOptions | undefined)

  DevtoolsHub.configureDevtoolsHub(options)
  const append = appendSinks([DevtoolsHub.devtoolsHubSink])
  const appendConvergeStaticIr = ConvergeStaticIrCollector.appendConvergeStaticIrCollectors([
    DevtoolsHub.devtoolsHubConvergeStaticIrCollector,
  ])
  const resolvedDiagnosticsLevel = options?.diagnosticsLevel ?? 'light'
  const resolvedTraceMode = options?.traceMode ?? (resolvedDiagnosticsLevel === 'off' ? 'off' : getNodeEnv() === 'production' ? 'off' : 'on')
  const enableExportableDiagnostics = diagnosticsLevel(resolvedDiagnosticsLevel)
  const enableMaterialization = diagnosticsMaterialization(
    options?.materialization ??
      (resolvedDiagnosticsLevel === 'full' && getNodeEnv() === 'production' ? 'lazy' : 'eager'),
  )
  const enableTraceMode = traceMode(resolvedTraceMode)
  const convergeSamplingLayer = options?.fieldConvergeDiagnosticsSampling
    ? fieldConvergeDiagnosticsSampling(options.fieldConvergeDiagnosticsSampling)
    : (Layer.empty as unknown as Layer.Layer<any, never, never>)

  // FiberRef layers must build base sinks first, then append; provideMerge(append, base)
  // builds base first and then applies append's FiberRefs patch, avoiding overrides.
  return Layer.provideMerge(
    Layer.mergeAll(
      append,
      enableExportableDiagnostics,
      enableMaterialization,
      enableTraceMode,
      convergeSamplingLayer,
      appendConvergeStaticIr,
    ) as Layer.Layer<
      any,
      never,
      any
    >,
    base,
  ) as Layer.Layer<any, never, any>
}

/**
 * Attach a logical runtime label to Debug events within the current Fiber scope.
 *
 * DevTools can group events by this label.
 */
export const runtimeLabel = (label: string): Layer.Layer<any, never, never> =>
  Layer.succeed(internal.currentRuntimeLabel, label) as Layer.Layer<any, never, never>

/**
 * Field program debug view for Devtools/scripts.
 */
export interface ModuleFieldProgramDebug {
  readonly program?: FieldProgram<any>
  readonly graph?: FieldGraph
  readonly plan?: FieldPlan
}

/**
 * A minimal enumerable field item from the finalized snapshot.
 */
export interface ModuleFinalFieldItem {
  readonly fieldId: string
  readonly name: string
  readonly description?: string
  readonly provenance: ModuleFields.FieldProvenance
}

/**
 * Read the compiled field program (if any) from a module definition and return a debug view.
 */
export const getModuleFieldProgram = (
  module: ModuleTag<string, AnyModuleShape> | ModuleLike<string, AnyModuleShape, any>,
): ModuleFieldProgramDebug => {
  const moduleTag = (module as any).tag ? (module as any).tag : module

  const program =
    (getModuleFieldsProgram(module as any) as FieldProgram<any> | undefined) ??
    (getModuleFieldsProgram(moduleTag as any) as FieldProgram<any> | undefined)

  if (!program) {
    return {}
  }

  return {
    program,
    graph: program.graph,
    plan: program.plan,
  }
}

/**
 * Get a module's field program debug view by moduleId.
 */
export const getModuleFieldProgramById = (moduleId: string): ModuleFieldProgramDebug | undefined => {
  const program = ModuleFieldsRegistry.getModuleProgramById(moduleId)
  if (!program) {
    return undefined
  }
  return {
    program,
    graph: program.graph,
    plan: program.plan,
  }
}

/**
 * Read the finalized field snapshot from a ModuleRuntime; undefined if not finalized.
 */
export const getModuleFieldSnapshot = (
  runtime: ModuleRuntime<any, any>,
): ModuleFields.ModuleFieldsSnapshot | undefined => {
  try {
    const internals = getRuntimeInternals(runtime as any)
    return internals.fields.getModuleFieldsSnapshot()
  } catch {
    return undefined
  }
}

/**
 * Export a minimal, enumerable field list from the finalized snapshot.
 */
export const getModuleFinalFields = (runtime: ModuleRuntime<any, any>): ReadonlyArray<ModuleFinalFieldItem> => {
  const snapshot = getModuleFieldSnapshot(runtime)
  if (!snapshot) return []

  return snapshot.fields.map((t) => ({
    fieldId: t.fieldId,
    name: t.name,
    description: t.description,
    provenance: snapshot.provenanceIndex[t.fieldId]!,
  }))
}

/**
 * Append a trace-only sink (handles `trace:*`) on top of the current Debug sinks.
 *
 * Default behavior logs trace events via logDebug; you can provide a handler to forward into ring buffers / bridges.
 *
 * @example
 * ```ts
 * const layer = Debug.traceLayer(
 *   Debug.layer({ mode: 'dev' }),
 *   (event) => Effect.logInfo({ traceEvent: event }),
 * )
 * ```
 */
const isLayer = (value: unknown): value is Layer.Layer<any, any, any> =>
  typeof value === 'object' && value !== null && 'build' in (value as Record<string, unknown>)

export function traceLayer(onTrace?: (event: Event) => Effect.Effect<void>): Layer.Layer<any, never, never>
export function traceLayer(
  base: Layer.Layer<any, any, any>,
  onTrace?: (event: Event) => Effect.Effect<void>,
): Layer.Layer<any, never, any>
export function traceLayer(
  baseOrHandler?: Layer.Layer<any, any, any> | ((event: Event) => Effect.Effect<void>),
  maybeOnTrace?: (event: Event) => Effect.Effect<void>,
): Layer.Layer<any, never, any> {
  const hasBase = isLayer(baseOrHandler)
  const base = hasBase
    ? (baseOrHandler as Layer.Layer<any, any, any>)
    : (Layer.empty as unknown as Layer.Layer<any, any, any>)
  const onTrace = hasBase ? maybeOnTrace : (baseOrHandler as ((event: Event) => Effect.Effect<void>) | undefined)

  const traceSink: Sink = {
    record: (event: Event) =>
      typeof event.type === 'string' && event.type.startsWith('trace:')
        ? onTrace
          ? onTrace(event)
          : Effect.logDebug({ traceEvent: event })
        : Effect.void,
  }

  // Append the trace sink via FiberRef: extend the current Fiber's sink set.
  // Do not depend on DebugHub/Tag; use FiberRef.currentDebugSinks as the single source of truth.
  const appendTrace = Layer.effect(
    Internal.currentDebugSinks,
    Effect.gen(function* () {
      const sinks = yield* Internal.currentDebugSinks
      return [...sinks, traceSink]
    }),
  )

  // Same as devtoolsHubLayer: build base first, then appendTrace updates FiberRef sinks.
  return Layer.provideMerge(appendTrace, base as Layer.Layer<any, any, any>) as Layer.Layer<any, never, any>
}
