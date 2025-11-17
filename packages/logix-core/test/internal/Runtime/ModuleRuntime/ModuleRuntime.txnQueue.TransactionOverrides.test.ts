import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Option } from 'effect'
import type { ConcurrencyDiagnostics } from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import { StateTransactionOverridesTag } from '../../../../src/internal/runtime/core/env.js'
import type { ResolvedConcurrencyPolicy } from '../../../../src/internal/runtime/ModuleRuntime.concurrencyPolicy.js'
import { makeEnqueueTransaction } from '../../../../src/internal/runtime/ModuleRuntime.txnQueue.js'

describe('ModuleRuntime.txnQueue (StateTransactionOverrides propagation)', () => {
  it.scoped('enqueueTransaction should preserve StateTransactionOverrides across queue boundary', () =>
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

      const overrides = {
        traitConvergeMode: 'full',
        traitConvergeBudgetMs: 123,
      } as any

      const inside = yield* enqueueTransaction(Effect.serviceOption(StateTransactionOverridesTag)).pipe(
        Effect.provideService(StateTransactionOverridesTag, overrides),
      )

      expect(Option.isSome(inside)).toBe(true)
      expect(Option.isSome(inside) ? inside.value : undefined).toEqual(overrides)
    }),
  )
})
