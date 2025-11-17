import { Effect, Exit, Layer, Scope } from 'effect'
import type { EvidencePackage, EvidencePackageSource } from './evidence.js'
import { makeEvidenceCollector, evidenceCollectorLayer } from './evidenceCollector.js'
import { makeRunSession, runSessionLayer, type RunSession, type RunId } from './runSession.js'
import {
  appendSinks,
  diagnosticsLevel,
  type DiagnosticsLevel,
  type Sink as DebugSink,
} from '../runtime/core/DebugSink.js'
import * as RuntimeKernel from '../runtime/core/RuntimeKernel.js'
import type { ConvergeStaticIrCollector } from '../runtime/core/ConvergeStaticIrCollector.js'
import { appendConvergeStaticIrCollectors } from '../runtime/core/ConvergeStaticIrCollector.js'
export * from './trialRunModule.js'

export interface TrialRunOptions {
  readonly runId?: RunId
  readonly source?: EvidencePackageSource
  readonly startedAt?: number
  readonly diagnosticsLevel?: DiagnosticsLevel
  readonly maxEvents?: number
  readonly layer?: Layer.Layer<any, any, any>
  readonly runtimeServicesInstanceOverrides?: RuntimeKernel.RuntimeServicesOverrides
}

export interface TrialRunResult<A, E> {
  readonly session: RunSession
  readonly exit: Exit.Exit<A, E>
  readonly evidence: EvidencePackage
}

const defaultHost = (): string => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'browser'
  return 'node'
}

export const trialRun = <A, E, R>(
  program: Effect.Effect<A, E, R>,
  options?: TrialRunOptions,
): Effect.Effect<TrialRunResult<A, E>, never, R> =>
  Effect.gen(function* () {
    const session = makeRunSession({
      runId: options?.runId,
      source: options?.source ?? { host: defaultHost(), label: 'trial-run' },
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

    const trialLayer = Layer.mergeAll(
      options?.layer ?? (Layer.empty as unknown as Layer.Layer<any, any, any>),
      sessionLayer,
      collectorLayer,
      overridesLayer,
      diagnosticsLayer,
      sinksLayer,
      convergeLayer,
    ) as Layer.Layer<any, never, any>

    const scope = yield* Scope.make()

    const exit = yield* Effect.exit(program).pipe(Effect.provideService(Scope.Scope, scope), Effect.provide(trialLayer))

    yield* Scope.close(scope, exit)

    const evidence = collector.exportEvidencePackage({
      maxEvents: options?.maxEvents,
    })

    return { session, exit, evidence } satisfies TrialRunResult<A, E>
  })
