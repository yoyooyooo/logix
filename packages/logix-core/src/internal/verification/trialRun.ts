import { Effect, type Exit } from 'effect'
import type { EvidencePackage, EvidencePackageSource } from './evidence.js'
import { runProofKernel } from './proofKernel.js'
import type { ProofKernelOptions } from './proofKernel.types.js'
import type { RunId, RunSession } from './runSession.js'

export interface TrialRunOptions extends ProofKernelOptions {
  readonly runId?: RunId
  readonly source?: EvidencePackageSource
}

export interface TrialRunResult<A, E> {
  readonly session: RunSession
  readonly exit: Exit.Exit<A, E>
  readonly evidence: EvidencePackage
}

export const trialRun = <A, E, R>(
  program: Effect.Effect<A, E, R>,
  options?: TrialRunOptions,
): Effect.Effect<TrialRunResult<A, E>, never, R> =>
  runProofKernel(program, options).pipe(
    Effect.map(({ session, exit, evidence }) => ({
      session,
      exit,
      evidence,
    })),
  )
