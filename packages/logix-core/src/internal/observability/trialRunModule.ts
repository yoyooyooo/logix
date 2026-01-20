import { Cause, Effect, Exit, Fiber, Layer, Option } from 'effect'
import type { AnyModuleShape, ModuleImpl } from '../runtime/core/module.js'
import * as BuildEnv from '../platform/BuildEnv.js'
import type { EvidencePackage, EvidencePackageSource } from './evidence.js'
import { makeEvidenceCollector, evidenceCollectorLayer } from './evidenceCollector.js'
import { makeRunSession, runSessionLayer, type RunId } from './runSession.js'
import {
  appendSinks,
  diagnosticsLevel,
  type DiagnosticsLevel,
  type Sink as DebugSink,
} from '../runtime/core/DebugSink.js'
import type { KernelImplementationRef } from '../runtime/core/KernelRef.js'
import * as KernelRef from '../runtime/core/KernelRef.js'
import * as RuntimeKernel from '../runtime/core/RuntimeKernel.js'
import type { ConvergeStaticIrCollector } from '../runtime/core/ConvergeStaticIrCollector.js'
import { appendConvergeStaticIrCollectors } from '../runtime/core/ConvergeStaticIrCollector.js'
import type { SerializableErrorSummary } from '../runtime/core/errorSummary.js'
import { toSerializableErrorSummary } from '../runtime/core/errorSummary.js'
import { makeProgramRunnerKernel } from '../runtime/ProgramRunner.kernel.js'
import { extractManifest, type ModuleManifest } from '../reflection/manifest.js'
import { exportStaticIr } from '../reflection/staticIr.js'
import * as Runtime from '../runtime/Runtime.js'
import { collectTrialRunArtifacts } from './artifacts/collect.js'
import type { TrialRunArtifacts } from './artifacts/model.js'
import { getTrialRunArtifactExporters } from './artifacts/registry.js'

type RootLike<Sh extends AnyModuleShape> = ModuleImpl<any, Sh, any> | { readonly impl: ModuleImpl<any, Sh, any> }

export interface TrialRunReportBudgets {
  readonly maxBytes?: number
}

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

export interface EnvironmentIr {
  readonly tagIds: ReadonlyArray<string>
  readonly configKeys: ReadonlyArray<string>
  readonly missingServices: ReadonlyArray<string>
  readonly missingConfigKeys: ReadonlyArray<string>
  readonly kernelImplementationRef?: KernelImplementationRef
  readonly runtimeServicesEvidence?: RuntimeKernel.RuntimeServicesEvidence
  readonly notes?: unknown
}

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

const defaultHost = (): string => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'browser'
  return 'node'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const resolveRootImpl = <Sh extends AnyModuleShape>(root: RootLike<Sh>): ModuleImpl<any, Sh, any> =>
  ((root as any)?._tag === 'ModuleImpl'
    ? (root as ModuleImpl<any, Sh, any>)
    : ((root as any)?.impl as ModuleImpl<any, Sh, any>)) satisfies ModuleImpl<any, Sh, any>

const utf8ByteLength = (value: unknown): number => {
  const json = JSON.stringify(value)
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length
  }
  return json.length
}

const parseMissingConfigKeys = (message: string): ReadonlyArray<string> => {
  const out: string[] = []

  // Effect Config error messages vary; keep parsing conservative and deterministic.
  const patterns: ReadonlyArray<RegExp> = [
    /\bMissing (?:data|value) for (?:key|path) "?([A-Z0-9_./:-]+)"?/g,
    /\bMissing (?:data|value) at ([A-Z0-9_./:-]+)\b/g,
    /\bMissing configuration:? "?([A-Z0-9_./:-]+)"?/g,
    /\bConfig\b.*\bmissing\b.*"?([A-Z0-9_./:-]+)"?/gi,
  ]

  for (const re of patterns) {
    let match: RegExpExecArray | null
    while ((match = re.exec(message))) {
      const key = match[1]
      if (typeof key === 'string' && key.length > 0) out.push(key)
    }
  }

  return Array.from(new Set(out)).sort()
}

const parseMissingServiceIds = (message: string): ReadonlyArray<string> => {
  const out: string[] = []
  const re = /Service not found: ([^\s(]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(message))) {
    const id = match[1]?.replace(/[,:.;]+$/, '')
    if (typeof id === 'string' && id.length > 0) out.push(id)
  }
  return Array.from(new Set(out)).sort()
}

const parseMissingDependencyFromCause = (
  cause: Cause.Cause<unknown>,
): {
  readonly missingServices: ReadonlyArray<string>
  readonly missingConfigKeys: ReadonlyArray<string>
} => {
  const missingServices: string[] = []
  const missingConfigKeys: string[] = []

  const candidates = [...Array.from(Cause.failures(cause)), ...Array.from(Cause.defects(cause))]

  for (const candidate of candidates) {
    if (isRecord(candidate) && (candidate as any)._tag === 'ConstructionGuardError') {
      const missingService = (candidate as any).missingService
      if (typeof missingService === 'string' && missingService.length > 0) {
        missingServices.push(missingService)
      }
    }

    if (
      isRecord(candidate) &&
      (candidate as any)._tag === 'ConfigError' &&
      (candidate as any)._op === 'MissingData' &&
      Array.isArray((candidate as any).path) &&
      (candidate as any).path.every((k: unknown) => typeof k === 'string' && k.length > 0)
    ) {
      const key = (candidate as any).path.join('.')
      if (key.length > 0) missingConfigKeys.push(key)
    }
  }

  const messages: string[] = []
  for (const candidate of candidates) {
    if (candidate instanceof Error) {
      messages.push(candidate.message)
      continue
    }
    if (typeof candidate === 'string') {
      messages.push(candidate)
      continue
    }
    if (isRecord(candidate) && typeof (candidate as any).message === 'string') {
      messages.push(String((candidate as any).message))
    }
  }

  try {
    messages.push(Cause.pretty(cause, { renderErrorCause: true }))
  } catch {
    // ignore
  }

  const merged = messages.filter((s) => s.length > 0).join('\n')

  if (merged) {
    missingServices.push(...parseMissingServiceIds(merged))
    missingConfigKeys.push(...parseMissingConfigKeys(merged))
  }

  return {
    missingServices: Array.from(new Set(missingServices)).sort(),
    missingConfigKeys: Array.from(new Set(missingConfigKeys)).sort(),
  }
}

const buildEnvironmentIr = (params: {
  readonly kernelImplementationRef?: KernelImplementationRef
  readonly runtimeServicesEvidence?: RuntimeKernel.RuntimeServicesEvidence
  readonly buildEnvConfig?: Record<string, BuildEnv.BuildEnvConfigValue | undefined>
  readonly missingServices?: ReadonlyArray<string>
  readonly missingConfigKeys?: ReadonlyArray<string>
}): EnvironmentIr => {
  const providedConfigKeys = Object.keys(params.buildEnvConfig ?? {})
    .filter((k) => k.length > 0 && (params.buildEnvConfig as any)[k] !== undefined)
    .sort()

  const missingServices = Array.from(new Set(params.missingServices ?? [])).sort()
  const missingConfigKeys = Array.from(new Set(params.missingConfigKeys ?? [])).sort()

  const runtimeServiceIds =
    params.runtimeServicesEvidence?.bindings?.map((b) => b.serviceId).filter((s) => typeof s === 'string') ?? []

  const tagIds = Array.from(new Set([...runtimeServiceIds, ...missingServices])).sort()

  const configKeys = Array.from(new Set([...providedConfigKeys, ...missingConfigKeys])).sort()

  return {
    tagIds,
    configKeys,
    missingServices,
    missingConfigKeys,
    kernelImplementationRef: params.kernelImplementationRef,
    runtimeServicesEvidence: params.runtimeServicesEvidence,
  }
}

const toErrorSummaryWithCode = (cause: unknown, code: string, hint?: string): SerializableErrorSummary => {
  const base = toSerializableErrorSummary(cause).errorSummary
  return {
    name: base.name,
    message: base.message,
    code,
    hint: hint ?? base.hint,
  }
}

const makeTrialRunTimeoutError = (): Error =>
  Object.assign(new Error('[Logix] trialRunModule timed out'), {
    name: 'TrialRunTimeoutError',
  })

const awaitFiberExitWithTimeout = <A, E>(
  fiber: Fiber.Fiber<A, E>,
  timeoutMs: number | undefined,
): Effect.Effect<Exit.Exit<A, E | Error>, never, never> =>
  Effect.gen(function* () {
    const hasTimeout = typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
    const start = hasTimeout ? Date.now() : 0

    while (true) {
      const exitOpt = yield* Fiber.poll(fiber)
      if (Option.isSome(exitOpt)) {
        return exitOpt.value as Exit.Exit<A, E | Error>
      }

      if (hasTimeout) {
        const elapsedMs = Date.now() - start
        if (elapsedMs >= timeoutMs) {
          yield* Fiber.interruptFork(fiber)
          return Exit.fail(makeTrialRunTimeoutError())
        }
      }

      // NOTE: timer yield (not TestClock-based)
      yield* Effect.promise(() => new Promise<void>((r) => setTimeout(r, 1)))
    }
  })

export const trialRunModule = <Sh extends AnyModuleShape>(
  root: RootLike<Sh>,
  options?: TrialRunModuleOptions,
): Effect.Effect<TrialRunReport, never, never> =>
  Effect.gen(function* () {
    const rootImpl = resolveRootImpl(root)

    const session = makeRunSession({
      runId: options?.runId,
      source: options?.source ?? { host: defaultHost(), label: 'trial-run-module' },
      startedAt: options?.startedAt,
    })

    const collector = makeEvidenceCollector(session)

    const convergeCollector: ConvergeStaticIrCollector = {
      register: (ir) => {
        collector.registerConvergeStaticIr(ir)
      },
    }

    const sinksLayer = appendSinks([collector.debugSink as unknown as DebugSink])
    const resolvedDiagnosticsLevel = options?.diagnosticsLevel ?? 'light'
    const diagnosticsLayer = diagnosticsLevel(resolvedDiagnosticsLevel)
    const convergeLayer = appendConvergeStaticIrCollectors([convergeCollector])
    const collectorLayer = evidenceCollectorLayer(collector)
    const sessionLayer = runSessionLayer(session)

    const buildEnvConfig = options?.buildEnv?.config
    const buildEnvLayer = BuildEnv.layer({
      runtimeHostKind: options?.buildEnv?.hostKind,
      config: buildEnvConfig,
      configProvider: options?.buildEnv?.configProvider,
    })

    const trialLayer = Layer.mergeAll(
      buildEnvLayer,
      options?.layer ?? (Layer.empty as unknown as Layer.Layer<any, any, any>),
      sessionLayer,
      collectorLayer,
      diagnosticsLayer,
      sinksLayer,
      convergeLayer,
    ) as Layer.Layer<any, never, never>

    const kernel = yield* makeProgramRunnerKernel(
      (impl) =>
        Runtime.make(impl, {
          layer: trialLayer as any,
          // trial-run does not enable devtools by default; diagnostics is controlled by diagnosticsLevel.
        } as any),
      rootImpl,
    )

    const identity = kernel.identity

    const bootFiber = kernel.runtime.runFork(rootImpl.module as any)
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

      if (resolvedDiagnosticsLevel !== 'off') {
        try {
          runtimeServicesEvidence = RuntimeKernel.getRuntimeServicesEvidence(moduleRuntime)
        } catch {
          runtimeServicesEvidence = undefined
        }
      }
    } else {
      const failure = Cause.failureOption(bootExit.cause)
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

    const evidence = collector.exportEvidencePackage({
      maxEvents: options?.maxEvents ?? 1000,
    })

    const manifest = (() => {
      try {
        return extractManifest(root as any, {
          includeStaticIr: true,
          budgets: { maxBytes: 200_000 },
        })
      } catch {
        return undefined
      }
    })()

    const staticIr = (() => {
      try {
        return exportStaticIr(root as any)
      } catch {
        return undefined
      }
    })()

    let ok = Exit.isSuccess(bootExit) && Exit.isSuccess(closeExit)
    let error: SerializableErrorSummary | undefined
    let summary: unknown | undefined

    const depsFromBootFailure = Exit.isFailure(bootExit)
      ? parseMissingDependencyFromCause(bootExit.cause as Cause.Cause<unknown>)
      : { missingServices: [], missingConfigKeys: [] }

    const missingServices = depsFromBootFailure.missingServices
    const missingConfigKeys = depsFromBootFailure.missingConfigKeys

    const closeError = Exit.isFailure(closeExit) ? Option.getOrUndefined(Cause.dieOption(closeExit.cause)) : undefined

    if (!Exit.isSuccess(bootExit)) {
      const failure = Option.getOrUndefined(Cause.failureOption(bootExit.cause))
      const defect = Option.getOrUndefined(Cause.dieOption(bootExit.cause))
      const base = failure ?? defect ?? bootExit.cause

      if (missingServices.length > 0 || missingConfigKeys.length > 0) {
        ok = false
        error = toErrorSummaryWithCode(
          base,
          'MissingDependency',
          missingServices.length > 0
            ? 'Build-time missing service: provide a Layer mock/implementation via options.layer, or move the dependency access to runtime.'
            : 'Build-time missing config: provide the missing key(s) in buildEnv.config, or add a default value to Config.',
        )
      } else if (
        isRecord(base) &&
        ((base as any).name === 'TrialRunTimeoutError' || (base as any)._tag === 'TrialRunTimeout')
      ) {
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
      const died = Option.getOrUndefined(Cause.dieOption(closeExit.cause))
      const failure = Option.getOrUndefined(Cause.failureOption(closeExit.cause))
      const base = died ?? failure ?? closeExit.cause

      const closeErrorSummary = (() => {
        const tag = isRecord(base) ? (base as any)._tag : undefined
        if (tag === 'DisposeTimeout') {
          return toErrorSummaryWithCode(
            base,
            'DisposeTimeout',
            'Dispose timed out: check for unclosed resource handles, fibers not interrupted, or event listeners not unregistered.',
          )
        }
        return toErrorSummaryWithCode(base, 'RuntimeFailure')
      })()

      ok = false
      if (!error) {
        // If boot succeeded but dispose failed, the close error is the primary failure.
        error = closeErrorSummary
      } else {
        // Preserve the primary boot failure (e.g. TrialRunTimeout) but keep dispose failure evidence.
        summary = { __logix: { closeError: closeErrorSummary } }
      }
    }

    const environment = buildEnvironmentIr({
      kernelImplementationRef,
      runtimeServicesEvidence,
      buildEnvConfig,
      missingServices,
      missingConfigKeys,
    })

    const moduleId =
      typeof (rootImpl.module as any)?.id === 'string' && (rootImpl.module as any).id.length > 0
        ? String((rootImpl.module as any).id)
        : (manifest?.moduleId ?? 'unknown')

    const artifacts = collectTrialRunArtifacts({
      exporters: getTrialRunArtifactExporters(rootImpl.module as any),
      ctx: {
        moduleId,
        manifest,
        staticIr: staticIr as any,
        environment,
      },
    })

    let report: TrialRunReport = {
      runId: session.runId,
      ok,
      manifest,
      staticIr: staticIr as any,
      artifacts,
      environment,
      evidence,
      summary,
      error,
    }

    const maxBytes = options?.budgets?.maxBytes
    if (typeof maxBytes === 'number' && Number.isFinite(maxBytes) && maxBytes > 0) {
      const originalBytes = utf8ByteLength(report)
      if (originalBytes > maxBytes) {
        report = {
          runId: session.runId,
          ok: false,
          environment,
          error: {
            message: `[Logix] TrialRunReport exceeded maxBytes (${originalBytes} > ${maxBytes})`,
            code: 'Oversized',
            hint: 'Reduce maxEvents or budgets.maxBytes, or split manifest/evidence artifacts in CI.',
          },
          summary: {
            __logix: {
              truncated: true,
              maxBytes,
              originalBytes,
              dropped: ['manifest', 'staticIr', 'artifacts', 'evidence'],
            },
          },
        }
      }
    }

    return report
  })
