import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import type { ConcurrencyDiagnostics } from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import { makeResolveConcurrencyPolicy } from '../../../../src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.js'
import { ConcurrencyPolicyOverridesTag, ConcurrencyPolicyTag } from '../../../../src/internal/runtime/core/env.js'

describe('ConcurrencyPolicy resolver cache', () => {
  it.effect('reuses resolved object when runtime/provider policy references are unchanged', () =>
    Effect.gen(function* () {
      const runtimePolicy = {
        concurrencyLimit: 32,
        allowUnbounded: false,
      }
      const providerOverrides = {
        losslessBackpressureCapacity: 128,
      }

      let unboundedDiagnosticCalls = 0
      const diagnostics: ConcurrencyDiagnostics = {
        emitPressureIfNeeded: () => Effect.void,
        emitUnboundedPolicyIfNeeded: () =>
          Effect.sync(() => {
            unboundedDiagnosticCalls += 1
          }),
      }

      const resolveConcurrencyPolicy = makeResolveConcurrencyPolicy({
        moduleId: 'ResolveCache',
        diagnostics,
      })

      const providePolicy = <A, E>(eff: Effect.Effect<A, E>) =>
        eff.pipe(
          Effect.provideService(ConcurrencyPolicyTag, runtimePolicy),
          Effect.provideService(ConcurrencyPolicyOverridesTag, providerOverrides),
        )

      const first = yield* providePolicy(resolveConcurrencyPolicy())
      const second = yield* providePolicy(resolveConcurrencyPolicy())

      expect(first).toBe(second)
      expect(first.concurrencyLimit).toBe(32)
      expect(first.losslessBackpressureCapacity).toBe(128)
      expect(unboundedDiagnosticCalls).toBe(2)
    }),
  )

  it.effect('invalidates cache when provider/runtime references change', () =>
    Effect.gen(function* () {
      const resolveConcurrencyPolicy = makeResolveConcurrencyPolicy({
        moduleId: 'ResolveCacheInvalidation',
      })

      const runtimePolicyA = {
        concurrencyLimit: 16,
        allowUnbounded: false,
      }
      const runtimePolicyB = {
        concurrencyLimit: 8,
        allowUnbounded: false,
      }
      const providerOverridesA = {
        losslessBackpressureCapacity: 256,
      }
      const providerOverridesB = {
        losslessBackpressureCapacity: 64,
      }

      const first = yield* resolveConcurrencyPolicy().pipe(
        Effect.provideService(ConcurrencyPolicyTag, runtimePolicyA),
        Effect.provideService(ConcurrencyPolicyOverridesTag, providerOverridesA),
      )
      const second = yield* resolveConcurrencyPolicy().pipe(
        Effect.provideService(ConcurrencyPolicyTag, runtimePolicyA),
        Effect.provideService(ConcurrencyPolicyOverridesTag, providerOverridesA),
      )

      providerOverridesA.losslessBackpressureCapacity = 192
      const secondAfterMutation = yield* resolveConcurrencyPolicy().pipe(
        Effect.provideService(ConcurrencyPolicyTag, runtimePolicyA),
        Effect.provideService(ConcurrencyPolicyOverridesTag, providerOverridesA),
      )
      const third = yield* resolveConcurrencyPolicy().pipe(
        Effect.provideService(ConcurrencyPolicyTag, runtimePolicyB),
        Effect.provideService(ConcurrencyPolicyOverridesTag, providerOverridesA),
      )
      const fourth = yield* resolveConcurrencyPolicy().pipe(
        Effect.provideService(ConcurrencyPolicyTag, runtimePolicyB),
        Effect.provideService(ConcurrencyPolicyOverridesTag, providerOverridesB),
      )

      expect(first).toBe(second)
      expect(secondAfterMutation).not.toBe(second)
      expect(secondAfterMutation.losslessBackpressureCapacity).toBe(192)
      expect(third).not.toBe(first)
      expect(fourth).not.toBe(third)
      expect(third.concurrencyLimit).toBe(8)
      expect(fourth.losslessBackpressureCapacity).toBe(64)
    }),
  )
})
