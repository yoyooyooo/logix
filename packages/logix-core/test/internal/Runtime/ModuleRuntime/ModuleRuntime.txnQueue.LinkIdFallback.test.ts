import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, FiberRef } from 'effect'
import type { ConcurrencyDiagnostics } from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import type { ResolvedConcurrencyPolicy } from '../../../../src/internal/runtime/ModuleRuntime.concurrencyPolicy.js'
import { makeEnqueueTransaction } from '../../../../src/internal/runtime/ModuleRuntime.txnQueue.js'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'

describe('ModuleRuntime.txnQueue (linkId fallback)', () => {
  it.scoped('enqueueTransaction should generate deterministic linkId when caller has none', () =>
    Effect.gen(function* () {
      const policy: ResolvedConcurrencyPolicy = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 16,
        allowUnbounded: false,
        pressureWarningThreshold: {
          backlogCount: 1000,
          backlogDurationMs: 5000,
        },
        warningCooldownMs: 30_000,
        configScope: 'builtin',
        concurrencyLimitScope: 'builtin',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'builtin',
        allowUnboundedScope: 'builtin',
      }

      const diagnostics: ConcurrencyDiagnostics = {
        emitPressureIfNeeded: () => Effect.void,
        emitUnboundedPolicyIfNeeded: () => Effect.void,
      }

      const enqueueTransaction = yield* makeEnqueueTransaction({
        moduleId: 'M',
        instanceId: 'i-1',
        resolveConcurrencyPolicy: () => Effect.succeed(policy),
        diagnostics,
      })

      const readTwice = Effect.gen(function* () {
        const a = yield* FiberRef.get(EffectOpCore.currentLinkId)
        const b = yield* FiberRef.get(EffectOpCore.currentLinkId)
        return [a, b] as const
      })

      const [a1, b1] = yield* enqueueTransaction(readTwice)
      expect(a1).toBeDefined()
      expect(a1).toBe(b1)
      expect(a1).toBe('i-1::l1')

      const [a2, b2] = yield* enqueueTransaction(readTwice)
      expect(a2).toBeDefined()
      expect(a2).toBe(b2)
      expect(a2).toBe('i-1::l2')
    }),
  )
})
