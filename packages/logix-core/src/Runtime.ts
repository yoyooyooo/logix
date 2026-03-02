import { Effect, Layer, ManagedRuntime, Option, Scope } from 'effect'
import type { AnyModuleShape, ModuleImpl } from './internal/module.js'
import type { AnyModule } from './Module.js'
import * as AppRuntimeImpl from './internal/runtime/AppRuntime.js'
import * as ModuleRuntime from './internal/runtime/ModuleRuntime.js'
import * as Debug from './Debug.js'
import type * as EffectOp from './EffectOp.js'
import * as EffectOpCore from './internal/runtime/core/EffectOpCore.js'
import * as RunSession from './internal/observability/runSession.js'
import type { ReadQueryFallbackReason as ReadQueryFallbackReasonCore } from './internal/runtime/core/ReadQuery.js'
import {
  SchedulingPolicySurfaceTag,
  SchedulingPolicySurfaceOverridesTag,
  type ReadQueryStrictGateRuntimeConfig,
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type ConcurrencyPolicy,
  type ConcurrencyPolicyOverrides,
  type ConcurrencyPolicyPatch,
  type SchedulingPolicySurface,
  type SchedulingPolicySurfaceOverrides,
  type SchedulingPolicySurfacePatch,
  type StateTransactionOverrides,
  type StateTransactionInstrumentation,
  type StateTransactionTraitConvergeOverrides,
  type TraitConvergeTimeSlicingPatch,
  type TxnLanesPatch,
} from './internal/runtime/core/env.js'
import * as Middleware from './Middleware.js'
import { getRuntimeInternals } from './internal/runtime/core/runtimeInternalsAccessor.js'
import { enterRuntimeBatch, exitRuntimeBatch } from './internal/runtime/core/TickScheduler.js'
import * as ScopeRegistry from './ScopeRegistry.js'
import {
  warnInvalidConcurrencyPolicyDevOnly,
  warnInvalidSchedulingPolicySurfaceDevOnly,
  warnInvalidSchedulingPolicySurfacePatchDevOnly,
  warnInvalidStateTransactionOverridesDevOnly,
  warnInvalidStateTransactionRuntimeConfigDevOnly,
  warnInvalidStateTransactionTraitConvergeOverridesDevOnly,
} from './internal/runtime/core/configValidation.js'
import * as ProgramRunner from './internal/runtime/ProgramRunner.js'
import type { ProgramRunContext } from './internal/runtime/ProgramRunner.context.js'

export type { ProgramRunContext } from './internal/runtime/ProgramRunner.context.js'
export {
  BootError,
  DisposeError,
  DisposeTimeoutError,
  MainError,
  type ProgramIdentity,
  type ProgramRunnerErrorTag,
} from './internal/runtime/ProgramRunner.errors.js'

export interface OpenProgramOptions extends RuntimeOptions {
  readonly closeScopeTimeout?: number
  readonly handleSignals?: boolean
}

export interface RunProgramOptions<Args = unknown> extends OpenProgramOptions {
  readonly args?: Args
  readonly exitCode?: boolean
  readonly reportError?: boolean
}

type HostSchedulerCancel = () => void

type HostScheduler = {
  readonly nowMs: () => number
  readonly scheduleMicrotask: (cb: () => void) => void
  readonly scheduleMacrotask: (cb: () => void) => HostSchedulerCancel
  readonly scheduleAnimationFrame: (cb: () => void) => HostSchedulerCancel
  readonly scheduleTimeout: (ms: number, cb: () => void) => HostSchedulerCancel
}

const resolveRootImpl = <Sh extends AnyModuleShape>(
  root: ModuleImpl<any, Sh, any> | AnyModule,
): ModuleImpl<any, Sh, any> => {
  const isModuleImpl = (value: unknown): value is ModuleImpl<any, Sh, any> => {
    if (!value || typeof value !== 'object') return false
    const candidate = value as any
    return candidate._tag === 'ModuleImpl' && candidate.module != null && candidate.layer != null
  }

  if (isModuleImpl(root)) {
    return root
  }

  const rootModule = root as AnyModule & {
    readonly _kind?: string
    readonly createInstance?: (() => ModuleImpl<any, Sh, any>) | undefined
  }
  // Only runtime-ready Module objects (kind=Module) can be instantiated with zero-arg createInstance().
  // ModuleDef also exposes createInstance(config), but passing ModuleDef to Runtime.make is invalid.
  const fromCreateInstanceRaw =
    rootModule._kind === 'Module' && typeof rootModule.createInstance === 'function'
      ? rootModule.createInstance()
      : undefined
  if (fromCreateInstanceRaw !== undefined && !isModuleImpl(fromCreateInstanceRaw)) {
    throw new Error('[InvalidModuleRoot] Runtime.make expects ModuleImpl or Module.build(...) result.')
  }
  if (isModuleImpl(fromCreateInstanceRaw)) {
    return fromCreateInstanceRaw
  }

  throw new Error(
    '[InvalidModuleRoot] Runtime.make expects ModuleImpl (e.g. root.createInstance() / root.impl) or Module.build(...) result.',
  )
}

const resolveSchedulingPolicySurface = (options: RuntimeOptions | undefined): SchedulingPolicySurface | undefined =>
  options?.schedulingPolicy ?? options?.concurrencyPolicy

/**
 * Runtime-level StateTransaction defaults.
 *
 * Applied as the `runtime_default` baseline; modules and providers may override.
 */
export interface RuntimeStateTransactionOptions {
  readonly instrumentation?: StateTransactionInstrumentation
  readonly traitConvergeBudgetMs?: number
  readonly traitConvergeDecisionBudgetMs?: number
  readonly traitConvergeMode?: 'auto' | 'full' | 'dirty'
  readonly traitConvergeTimeSlicing?: TraitConvergeTimeSlicingPatch
  /** Txn lanes configuration at the `runtime_default` baseline (enabled by default). */
  readonly txnLanes?: TxnLanesPatch
  readonly traitConvergeOverridesByModuleId?: Readonly<Record<string, StateTransactionTraitConvergeOverrides>>
  /** Txn lanes overrides at the `runtime_module` layer. */
  readonly txnLanesOverridesByModuleId?: Readonly<Record<string, TxnLanesPatch>>
}

export type ReadQueryFallbackReason = ReadQueryFallbackReasonCore

export interface RuntimeReadQueryStrictGateOptions {
  /**
   * Strict gate mode for ReadQuery fallbacks.
   *
   * - `off`: disabled (default).
   * - `warn`: allow but emit structured diagnostics.
   * - `error`: fail on forbidden fallbacks (CI/perf gate).
   *
   * O-009: runtime only consumes build-graded selectors.
   * This gate applies to explicit runtime fallback paths (e.g. missing build grade), not to re-evaluate graded selectors.
   */
  readonly mode?: 'off' | 'warn' | 'error'
  /**
   * Selectors that must stay on the static lane (keyed by selectorId).
   *
   * When undefined, the implementation decides the gate coverage (typically `all`).
   */
  readonly requireStatic?: {
    readonly selectorIds?: ReadonlyArray<string>
    readonly modules?: ReadonlyArray<string>
  }
  /**
   * Fine-grained kill switch: deny specific fallback reasons (e.g. `unstableSelectorId`).
   */
  readonly denyFallbackReasons?: ReadonlyArray<ReadQueryFallbackReason>
}

export interface RuntimeReadQueryOptions {
  readonly strictGate?: RuntimeReadQueryStrictGateOptions
}

export interface RuntimeOptions {
  readonly layer?: Layer.Layer<any, never, never>
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
  /**
   * Optional runtime label (e.g. `AppDemoRuntime`) for Debug / DevTools grouping.
   */
  readonly label?: string
  /**
   * Optional HostScheduler override for this Runtime.
   *
   * Use it when you need deterministic host scheduling (tests) or a custom host integration.
   *
   * NOTE:
   * - TickScheduler captures HostScheduler at Layer build-time (073); overriding HostScheduler via `options.layer`
   *   is not sufficient unless the dependent layer is built under that override.
   * - This option avoids the pitfall by injecting HostScheduler into the runtime tick services build pipeline.
   */
  readonly hostScheduler?: HostScheduler
  /**
   * Optional Debug console output configuration.
   *
   * - `true`: enable `Debug.layer()` (auto mode).
   * - `Debug.DebugLayerOptions`: forwarded to `Debug.layer(options)`.
   *
   * Advanced: for full control, omit this option and provide your own Debug layers via `options.layer`.
   */
  readonly debug?: true | Debug.DebugLayerOptions
  readonly middleware?: EffectOp.MiddlewareStack
  /**
   * Enable Devtools (explicit override).
   *
   * - `true`: use default `DevtoolsRuntimeOptions`.
   * - `DevtoolsRuntimeOptions`: customize hub buffer size, DebugObserver filters, etc.
   */
  readonly devtools?: true | DevtoolsRuntimeOptions
  /**
   * Runtime-level StateTransaction defaults.
   *
   * When not provided, modules fall back to NODE_ENV-based defaults; modules may override via
   * `ModuleDef.implement({ stateTransaction })`.
   */
  readonly stateTransaction?: RuntimeStateTransactionOptions
  /**
   * Runtime-level unified scheduling policy surface.
   *
   * Converges queue/tick/concurrency knobs into one policy contract (default limit=16 with bounded fallback).
   */
  readonly schedulingPolicy?: SchedulingPolicySurface
  /**
   * Legacy alias of `schedulingPolicy` (phase-1 migration path).
   *
   * If both are provided, `schedulingPolicy` wins.
   */
  readonly concurrencyPolicy?: ConcurrencyPolicy
  /**
   * ReadQuery governance (e.g. strict gate policies).
   */
  readonly readQuery?: RuntimeReadQueryOptions
}

export interface DevtoolsRuntimeOptions {
  /** Hub ring buffer capacity (events). Default: 500. */
  readonly bufferSize?: number
  /**
   * Diagnostics level for exportable Devtools events.
   *
   * Forwarded to `Debug.devtoolsHubLayer({ diagnosticsLevel })`.
   * When explicitly set to `"off"`, `Runtime.make` enters a vacuum path:
   * it skips both DevtoolsHub sink mounting and DebugObserver middleware wiring.
   * Default: `"light"`.
   */
  readonly diagnosticsLevel?: Debug.DiagnosticsLevel
  /**
   * Trait converge diagnostics sampling config.
   *
   * Forwarded to `Debug.devtoolsHubLayer({ traitConvergeDiagnosticsSampling })`.
   */
  readonly traitConvergeDiagnosticsSampling?: Debug.TraitConvergeDiagnosticsSamplingConfig
  /** DebugObserver config for `trace:effectop`; undefined means full observation. */
  readonly observer?: Middleware.DebugObserverConfig | false
  /** Reserved: React render sampling / throttling config (consumed by `@logixjs/react`). */
  readonly sampling?: {
    readonly reactRenderSampleRate?: number
  }
}

/**
 * Construct an application runtime from a root module.
 *
 * - Uses the root module + layer as the composition root.
 * - Forks root processes within the runtime Scope.
 * - Exposes a ManagedRuntime; the full Env is provided by `root.layer + options.layer`.
 */
export const make = (
  root: ModuleImpl<any, AnyModuleShape, any> | AnyModule,
  options?: RuntimeOptions,
): ManagedRuntime.ManagedRuntime<any, never> => {
  const rootImpl = resolveRootImpl(root)
  const schedulingPolicy = resolveSchedulingPolicySurface(options)

  if (options?.schedulingPolicy !== undefined) {
    warnInvalidSchedulingPolicySurfaceDevOnly(options.schedulingPolicy, 'Runtime.make options.schedulingPolicy')
  } else {
    warnInvalidConcurrencyPolicyDevOnly(options?.concurrencyPolicy, 'Runtime.make options.concurrencyPolicy')
  }
  warnInvalidStateTransactionRuntimeConfigDevOnly(options?.stateTransaction, 'Runtime.make options.stateTransaction')

  const debugLayer =
    options?.debug === true
      ? (Debug.layer() as Layer.Layer<any, never, never>)
      : options?.debug
        ? (Debug.layer(options.debug) as Layer.Layer<any, never, never>)
        : (Layer.empty as Layer.Layer<any, never, never>)

  // Base Env: fully defined by caller-provided Layers (e.g. Config / platform services).
  // Debug sinks can be enabled via options.debug, or manually composed via options.layer.
  const userLayer = (options?.layer ?? Layer.empty) as Layer.Layer<any, never, never>
  const userWithDebug = options?.debug ? (Layer.mergeAll(userLayer, debugLayer) as Layer.Layer<any, never, never>) : userLayer

  let middlewareStack: EffectOp.MiddlewareStack = options?.middleware ?? []

  // When devtools is explicitly enabled:
  // 1) Append DebugObserver (`trace:effectop`).
  // 2) Mount the DevtoolsHub sink in appLayer (process-level event aggregation).
  const devtoolsOptions: DevtoolsRuntimeOptions | undefined = options?.devtools === true ? {} : options?.devtools
  const useDevtoolsVacuumPath = devtoolsOptions?.diagnosticsLevel === 'off'

  if (options?.devtools && !useDevtoolsVacuumPath) {
    const observerConfig = devtoolsOptions?.observer === false ? false : devtoolsOptions?.observer
    middlewareStack = Middleware.withDebug(middlewareStack, {
      logger: false,
      observer: observerConfig,
    })
  }

  // Optional: inject the EffectOp MiddlewareStack service for this Runtime,
  // so runtime code (e.g. StateTrait.install) can resolve the unified EffectOp bus configuration from Env.
  const effectOpLayer: Layer.Layer<any, never, never> =
    middlewareStack.length > 0
      ? (Layer.succeed(EffectOpCore.EffectOpMiddlewareTag, {
          stack: middlewareStack,
        }) as Layer.Layer<any, never, never>)
      : (Layer.empty as Layer.Layer<any, never, never>)

  const baseLayer =
    options?.label != null
      ? (Layer.mergeAll(Debug.runtimeLabel(options.label), userWithDebug) as Layer.Layer<any, never, never>)
      : userWithDebug

  const baseWithDevtools = options?.devtools && !useDevtoolsVacuumPath
    ? (Debug.devtoolsHubLayer(baseLayer, {
        bufferSize: devtoolsOptions?.bufferSize,
        diagnosticsLevel: devtoolsOptions?.diagnosticsLevel,
        traitConvergeDiagnosticsSampling: devtoolsOptions?.traitConvergeDiagnosticsSampling,
      }) as Layer.Layer<any, never, never>)
    : baseLayer

  // NOTE: runSession should be overrideable by callers (e.g. CI/trial-run injecting a stable runId).
  // In Layer.mergeAll, later layers override earlier ones; keep the default layer first.
  const appLayer = Layer.mergeAll(
    RunSession.runSessionLayer(),
    ScopeRegistry.layer(),
    baseWithDevtools,
    effectOpLayer,
  ) as Layer.Layer<any, never, never>

  const readQueryStrictGate: ReadQueryStrictGateRuntimeConfig | undefined = (() => {
    const strictGate = options?.readQuery?.strictGate
    if (!strictGate) return undefined

    const mode = strictGate.mode ?? 'off'
    if (mode === 'off') return undefined

    return {
      mode,
      requireStatic: strictGate.requireStatic,
      denyFallbackReasons: strictGate.denyFallbackReasons,
    }
  })()

  const appConfig: AppRuntimeImpl.LogixAppConfig<any> = {
    layer: appLayer,
    modules: [AppRuntimeImpl.provide(rootImpl.module, rootImpl.layer as Layer.Layer<any, any, any>)],
    processes: rootImpl.processes ?? [],
    onError: options?.onError,
    hostScheduler: options?.hostScheduler,
    stateTransaction: options?.stateTransaction,
    schedulingPolicy,
    readQueryStrictGate,
  }

  const app = AppRuntimeImpl.makeApp(appConfig)
  return app.makeRuntime() as ManagedRuntime.ManagedRuntime<any, never>
}

/**
 * Runtime.batch：
 * - Provides a stronger "tick boundary" for RuntimeStore/TickScheduler than the default microtask boundary.
 * - Sync-only: nested batches flatten; only the outermost batch triggers the flush boundary.
 * - NOT a transaction: no rollback; errors may result in partial commits, but the flush boundary is still released in finally.
 *
 * WARNING:
 * - Do not `await` inside the batch callback expecting mid-flush; batch only establishes a synchronous boundary.
 */
export const batch = <A>(fn: () => A): A => {
  enterRuntimeBatch()
  try {
    return fn()
  } finally {
    exitRuntimeBatch()
  }
}

/**
 * Resourceful entry: returns a scope-bound ProgramRunContext (booted and ready).
 */
export const openProgram = <Sh extends AnyModuleShape>(
  root: ModuleImpl<any, Sh, any> | AnyModule,
  options?: OpenProgramOptions,
): Effect.Effect<ProgramRunContext<Sh>, unknown, Scope.Scope> =>
  ProgramRunner.openProgram(
    (rootImpl, runtimeOptions) => make(rootImpl, runtimeOptions as RuntimeOptions),
    resolveRootImpl(root),
    options,
  )

/**
 * One-shot entry: boot → main(ctx,args) → dispose.
 */
export const runProgram = async <Sh extends AnyModuleShape, Args, A, E, R>(
  root: ModuleImpl<any, Sh, any> | AnyModule,
  main: (ctx: ProgramRunContext<Sh>, args: Args) => Effect.Effect<A, E, R>,
  options?: RunProgramOptions<Args>,
): Promise<A> =>
  ProgramRunner.runProgram(
    (rootImpl, runtimeOptions) => make(rootImpl, runtimeOptions as RuntimeOptions),
    resolveRootImpl(root),
    main,
    options,
  )

/**
 * Provider-scoped StateTransactionOverrides layer.
 *
 * Use it to apply local overrides on top of the `runtime_default` baseline.
 */
export const stateTransactionOverridesLayer = (
  overrides: StateTransactionOverrides,
): Layer.Layer<any, never, never> => {
  warnInvalidStateTransactionOverridesDevOnly(overrides, 'Runtime.stateTransactionOverridesLayer')
  return Layer.succeed(StateTransactionOverridesTag, overrides) as Layer.Layer<any, never, never>
}

/**
 * Provider-scoped SchedulingPolicySurfaceOverrides layer.
 *
 * Use it to apply local overrides on top of the `runtime_default` baseline.
 */
export const schedulingPolicyOverridesLayer = (
  overrides: SchedulingPolicySurfaceOverrides,
): Layer.Layer<any, never, never> => {
  warnInvalidSchedulingPolicySurfaceDevOnly(overrides, 'Runtime.schedulingPolicyOverridesLayer')
  return Layer.succeed(SchedulingPolicySurfaceOverridesTag, overrides) as Layer.Layer<any, never, never>
}

/**
 * Legacy alias: provider-scoped ConcurrencyPolicyOverrides layer.
 *
 * Kept for phase-1 migration. Internally it is the same scheduling policy surface override layer.
 */
export const concurrencyPolicyOverridesLayer = (
  overrides: ConcurrencyPolicyOverrides,
): Layer.Layer<any, never, never> => {
  return schedulingPolicyOverridesLayer(overrides)
}

/**
 * Hot-switch Trait converge overrides for a moduleId.
 *
 * This mutates the `runtime_module` patch map only; provider overrides still take precedence.
 */
export const setTraitConvergeOverride = (
  runtime: ManagedRuntime.ManagedRuntime<any, never>,
  moduleId: string,
  overrides: StateTransactionTraitConvergeOverrides | undefined,
): void => {
  warnInvalidStateTransactionTraitConvergeOverridesDevOnly(overrides, `Runtime.setTraitConvergeOverride(${moduleId})`)

  runtime.runSync(
    Effect.gen(function* () {
      const runtimeConfigOpt = yield* Effect.serviceOption(StateTransactionConfigTag)

      if (Option.isNone(runtimeConfigOpt)) {
        return
      }

      // NOTE: runtime config lives in Env as a Service; hot-switch by replacing the per-module patch map.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runtimeConfig: any = runtimeConfigOpt.value
      const next = {
        ...(runtimeConfig.traitConvergeOverridesByModuleId ?? {}),
      }

      if (overrides) {
        next[moduleId] = overrides
      } else {
        delete next[moduleId]
      }

      runtimeConfig.traitConvergeOverridesByModuleId = next
    }),
  )
}

/**
 * Hot-switch SchedulingPolicySurface patch for a moduleId.
 *
 * This mutates the `runtime_module` patch map only; provider overrides still take precedence.
 */
export const setSchedulingPolicyOverride = (
  runtime: ManagedRuntime.ManagedRuntime<any, never>,
  moduleId: string,
  patch: SchedulingPolicySurfacePatch | undefined,
): void => {
  warnInvalidSchedulingPolicySurfacePatchDevOnly(patch, `Runtime.setSchedulingPolicyOverride(${moduleId})`)

  runtime.runSync(
    Effect.gen(function* () {
      const runtimeConfigOpt = yield* Effect.serviceOption(SchedulingPolicySurfaceTag)

      if (Option.isNone(runtimeConfigOpt)) {
        return
      }

      // NOTE: runtime config lives in Env as a Service; hot-switch by replacing the per-module patch map.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runtimeConfig: any = runtimeConfigOpt.value
      const next = {
        ...(runtimeConfig.overridesByModuleId ?? {}),
      }

      if (patch) {
        next[moduleId] = patch
      } else {
        delete next[moduleId]
      }

      runtimeConfig.overridesByModuleId = next
    }),
  )
}

/**
 * Legacy alias: hot-switch ConcurrencyPolicy patch for a moduleId.
 *
 * Kept for phase-1 migration. Internally routes to scheduling policy surface override.
 */
export const setConcurrencyPolicyOverride = (
  runtime: ManagedRuntime.ManagedRuntime<any, never>,
  moduleId: string,
  patch: ConcurrencyPolicyPatch | undefined,
): void => {
  setSchedulingPolicyOverride(runtime, moduleId, patch)
}

/**
 * Apply a transaction snapshot for time-travel replay (dev/test).
 *
 * - `moduleId` / `instanceId` match Debug events.
 * - `mode`: `before` replays pre-transaction; `after` replays post-commit.
 *
 * No-op if the runtime/instance cannot be resolved.
 */
export const applyTransactionSnapshot = (
  moduleId: string,
  instanceId: string,
  txnId: string,
  mode: 'before' | 'after',
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const runtime = ModuleRuntime.getRuntimeByModuleAndInstance<any, any>(moduleId, instanceId)

    if (!runtime) {
      return
    }

    try {
      yield* getRuntimeInternals(runtime as any).txn.applyTransactionSnapshot(txnId, mode)
    } catch {
      return
    }
  })
