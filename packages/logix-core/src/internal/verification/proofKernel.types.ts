import type { Effect, Exit, Layer } from 'effect'
import type { DiagnosticsLevel } from '../runtime/core/DebugSink.js'
import type * as RuntimeKernel from '../runtime/core/RuntimeKernel.js'
import type { EvidencePackage, EvidencePackageSource } from './evidence.js'
import type { EvidenceCollector } from './evidenceCollector.js'
import type { RunId, RunSession } from './runSession.js'

export interface ProofKernelOptions {
  readonly runId?: RunId
  readonly source?: EvidencePackageSource
  readonly startedAt?: number
  readonly timeoutMs?: number
  readonly diagnosticsLevel?: DiagnosticsLevel
  readonly maxEvents?: number
  readonly layer?: Layer.Layer<any, any, any>
  readonly runtimeServicesInstanceOverrides?: RuntimeKernel.RuntimeServicesOverrides
}

export interface ProofKernelErrorSummary {
  readonly name: string
  readonly message: string
}

export interface ProofKernelResult<A, E> {
  readonly session: RunSession
  readonly exit: Exit.Exit<A, E>
  readonly evidence: EvidencePackage
  readonly ok: boolean
  readonly error?: ProofKernelErrorSummary
}

export interface ProofKernelContext {
  readonly session: RunSession
  readonly collector: EvidenceCollector
  readonly layer: Layer.Layer<any, never, any>
}

export interface ProofKernelRunner {
  <A, E, R>(
    program: Effect.Effect<A, E, R>,
    options?: ProofKernelOptions,
  ): Effect.Effect<ProofKernelResult<A, E>, never, R>
}

export interface ProofKernelContextRunner {
  <A, E, R>(
    options: ProofKernelOptions | undefined,
    run: (context: ProofKernelContext) => Effect.Effect<A, E, R>,
  ): Effect.Effect<ProofKernelResult<A, E>, never, R>
}
