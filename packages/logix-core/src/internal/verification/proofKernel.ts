import { Effect, Exit, Layer, Scope } from 'effect'
import { makeEvidenceCollector, evidenceCollectorLayer } from './evidenceCollector.js'
import {
  type ProofKernelContextRunner,
  type ProofKernelErrorSummary,
  type ProofKernelResult,
  type ProofKernelRunner,
} from './proofKernel.types.js'
import { makeRunSession, runSessionLayer } from './runSession.js'
import {
  appendSinks,
  diagnosticsLevel,
  type Sink as DebugSink,
} from '../runtime/core/DebugSink.js'
import { awaitFiberExitWithTimeout, makeTrialRunTimeoutError } from '../observability/trialRunErrors.js'
import * as RuntimeKernel from '../runtime/core/RuntimeKernel.js'
import type { ConvergeStaticIrCollector } from '../runtime/core/ConvergeStaticIrCollector.js'
import { appendConvergeStaticIrCollectors } from '../runtime/core/ConvergeStaticIrCollector.js'

const defaultHost = (): string => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'browser'
  return 'node'
}

const toProofKernelError = (exit: Exit.Exit<unknown, unknown>): ProofKernelErrorSummary | undefined => {
  if (!Exit.isFailure(exit) || exit.cause == null) return undefined

  const failure = exit.cause as any
  const err = failure?._tag === 'Die' ? failure.defect : failure
  if (err instanceof Error) {
    return { name: err.name, message: err.message }
  }

  return { name: 'UnknownError', message: String(err ?? 'unknown') }
}

export const runProofKernel: ProofKernelRunner = (program, options) =>
  withProofKernelContext(options, () => program)

export const withProofKernelContext: ProofKernelContextRunner = (options, run) =>
  Effect.gen(function* () {
    const session = makeRunSession({
      runId: options?.runId,
      source: options?.source ?? { host: defaultHost(), label: 'proof-kernel' },
      startedAt: options?.startedAt,
    })

    const collector = makeEvidenceCollector(session)

    const convergeCollector: ConvergeStaticIrCollector = {
      register: (ir) => {
        collector.registerConvergeStaticIr(ir)
      },
    }

    const sinksLayer = appendSinks([collector.debugSink as unknown as DebugSink])
    const diagnosticsLayer = diagnosticsLevel(options?.diagnosticsLevel ?? 'light')
    const convergeLayer = appendConvergeStaticIrCollectors([convergeCollector])
    const collectorLayer = evidenceCollectorLayer(collector)
    const sessionLayer = runSessionLayer(session)

    const overridesLayer =
      options?.runtimeServicesInstanceOverrides != null
        ? (Layer.succeed(
            RuntimeKernel.RuntimeServicesInstanceOverridesTag,
            options.runtimeServicesInstanceOverrides,
          ) as Layer.Layer<any, never, never>)
        : (Layer.empty as Layer.Layer<any, never, never>)

    const proofLayer = Layer.mergeAll(
      options?.layer ?? (Layer.empty as unknown as Layer.Layer<any, any, any>),
      sessionLayer,
      collectorLayer,
      overridesLayer,
      diagnosticsLayer,
      sinksLayer,
      convergeLayer,
    ) as Layer.Layer<any, never, any>

    const scope = yield* Scope.make()
    const proofEffect = Effect.exit(run({ session, collector, layer: proofLayer })).pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.provide(proofLayer),
    )
    const proofFiber = yield* Effect.forkIn(proofEffect, scope)
    const awaitedExit = yield* awaitFiberExitWithTimeout(proofFiber, options?.timeoutMs)
    const timedOut = Exit.isFailure(awaitedExit)
    const exit: Exit.Exit<any, any> = timedOut ? Exit.fail(makeTrialRunTimeoutError()) : awaitedExit.value
    yield* Scope.close(scope, exit)

    const evidence = collector.exportEvidencePackage({
      maxEvents: options?.maxEvents,
    })

    const error = timedOut
      ? { name: 'TrialRunTimeoutError', message: '[Logix] trialRunModule timed out' }
      : toProofKernelError(exit)

    return {
      session,
      exit,
      evidence,
      ok: Exit.isSuccess(exit),
      ...(error ? { error } : {}),
    } satisfies ProofKernelResult<any, any>
  })
