import { Cause, Effect, Exit, Layer, Option } from 'effect'
import type { ManagedRuntime } from 'effect'
import type { AnyModuleShape, ProgramRuntimeBlueprint } from '../runtime/core/module.js'
import { getProgramRuntimeBlueprint, isProgram, type AnyProgram } from '../program.js'
import * as BuildEnv from '../platform/BuildEnv.js'
import type { EvidencePackage, EvidencePackageSource } from '../verification/evidence.js'
import { withProofKernelContext } from '../verification/proofKernel.js'
import type { DiagnosticsLevel } from '../runtime/core/DebugSink.js'
import type { RunId } from '../verification/runSession.js'
import type { KernelImplementationRef } from '../runtime/core/KernelRef.js'
import * as KernelRef from '../runtime/core/KernelRef.js'
import * as RuntimeKernel from '../runtime/core/RuntimeKernel.js'
import type { ConvergeStaticIrCollector } from '../runtime/core/ConvergeStaticIrCollector.js'
import { appendConvergeStaticIrCollectors } from '../runtime/core/ConvergeStaticIrCollector.js'
import type { SerializableErrorSummary } from '../runtime/core/errorSummary.js'
import { makeProgramRunnerKernel } from '../runtime/core/runner/ProgramRunner.kernel.js'
import { extractManifest, type ModuleManifest } from '../reflection/manifest.js'
import { exportStaticIr } from '../reflection/staticIr.js'
import * as AppRuntimeImpl from '../runtime/AppRuntime.js'
import { collectTrialRunArtifacts } from './artifacts/collect.js'
import type { TrialRunArtifacts } from './artifacts/model.js'
import { getTrialRunArtifactExporters } from './artifacts/registry.js'
import {
  collectTrialRunReExport,
  reExportTrialRunReport,
  type TrialRunReportBudgets as TrialRunReExportBudgets,
} from './trialRunReportPipeline.js'
import {
  awaitFiberExitWithTimeout,
  isTimeoutLikeError,
  toCloseErrorSummary,
  toErrorSummaryWithCode,
} from './trialRunErrors.js'
import {
  buildEnvironmentIr,
  parseMissingDependencyFromCause,
  type EnvironmentIr,
} from './trialRunEnvironment.js'

type RootLike<Sh extends AnyModuleShape> = ProgramRuntimeBlueprint<any, Sh, any> | AnyProgram

export interface TrialRunReportBudgets extends TrialRunReExportBudgets {}

export interface TrialRunReport {
  readonly runId: string
  readonly ok: boolean
  readonly manifest?: ModuleManifest
  readonly staticIr?: ReturnType<typeof exportStaticIr>
  readonly artifacts?: TrialRunArtifacts
  readonly environment?: EnvironmentIr
  readonly evidence?: EvidencePackage
  readonly summary?: unknown
  readonly error?: SerializableErrorSummary
}
export type { EnvironmentIr } from './trialRunEnvironment.js'

export interface TrialRunModuleOptions {
  readonly runId?: RunId
  readonly source?: EvidencePackageSource
  readonly startedAt?: number
  readonly diagnosticsLevel?: DiagnosticsLevel
  readonly maxEvents?: number
  readonly layer?: Layer.Layer<any, any, any>
  readonly buildEnv?: {
    readonly config?: Record<string, BuildEnv.BuildEnvConfigValue | undefined>
    readonly hostKind?: BuildEnv.BuildEnvOptions['runtimeHostKind']
    readonly configProvider?: BuildEnv.BuildEnvOptions['configProvider']
  }
  readonly trialRunTimeoutMs?: number
  readonly closeScopeTimeout?: number
  readonly budgets?: TrialRunReportBudgets
}

interface TrialRunModuleExecution {
  readonly ok: boolean
  readonly error?: SerializableErrorSummary
  readonly summary?: unknown
  readonly environment: EnvironmentIr
}

const defaultHost = (): string => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'browser'
  return 'node'
}

const resolveRootBlueprint = <Sh extends AnyModuleShape>(root: RootLike<Sh>): ProgramRuntimeBlueprint<any, Sh, any> =>
  (isProgram(root)
    ? getProgramRuntimeBlueprint<Sh>(root)
    : (root as any)?._tag === 'ProgramRuntimeBlueprint'
    ? (root as ProgramRuntimeBlueprint<any, Sh, any>)
    : (() => {
        throw new Error('[Logix] runtime.trial expected a Program.')
      })()) satisfies ProgramRuntimeBlueprint<any, Sh, any>

const makeInternalRuntime = <Sh extends AnyModuleShape>(
  rootBlueprint: ProgramRuntimeBlueprint<any, Sh, any>,
  layer: Layer.Layer<any, never, never>,
): ManagedRuntime.ManagedRuntime<any, never> => {
  const app = AppRuntimeImpl.makeApp({
    layer,
    modules: [AppRuntimeImpl.provide(rootBlueprint.module, rootBlueprint.layer as Layer.Layer<any, any, any>)],
    processes: [],
  })
  return app.makeRuntime()
}

export const trialRunModule = <Sh extends AnyModuleShape>(
  root: RootLike<Sh>,
  options?: TrialRunModuleOptions,
): Effect.Effect<TrialRunReport, never, never> =>
  (Effect.gen(function* () {
    const rootBlueprint = resolveRootBlueprint(root)
    const resolvedDiagnosticsLevel = options?.diagnosticsLevel ?? 'light'

    const buildEnvConfig = options?.buildEnv?.config
    const buildEnvLayer = BuildEnv.layer({
      runtimeHostKind: options?.buildEnv?.hostKind,
      config: buildEnvConfig,
      configProvider: options?.buildEnv?.configProvider,
    })

    const moduleIdFromRoot =
      typeof (rootBlueprint.module as any)?.id === 'string' && (rootBlueprint.module as any).id.length > 0
        ? String((rootBlueprint.module as any).id)
        : undefined

    const proofLayer = Layer.mergeAll(
      buildEnvLayer,
      options?.layer ?? (Layer.empty as unknown as Layer.Layer<any, any, any>),
    ) as Layer.Layer<any, any, any>

    const proofResult = yield* withProofKernelContext(
      {
        runId: options?.runId,
        source: options?.source ?? { host: defaultHost(), label: 'trial-run-module' },
        startedAt: options?.startedAt,
        timeoutMs: options?.trialRunTimeoutMs,
        diagnosticsLevel: resolvedDiagnosticsLevel,
        maxEvents: options?.maxEvents,
        layer: proofLayer,
      },
      ({ collector, layer }) =>
        Effect.gen(function* () {
          const convergeCollector: ConvergeStaticIrCollector = {
            register: (ir) => {
              collector.registerConvergeStaticIr(ir)
            },
          }

          const trialLayer = Layer.mergeAll(
            layer,
            appendConvergeStaticIrCollectors([convergeCollector]),
          ) as Layer.Layer<any, never, any>

          const kernel = yield* makeProgramRunnerKernel(
            (blueprint: ProgramRuntimeBlueprint<any, AnyModuleShape, any>) =>
              makeInternalRuntime(blueprint, trialLayer as any),
            rootBlueprint,
          )

          const bootFiber = kernel.runtime.runFork(Effect.service(rootBlueprint.module as any).pipe(Effect.orDie))
          const bootExit = yield* awaitFiberExitWithTimeout(bootFiber, options?.trialRunTimeoutMs)

          let kernelImplementationRef: KernelImplementationRef | undefined
          let runtimeServicesEvidence: RuntimeKernel.RuntimeServicesEvidence | undefined
          let instanceId: string | undefined

          if (Exit.isSuccess(bootExit)) {
            const moduleRuntime = bootExit.value as any
            instanceId =
              typeof moduleRuntime?.instanceId === 'string' && moduleRuntime.instanceId.length > 0
                ? moduleRuntime.instanceId
                : undefined
            kernel.setInstanceId(instanceId)

            try {
              kernelImplementationRef = KernelRef.getKernelImplementationRef(moduleRuntime)
            } catch {
              kernelImplementationRef = undefined
            }

            if (kernelImplementationRef != null) {
              collector.setKernelImplementationRef(kernelImplementationRef)
            }

            if (resolvedDiagnosticsLevel !== 'off') {
              try {
                runtimeServicesEvidence = RuntimeKernel.getRuntimeServicesEvidence(moduleRuntime)
              } catch {
                runtimeServicesEvidence = undefined
              }
            }

            if (runtimeServicesEvidence != null) {
              collector.setRuntimeServicesEvidence(runtimeServicesEvidence)
            }
          } else {
            const failure = Cause.findErrorOption(bootExit.cause)
            if (Option.isSome(failure)) {
              const err: any = failure.value
              const instanceIdFromErr = typeof err?.instanceId === 'string' ? err.instanceId : undefined
              if (instanceIdFromErr && instanceIdFromErr.length > 0) {
                kernel.setInstanceId(instanceIdFromErr)
              }
            }
          }

          const closeExit = yield* Effect.exit(
            kernel.close({
              timeoutMs:
                typeof options?.closeScopeTimeout === 'number' &&
                Number.isFinite(options.closeScopeTimeout) &&
                options.closeScopeTimeout > 0
                  ? options.closeScopeTimeout
                  : 1000,
            }),
          )

          let ok = Exit.isSuccess(bootExit) && Exit.isSuccess(closeExit)
          let error: SerializableErrorSummary | undefined
          let summary: unknown | undefined

          const depsFromBootFailure = Exit.isFailure(bootExit)
            ? parseMissingDependencyFromCause(bootExit.cause as Cause.Cause<unknown>)
            : { missingServices: [], missingConfigKeys: [], missingProgramImports: [] }

          const missingServices = depsFromBootFailure.missingServices
          const missingConfigKeys = depsFromBootFailure.missingConfigKeys
          const missingProgramImports = depsFromBootFailure.missingProgramImports

          if (!Exit.isSuccess(bootExit)) {
            const failure = Option.getOrUndefined(Cause.findErrorOption(bootExit.cause))
            const defect = bootExit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)[0]
            const base = failure ?? defect ?? bootExit.cause

            if (missingServices.length > 0 || missingConfigKeys.length > 0 || missingProgramImports.length > 0) {
              ok = false
              error = toErrorSummaryWithCode(
                base,
                'MissingDependency',
                missingProgramImports.length > 0
                  ? 'Build-time missing Program import: provide the child Program via Program.capabilities.imports.'
                  : missingServices.length > 0
                  ? 'Build-time missing service: provide a Layer mock/implementation via options.layer, or move the dependency access to runtime.'
                  : 'Build-time missing config: provide the missing key(s) in buildEnv.config, or add a default value to Config.',
              )
            } else if (isTimeoutLikeError(base)) {
              ok = false
              error = toErrorSummaryWithCode(
                base,
                'TrialRunTimeout',
                'Trial run timed out: check for Layer/assembly phase blocking (Effect.never / unfinished acquire).',
              )
            } else {
              ok = false
              error = toErrorSummaryWithCode(base, 'RuntimeFailure')
            }
          }

          if (Exit.isFailure(closeExit)) {
            const died = closeExit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)[0]
            const failure = Option.getOrUndefined(Cause.findErrorOption(closeExit.cause))
            const base = died ?? failure ?? closeExit.cause

            const closeErrorSummary = toCloseErrorSummary(base)

            ok = false
            if (!error) {
              error = closeErrorSummary
            } else {
              summary = { __logix: { closeError: closeErrorSummary } }
            }
          }

          const environment = buildEnvironmentIr({
            kernelImplementationRef,
            runtimeServicesEvidence,
            buildEnvConfig,
            missingServices,
            missingConfigKeys,
            missingProgramImports,
          })

          return { ok, error, summary, environment } satisfies TrialRunModuleExecution
        }).pipe(
          Effect.catchCause((cause: Cause.Cause<unknown>) =>
            Effect.succeed({
              ok: false,
              error: toErrorSummaryWithCode(cause, 'RuntimeFailure'),
              summary: undefined,
              environment: buildEnvironmentIr({
                buildEnvConfig,
              }),
            } satisfies TrialRunModuleExecution),
          ),
        ),
    )

    const proofValue: TrialRunModuleExecution = Exit.isSuccess(proofResult.exit)
      ? proofResult.exit.value
      : {
          ok: false,
          error: isTimeoutLikeError(proofResult.error)
            ? toErrorSummaryWithCode(
                proofResult.error ?? new Error('proof kernel failed'),
                'TrialRunTimeout',
                'Trial run timed out: check for Layer/assembly phase blocking (Effect.never / unfinished acquire).',
              )
            : toErrorSummaryWithCode(proofResult.error ?? new Error('proof kernel failed'), 'RuntimeFailure'),
          summary: undefined,
          environment: buildEnvironmentIr({ buildEnvConfig }),
        }

    const reExportCollection = yield* Effect.promise(async () =>
      collectTrialRunReExport({
        collectEvidence: () => proofResult.evidence,
        collectManifest: () =>
          extractManifest(root as any, {
            includeStaticIr: true,
            budgets: { maxBytes: 200_000 },
          }),
        collectStaticIr: () => exportStaticIr(root as any),
        collectArtifacts: ({ manifest, staticIr }) =>
          collectTrialRunArtifacts({
            exporters: getTrialRunArtifactExporters(rootBlueprint.module as any),
            ctx: {
              moduleId: moduleIdFromRoot ?? manifest?.moduleId ?? 'unknown',
              manifest,
              staticIr: staticIr as any,
              environment: proofValue.environment,
            },
          }),
      }),
    )

    const report = reExportTrialRunReport({
      base: {
        runId: proofResult.session.runId,
        ok: proofValue.ok,
        environment: proofValue.environment,
        summary: proofValue.summary,
        error: proofValue.error,
      },
      collection: reExportCollection,
      maxEvents: options?.maxEvents ?? 1000,
      budgets: options?.budgets,
    })

    return report satisfies TrialRunReport
  }) as Effect.Effect<TrialRunReport, never, never>)
