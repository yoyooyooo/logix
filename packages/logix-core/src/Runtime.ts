import { Effect, Layer, ManagedRuntime, Option, Scope, ServiceMap } from 'effect'
import type { AnyModuleShape, ProgramRuntimeBlueprint } from './internal/module.js'
import type { AnyProgram } from './Module.js'
import { getProgramRuntimeBlueprint, hasProgramRuntimeBlueprint, isProgram } from './internal/program.js'
import * as AppRuntimeImpl from './internal/runtime/AppRuntime.js'
import * as ModuleRuntime from './internal/runtime/core/ModuleRuntime.js'
import * as Debug from './internal/debug-api.js'
import type * as EffectOp from './internal/effect-op.js'
import * as EffectOpCore from './internal/runtime/core/EffectOpCore.js'
import * as TrialRouteInternal from './internal/observability/trialRunModule.js'
import * as RunSession from './internal/verification/runSession.js'
import { extractRuntimeStaticCheckArtifact, makeMissingBlueprintFinding } from './internal/verification/staticCheck.js'
import type { ReadQueryFallbackReason as ReadQueryFallbackReasonCore } from './internal/runtime/core/ReadQuery.js'
import { fnv1a32, stableStringify } from './internal/digest.js'
import {
  SchedulingPolicySurfaceTag,
  SchedulingPolicySurfaceOverridesTag,
  type ReadQueryStrictGateRuntimeConfig,
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type SchedulingPolicySurface,
  type SchedulingPolicySurfaceOverrides,
  type SchedulingPolicySurfacePatch,
  type StateTransactionOverrides,
  type StateTransactionInstrumentation,
  type StateTransactionFieldConvergeOverrides,
  type FieldConvergeTimeSlicingPatch,
  type TxnLanesPatch,
} from './internal/runtime/core/env.js'
import * as Middleware from './internal/middleware.js'
import { getRuntimeInternals } from './internal/runtime/core/runtimeInternalsAccessor.js'
import { enterRuntimeBatch, exitRuntimeBatch } from './internal/runtime/core/TickScheduler.js'
import * as ScopeRegistry from './internal/scope-registry.js'
import {
  makeVerificationControlPlaneReport,
  type VerificationControlPlaneArtifactRef,
  type VerificationDependencyCause,
  type VerificationLifecycleSummary,
  type VerificationControlPlaneFinding,
  type VerificationControlPlaneRepairHint,
  type VerificationControlPlaneReport,
} from './ControlPlane.js'
import {
  warnInvalidSchedulingPolicySurfaceDevOnly,
  warnInvalidSchedulingPolicySurfacePatchDevOnly,
  warnInvalidStateTransactionOverridesDevOnly,
  warnInvalidStateTransactionRuntimeConfigDevOnly,
  warnInvalidStateTransactionFieldConvergeOverridesDevOnly,
} from './internal/runtime/core/configValidation.js'
import * as ProgramRunner from './internal/runtime/core/runner/ProgramRunner.js'
import type { ProgramRunContext } from './internal/runtime/core/runner/ProgramRunner.context.js'

export type { ProgramRunContext } from './internal/runtime/core/runner/ProgramRunner.context.js'
export {
  BootError,
  DisposeError,
  DisposeTimeoutError,
  MainError,
  type ProgramIdentity,
  type ProgramRunnerErrorTag,
} from './internal/runtime/core/runner/ProgramRunner.errors.js'

export interface OpenProgramOptions extends RuntimeOptions {
  readonly closeScopeTimeout?: number
  readonly handleSignals?: boolean
}

export interface RunOptions<Args = unknown> extends OpenProgramOptions {
  readonly args?: Args
  readonly exitCode?: boolean
  readonly reportError?: boolean
}

export type TrialOptions = Parameters<typeof TrialRouteInternal.trialRunModule>[1]
export type TrialReport = VerificationControlPlaneReport
export interface CheckOptions {
  readonly runId?: string
  readonly includeStaticIr?: boolean
  readonly sourceArtifacts?: ReadonlyArray<{
    readonly sourceRef: string
    readonly digest: string
    readonly producer: 'source' | 'package' | 'typecheck' | 'cli-source'
    readonly artifactRef?: string
  }>
  readonly budgets?: {
    readonly manifest?: {
      readonly maxBytes?: number
    }
  }
}
export type CheckReport = VerificationControlPlaneReport

type HostSchedulerCancel = () => void

type HostScheduler = {
  readonly nowMs: () => number
  readonly scheduleMicrotask: (cb: () => void) => void
  readonly scheduleMacrotask: (cb: () => void) => HostSchedulerCancel
  readonly scheduleAnimationFrame: (cb: () => void) => HostSchedulerCancel
  readonly scheduleTimeout: (ms: number, cb: () => void) => HostSchedulerCancel
}

const resolveRootBlueprint = <Sh extends AnyModuleShape>(
  root: ProgramRuntimeBlueprint<any, Sh, any> | AnyProgram,
): ProgramRuntimeBlueprint<any, Sh, any> =>
  (isProgram(root)
    ? getProgramRuntimeBlueprint<Sh>(root)
    : (root as any)?._tag === 'ProgramRuntimeBlueprint'
    ? (root as ProgramRuntimeBlueprint<any, Sh, any>)
    : (() => {
        throw new Error('[Logix] Runtime expected a Program.')
      })()) satisfies ProgramRuntimeBlueprint<any, Sh, any>

const toTrialArtifactRefs = (
  artifacts: Record<string, { readonly digest?: string; readonly error?: { readonly code?: string } }> | undefined,
): ReadonlyArray<VerificationControlPlaneArtifactRef> =>
  artifacts
    ? Object.keys(artifacts)
        .sort((a, b) => a.localeCompare(b))
        .map((artifactKey) => {
          const artifact = artifacts[artifactKey]!
          return {
            outputKey: artifactKey,
            kind: 'TrialRunArtifact',
            ...(artifact.digest ? { digest: artifact.digest } : null),
            ...(artifact.error?.code ? { reasonCodes: [artifact.error.code] } : null),
          }
        })
    : []

const toTrialSummary = (report: {
  readonly ok: boolean
  readonly summary?: unknown
  readonly error?: { readonly message: string }
}): string => {
  const closeSummary = extractCloseSummary(report.summary)
  if (typeof report.summary === 'string' && report.summary.length > 0) {
    return closeSummary ? `${report.summary}; close: ${closeSummary}` : report.summary
  }
  if (report.error?.message) return report.error.message
  return report.ok ? 'runtime.trial passed' : 'runtime.trial failed'
}

const extractCloseSummary = (summary: unknown): string | null => {
  if (!isPlainRecord(summary)) return null
  const logix = summary.__logix
  if (!isPlainRecord(logix)) return null
  const closeError = logix.closeError
  if (!isPlainRecord(closeError)) return null
  const message = closeError.message
  return typeof message === 'string' && message.length > 0 ? message : null
}

const extractMissingProgramImports = (
  environment: unknown,
): ReadonlyArray<{
  readonly tokenId: string
  readonly from?: string
  readonly entrypoint?: string
}> => {
  if (!isPlainRecord(environment)) return []
  const value = environment.missingProgramImports
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isPlainRecord(item) || typeof item.tokenId !== 'string' || item.tokenId.length === 0) return []
    return [
      {
        tokenId: item.tokenId,
        ...(typeof item.from === 'string' && item.from.length > 0 ? { from: item.from } : null),
        ...(typeof item.entrypoint === 'string' && item.entrypoint.length > 0 ? { entrypoint: item.entrypoint } : null),
      },
    ]
  })
}

const stringArrayFromEnvironment = (environment: unknown, key: string): ReadonlyArray<string> => {
  if (!isPlainRecord(environment)) return []
  const value = environment[key]
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))).sort()
}

const toDependencyCauses = (report: {
  readonly environment?: unknown
  readonly error?: { readonly code?: string }
}): ReadonlyArray<VerificationDependencyCause> => {
  const errorCode = report.error?.code ?? 'RUNTIME_TRIAL_FAILED'
  const services = stringArrayFromEnvironment(report.environment, 'missingServices')
  const configs = stringArrayFromEnvironment(report.environment, 'missingConfigKeys')
  const programImports = extractMissingProgramImports(report.environment)
  const moduleServicePrefix = '@logixjs/Module/'

  return [
    ...services.map((serviceId) => ({
      kind: serviceId.startsWith(moduleServicePrefix) ? ('program-import' as const) : ('service' as const),
      phase: 'startup-boot' as const,
      ownerCoordinate: serviceId.startsWith(moduleServicePrefix)
        ? `Program.capabilities.imports:${serviceId.slice(moduleServicePrefix.length)}`
        : `service:${serviceId}`,
      providerSource: serviceId.startsWith(moduleServicePrefix) ? ('program-capabilities' as const) : ('runtime-overlay' as const),
      ...(serviceId.startsWith(moduleServicePrefix) ? { childIdentity: serviceId.slice(moduleServicePrefix.length) } : null),
      focusRef: {
        declSliceId: serviceId.startsWith(moduleServicePrefix)
          ? `Program.capabilities.imports:${serviceId.slice(moduleServicePrefix.length)}`
          : `service:${serviceId}`,
      },
      errorCode,
    })),
    ...configs.map((configKey) => ({
      kind: 'config' as const,
      phase: 'startup-boot' as const,
      ownerCoordinate: `config:${configKey}`,
      providerSource: 'runtime-overlay' as const,
      focusRef: { declSliceId: `config:${configKey}` },
      errorCode,
    })),
    ...programImports.map((item) => ({
      kind: 'program-import' as const,
      phase: 'startup-boot' as const,
      ownerCoordinate: `Program.capabilities.imports:${item.tokenId}`,
      providerSource: 'program-capabilities' as const,
      childIdentity: item.tokenId,
      focusRef: { declSliceId: `Program.capabilities.imports:${item.tokenId}` },
      errorCode,
    })),
  ]
}

const toLifecycleSummary = (report: {
  readonly ok: boolean
  readonly summary?: unknown
  readonly error?: { readonly code?: string; readonly message: string }
  readonly artifacts?: Record<string, unknown>
}): VerificationLifecycleSummary | undefined => {
  const closeFromSummary = extractCloseSummary(report.summary)
  const closeOnly = !report.ok && closeFromSummary === null && report.error?.code === 'DisposeTimeout'
  const primaryFailure = report.ok || closeOnly ? null : report.error?.message ?? 'runtime.trial failed'
  const closeSummary = closeOnly ? report.error?.message ?? 'runtime.trial close failed' : closeFromSummary
  if (primaryFailure === null && closeSummary === null) return undefined
  const artifactOutputKeys = Object.keys(report.artifacts ?? {}).sort()
  return {
    primaryFailure,
    closeSummary,
    artifactOutputKeys,
    phase: closeSummary ? 'startup-close' : 'startup-boot',
  }
}

const dependencyRepairHint = (cause: VerificationDependencyCause): VerificationControlPlaneRepairHint => ({
  code: cause.errorCode,
  canAutoRetry: false,
  upgradeToStage: 'trial',
  focusRef: cause.focusRef,
  reason: `${cause.kind} dependency missing at ${cause.ownerCoordinate}`,
  suggestedAction:
    cause.kind === 'program-import'
      ? 'provide the child Program through Program.capabilities.imports and rerun runtime.trial'
      : 'provide the missing dependency through the appropriate runtime capability and rerun runtime.trial',
})

const toTrialRepairHints = (report: {
  readonly ok: boolean
  readonly environment?: unknown
  readonly error?: { readonly code?: string; readonly message: string; readonly hint?: string }
}): ReadonlyArray<VerificationControlPlaneRepairHint> =>
  report.ok
    ? []
    : toDependencyCauses(report).length > 0
    ? toDependencyCauses(report).map(dependencyRepairHint)
    : [
        {
          code: report.error?.code ?? 'RUNTIME_TRIAL_FAILED',
          canAutoRetry: false,
          upgradeToStage: 'trial',
          focusRef: null,
          ...(report.error?.message ? { reason: report.error.message } : null),
          ...(report.error?.hint ? { suggestedAction: report.error.hint } : null),
        },
      ]

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toTrialEnvironment = (report: {
  readonly runId: string
  readonly environment?: unknown
}): Record<string, unknown> => ({
  ...(isPlainRecord(report.environment) ? report.environment : {}),
  runId: report.runId,
})

const toCheckFinding = (finding: {
  readonly kind: VerificationControlPlaneFinding['kind']
  readonly code: string
  readonly ownerCoordinate: string
  readonly summary: string
  readonly focusRef?: VerificationControlPlaneFinding['focusRef']
  readonly sourceArtifactRef?: VerificationControlPlaneFinding['sourceArtifactRef']
}): VerificationControlPlaneFinding => ({
  kind: finding.kind,
  code: finding.code,
  ownerCoordinate: finding.ownerCoordinate,
  summary: finding.summary,
  ...(finding.focusRef ? { focusRef: finding.focusRef } : null),
  ...(finding.sourceArtifactRef ? { sourceArtifactRef: finding.sourceArtifactRef } : null),
})

const toCheckRepairHint = (finding: VerificationControlPlaneFinding): VerificationControlPlaneRepairHint => ({
  code: finding.code,
  canAutoRetry: false,
  upgradeToStage: 'check',
  focusRef: finding.focusRef ?? null,
  reason: finding.summary,
  suggestedAction: 'repair the Program declaration and rerun runtime.check',
})

const makeStaticFailureReport = (args: {
  readonly runId: string | undefined
  readonly findings: ReadonlyArray<VerificationControlPlaneFinding>
  readonly declarationDigest: string
}): CheckReport =>
  makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage: 'check',
    mode: 'static',
    verdict: 'FAIL',
    errorCode: args.findings[0]?.code ?? 'CHECK_STATIC_FAILED',
    summary: 'runtime.check found static assembly issues',
    environment: {
      runId: args.runId ?? 'runtime.check',
      host: 'static',
      declarationDigest: args.declarationDigest,
    },
    artifacts: [],
    repairHints: args.findings.map(toCheckRepairHint),
    findings: args.findings,
    nextRecommendedStage: 'check',
  })

const makeSelectorQualityArtifactRef = (
  stage: 'static' | 'startup',
  digestInput: unknown,
): VerificationControlPlaneArtifactRef => ({
  outputKey: `selector-quality:${stage}`,
  kind: 'SelectorQualityArtifact',
  digest: `selector-quality:${stage}:${fnv1a32(stableStringify(digestInput))}`,
})

export const check = <Sh extends AnyModuleShape>(
  root: AnyProgram,
  options?: CheckOptions,
): Effect.Effect<CheckReport, never, never> =>
  Effect.sync(() => {
    if (!isProgram(root) || !hasProgramRuntimeBlueprint(root)) {
      return makeStaticFailureReport({
        runId: options?.runId,
        findings: [toCheckFinding(makeMissingBlueprintFinding())],
        declarationDigest: 'decl:none',
      })
    }

    const rootBlueprint = resolveRootBlueprint(root)
    const artifact = extractRuntimeStaticCheckArtifact(rootBlueprint, {
      includeStaticIr: options?.includeStaticIr ?? true,
      maxManifestBytes: options?.budgets?.manifest?.maxBytes ?? 200_000,
      owner: root,
      sourceArtifacts: options?.sourceArtifacts,
    })
    const findings = artifact.findings.map(toCheckFinding)
    const failed = findings.length > 0

    return makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: failed ? 'FAIL' : 'PASS',
      errorCode: failed ? findings[0]!.code : null,
      summary: failed ? 'runtime.check found static assembly issues' : 'runtime.check passed',
      environment: {
        runId: options?.runId ?? 'runtime.check',
        host: 'static',
        declarationDigest: artifact.manifestDigest,
      },
      artifacts: [
        {
          outputKey: 'module-manifest',
          kind: 'ModuleManifest',
          digest: artifact.manifestDigest,
        },
        makeSelectorQualityArtifactRef('static', {
          declarationDigest: artifact.manifestDigest,
          stage: 'check',
          mode: 'static',
        }),
      ],
      repairHints: findings.map(toCheckRepairHint),
      findings: [
        ...findings,
        ...(!failed
          ? [
              {
                kind: 'pass-boundary',
                code: 'CHECK_STAGE_PASS_ONLY',
                ownerCoordinate: 'runtime.check',
                summary: 'PASS covers only the check stage.',
              } satisfies VerificationControlPlaneFinding,
            ]
          : []),
      ],
      nextRecommendedStage: failed ? 'check' : 'trial',
    })
  })

/**
 * Runtime-level StateTransaction defaults.
 *
 * Applied as the `runtime_default` baseline; modules and providers may override.
 */
export interface RuntimeStateTransactionOptions {
  readonly instrumentation?: StateTransactionInstrumentation
  readonly fieldConvergeBudgetMs?: number
  readonly fieldConvergeDecisionBudgetMs?: number
  readonly fieldConvergeMode?: 'auto' | 'full' | 'dirty'
  readonly fieldConvergeTimeSlicing?: FieldConvergeTimeSlicingPatch
  /** Txn lanes configuration at the `runtime_default` baseline (enabled by default). */
  readonly txnLanes?: TxnLanesPatch
  readonly fieldConvergeOverridesByModuleId?: Readonly<Record<string, StateTransactionFieldConvergeOverrides>>
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
   * `Program.make(Module, { stateTransaction })`.
   */
  readonly stateTransaction?: RuntimeStateTransactionOptions
  /**
   * Runtime-level unified scheduling policy surface.
   *
   * Converges queue/tick/concurrency knobs into one policy contract (default limit=16 with bounded fallback).
   */
  readonly schedulingPolicy?: SchedulingPolicySurface
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
   * Field converge diagnostics sampling config.
   *
   * Forwarded to `Debug.devtoolsHubLayer({ fieldConvergeDiagnosticsSampling })`.
   */
  readonly fieldConvergeDiagnosticsSampling?: Debug.FieldConvergeDiagnosticsSamplingConfig
  /** DebugObserver config for `trace:effectop`; undefined means full observation. */
  readonly observer?: Middleware.DebugObserverConfig | false
  readonly traceMode?: Debug.TraceMode
  /** Reserved: React render sampling / throttling config (consumed by `@logixjs/react`). */
  readonly sampling?: {
    readonly reactRenderSampleRate?: number
  }
}

/**
 * Construct an application runtime from a root module.
 *
 * - Uses the root module + layer as the composition root.
 * - Public Runtime assembly no longer installs orchestration slots from the root program.
 * - Exposes a ManagedRuntime; the full Env is provided by `root.layer + options.layer`.
 */
const makeFromBlueprint = (
  rootBlueprint: ProgramRuntimeBlueprint<any, AnyModuleShape, any>,
  options?: RuntimeOptions,
): ManagedRuntime.ManagedRuntime<any, never> => {
  const schedulingPolicy = options?.schedulingPolicy

  warnInvalidSchedulingPolicySurfaceDevOnly(options?.schedulingPolicy, 'Runtime.make options.schedulingPolicy')
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
  // so runtime code (e.g. FieldKernel.install) can resolve the unified EffectOp bus configuration from Env.
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
        traceMode: devtoolsOptions?.traceMode ?? 'on',
        fieldConvergeDiagnosticsSampling: devtoolsOptions?.fieldConvergeDiagnosticsSampling,
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
    modules: [AppRuntimeImpl.provide(rootBlueprint.module, rootBlueprint.layer as Layer.Layer<any, any, any>)],
    processes: [],
    onError: options?.onError,
    hostScheduler: options?.hostScheduler,
    stateTransaction: options?.stateTransaction,
    schedulingPolicy,
    readQueryStrictGate,
  }

  const app = AppRuntimeImpl.makeApp(appConfig)
  return app.makeRuntime() as ManagedRuntime.ManagedRuntime<any, never>
}

export const make = (
  root: AnyProgram,
  options?: RuntimeOptions,
): ManagedRuntime.ManagedRuntime<any, never> => {
  // Runtime.make consumes Program output; public assembly rules stay in Program.make.
  return makeFromBlueprint(resolveRootBlueprint(root), options)
}

export const trial = <Sh extends AnyModuleShape>(
  root: AnyProgram,
  options?: TrialOptions,
): Effect.Effect<TrialReport, never, never> =>
  TrialRouteInternal.trialRunModule(root as any, options).pipe(
    Effect.map((report) => {
      const dependencyCauses = toDependencyCauses(report)
      const artifacts = [
        ...toTrialArtifactRefs(report.artifacts as any),
        makeSelectorQualityArtifactRef('startup', {
          stage: 'trial',
          mode: 'startup',
          runId: report.runId,
          ok: report.ok,
          environment: report.environment,
        }),
      ]
      const lifecycle = toLifecycleSummary(report as any)

      return makeVerificationControlPlaneReport({
        kind: 'VerificationControlPlaneReport',
        stage: 'trial',
        mode: 'startup',
        verdict: report.ok ? 'PASS' : 'FAIL',
        errorCode: report.error?.code ?? null,
        summary: toTrialSummary(report),
        environment: toTrialEnvironment(report) as any,
        artifacts,
        repairHints: toTrialRepairHints(report),
        dependencyCauses,
        findings: dependencyCauses.map((cause) => ({
          kind: 'dependency',
          code: cause.errorCode,
          ownerCoordinate: cause.ownerCoordinate,
          summary: `${cause.kind} dependency missing during ${cause.phase}`,
          ...(cause.focusRef ? { focusRef: cause.focusRef } : null),
        })),
        ...(lifecycle ? { lifecycle } : null),
        nextRecommendedStage: report.ok ? null : 'trial',
      })
    }),
  )
// Canonical verification route: `trialRunModuleInternal` is the route adapter.
// Shared execution wiring lives in `internal/verification/proofKernel.ts`.

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
  root: AnyProgram,
  options?: OpenProgramOptions,
): Effect.Effect<ProgramRunContext<Sh>, unknown, Scope.Scope> =>
  ProgramRunner.openProgram(
    (rootBlueprint, runtimeOptions) => makeFromBlueprint(rootBlueprint, runtimeOptions as RuntimeOptions),
    resolveRootBlueprint(root),
    options,
  )

/**
 * One-shot entry: boot → main(ctx,args) → dispose.
 */
export const run = async <Sh extends AnyModuleShape, Args, A, E, R>(
  root: AnyProgram,
  main: (ctx: ProgramRunContext<Sh>, args: Args) => Effect.Effect<A, E, R>,
  options?: RunOptions<Args>,
): Promise<A> =>
  ProgramRunner.run(
    (rootBlueprint, runtimeOptions) => makeFromBlueprint(rootBlueprint, runtimeOptions as RuntimeOptions),
    resolveRootBlueprint(root),
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
 * Hot-switch field converge overrides for a moduleId.
 *
 * This mutates the `runtime_module` patch map only; provider overrides still take precedence.
 */
export const setFieldConvergeOverride = (
  runtime: ManagedRuntime.ManagedRuntime<any, never>,
  moduleId: string,
  overrides: StateTransactionFieldConvergeOverrides | undefined,
): Effect.Effect<void, never, never> => {
  warnInvalidStateTransactionFieldConvergeOverridesDevOnly(overrides, `Runtime.setFieldConvergeOverride(${moduleId})`)

  return Effect.map(runtime.servicesEffect, (services) => {
    const runtimeConfigOpt = ServiceMap.getOption(services, StateTransactionConfigTag as any)
    if (Option.isNone(runtimeConfigOpt)) {
      return
    }

    // NOTE: runtime config lives in Env as a Service; hot-switch by replacing the per-module patch map.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtimeConfig: any = runtimeConfigOpt.value
    const next = {
      ...(runtimeConfig.fieldConvergeOverridesByModuleId ?? {}),
    }

    if (overrides) {
      next[moduleId] = overrides
    } else {
      delete next[moduleId]
    }

    runtimeConfig.fieldConvergeOverridesByModuleId = next
  }) as Effect.Effect<void, never, never>
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
): Effect.Effect<void, never, never> => {
  warnInvalidSchedulingPolicySurfacePatchDevOnly(patch, `Runtime.setSchedulingPolicyOverride(${moduleId})`)

  return Effect.map(runtime.servicesEffect, (services) => {
    const runtimeConfigOpt = ServiceMap.getOption(services, SchedulingPolicySurfaceTag as any)
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
  }) as Effect.Effect<void, never, never>
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
