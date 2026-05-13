import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import {
  SchedulingPolicySurfaceOverridesTag,
  SchedulingPolicySurfaceTag,
} from '../../src/internal/runtime/core/env.js'

const RootModule = Logix.Module.make('RuntimeSchedulingPolicySurfaceRoot', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {},
})

const RootProgram = Logix.Program.make(RootModule, {
  initial: { value: 0 },
})

const readResolvedPolicy = (runtime: ReturnType<typeof Logix.Runtime.make>) =>
  Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        return yield* Effect.serviceOption(SchedulingPolicySurfaceTag)
      }),
    ),
  )

const readResolvedOverrides = (runtime: ReturnType<typeof Logix.Runtime.make>) =>
  Effect.promise(() =>
    runtime.runPromise(
      Effect.serviceOption(SchedulingPolicySurfaceOverridesTag),
    ),
  )

describe('Runtime.make scheduling policy surface mapping', () => {
  it.effect('maps schedulingPolicy to the unified service view', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(RootProgram, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        schedulingPolicy: {
          concurrencyLimit: 7,
          allowUnbounded: false,
          losslessBackpressureCapacity: 256,
          pressureWarningThreshold: {
            backlogCount: 10,
            backlogDurationMs: 300,
          },
          warningCooldownMs: 1234,
        },
      })

      const resolved = yield* readResolvedPolicy(runtime)
      expect(Option.isSome(resolved)).toBe(true)

      if (Option.isSome(resolved)) {
        expect(resolved.value.concurrencyLimit).toBe(7)
        expect(resolved.value.losslessBackpressureCapacity).toBe(256)
        expect(resolved.value.warningCooldownMs).toBe(1234)
      }
    }),
  )

  it.effect('prefers the explicit schedulingPolicy surface', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(RootProgram, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        schedulingPolicy: {
          concurrencyLimit: 5,
          allowUnbounded: false,
          losslessBackpressureCapacity: 64,
          pressureWarningThreshold: {
            backlogCount: 9,
            backlogDurationMs: 200,
          },
          warningCooldownMs: 777,
        },
      })

      const resolved = yield* readResolvedPolicy(runtime)
      expect(Option.isSome(resolved)).toBe(true)

      if (Option.isSome(resolved)) {
        expect(resolved.value.concurrencyLimit).toBe(5)
        expect(resolved.value.losslessBackpressureCapacity).toBe(64)
        expect(resolved.value.warningCooldownMs).toBe(777)
      }
    }),
  )

  it.effect('schedulingPolicyOverridesLayer maps directly to unified overrides service', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(RootProgram, {
        layer: Logix.Runtime.schedulingPolicyOverridesLayer({
          concurrencyLimit: 19,
          warningCooldownMs: 222,
        }),
      })

      const resolved = yield* readResolvedOverrides(runtime)
      expect(Option.isSome(resolved)).toBe(true)

      if (Option.isSome(resolved)) {
        expect(resolved.value.concurrencyLimit).toBe(19)
        expect(resolved.value.warningCooldownMs).toBe(222)
      }
    }),
  )

  it.effect('setSchedulingPolicyOverride writes into unified scheduling policy surface', () =>
    Effect.gen(function* () {
      const moduleId = 'RuntimeSchedulingPolicySurfaceRoot'
      const runtime = Logix.Runtime.make(RootProgram, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        schedulingPolicy: {
          concurrencyLimit: 6,
          warningCooldownMs: 60,
        },
      })

      yield* Logix.Runtime.setSchedulingPolicyOverride(runtime, moduleId, {
        concurrencyLimit: 13,
        warningCooldownMs: 130,
      })

      const resolved = yield* readResolvedPolicy(runtime)
      expect(Option.isSome(resolved)).toBe(true)

      if (Option.isSome(resolved)) {
        const unifiedPatch = resolved.value.overridesByModuleId?.[moduleId]
        expect(unifiedPatch?.concurrencyLimit).toBe(13)
        expect(unifiedPatch?.warningCooldownMs).toBe(130)
      }
    }),
  )
})
