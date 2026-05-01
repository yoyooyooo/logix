import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import { runProofKernel, withProofKernelContext } from '../../src/internal/verification/proofKernel.js'

describe('VerificationProofKernel contract', () => {
  it.effect('returns a unified proof result for a successful program', () =>
    Effect.gen(function* () {
      const result = yield* runProofKernel(Effect.succeed('ok'), {
        runId: 'run:test:proof-kernel:success',
        diagnosticsLevel: 'off',
      })

      expect(Exit.isSuccess(result.exit)).toBe(true)
      expect(result.ok).toBe(true)
      expect(result.evidence.runId).toBe('run:test:proof-kernel:success')
      expect(result.session.runId).toBe('run:test:proof-kernel:success')
    }),
  )

  it.effect('normalizes failure into a stable error summary', () =>
    Effect.gen(function* () {
      const result = yield* runProofKernel(Effect.fail(new Error('boom')), {
        runId: 'run:test:proof-kernel:failure',
        diagnosticsLevel: 'off',
      })

      expect(Exit.isFailure(result.exit)).toBe(true)
      expect(result.ok).toBe(false)
      expect(result.error?.message).toContain('boom')
    }),
  )

  it.effect('keeps context session and exported evidence aligned when using withProofKernelContext', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:proof-kernel:context',
          diagnosticsLevel: 'off',
        },
        ({ session }) => Effect.succeed(session.runId),
      )

      expect(Exit.isSuccess(result.exit)).toBe(true)
      expect(result.session.runId).toBe('run:test:proof-kernel:context')
      expect(result.evidence.runId).toBe('run:test:proof-kernel:context')
      expect(Exit.isSuccess(result.exit) ? result.exit.value : 'unknown').toBe('run:test:proof-kernel:context')
    }),
  )
})
