import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import {
  ConcurrencyPolicyOverridesTag,
  ConcurrencyPolicyTag,
  SchedulingPolicySurfaceOverridesTag,
  SchedulingPolicySurfaceTag,
} from '../../src/internal/runtime/core/env.js'

const RootModule = Logix.Module.make('RuntimeSchedulingPolicySurfaceRoot', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {},
})

const RootImpl = RootModule.implement({
  initial: { value: 0 },
})

const readResolvedPolicy = (runtime: ReturnType<typeof Logix.Runtime.make>) =>
  Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const legacy = yield* Effect.serviceOption(ConcurrencyPolicyTag)
        const unified = yield* Effect.serviceOption(SchedulingPolicySurfaceTag)
        return { legacy, unified }
      }),
    ),
  )

const readResolvedOverrides = (runtime: ReturnType<typeof Logix.Runtime.make>) =>
  Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const legacy = yield* Effect.serviceOption(ConcurrencyPolicyOverridesTag)
        const unified = yield* Effect.serviceOption(SchedulingPolicySurfaceOverridesTag)
        return { legacy, unified }
      }),
    ),
  )

describe('Runtime.make scheduling policy surface mapping', () => {
  it.effect('maps new schedulingPolicy to both unified and legacy service views', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(RootImpl, {
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
      expect(Option.isSome(resolved.unified)).toBe(true)
      expect(Option.isSome(resolved.legacy)).toBe(true)

      if (Option.isSome(resolved.unified) && Option.isSome(resolved.legacy)) {
        expect(resolved.unified.value.concurrencyLimit).toBe(7)
        expect(resolved.unified.value.losslessBackpressureCapacity).toBe(256)
        expect(resolved.unified.value.warningCooldownMs).toBe(1234)
        expect(resolved.legacy.value).toEqual(resolved.unified.value)
      }
    }),
  )

  it.effect('keeps legacy concurrencyPolicy option behavior by mapping to unified surface', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        concurrencyPolicy: {
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
      expect(Option.isSome(resolved.unified)).toBe(true)
      expect(Option.isSome(resolved.legacy)).toBe(true)

      if (Option.isSome(resolved.unified)) {
        expect(resolved.unified.value.concurrencyLimit).toBe(5)
        expect(resolved.unified.value.losslessBackpressureCapacity).toBe(64)
        expect(resolved.unified.value.warningCooldownMs).toBe(777)
      }
    }),
  )

  it.effect('prefers schedulingPolicy when both new and legacy options are provided', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        schedulingPolicy: {
          concurrencyLimit: 11,
          allowUnbounded: false,
          losslessBackpressureCapacity: 222,
          pressureWarningThreshold: {
            backlogCount: 33,
            backlogDurationMs: 444,
          },
          warningCooldownMs: 555,
        },
        concurrencyPolicy: {
          concurrencyLimit: 2,
          allowUnbounded: false,
          losslessBackpressureCapacity: 3,
          pressureWarningThreshold: {
            backlogCount: 4,
            backlogDurationMs: 5,
          },
          warningCooldownMs: 6,
        },
      })

      const resolved = yield* readResolvedPolicy(runtime)
      expect(Option.isSome(resolved.unified)).toBe(true)

      if (Option.isSome(resolved.unified)) {
        expect(resolved.unified.value.concurrencyLimit).toBe(11)
        expect(resolved.unified.value.losslessBackpressureCapacity).toBe(222)
        expect(resolved.unified.value.warningCooldownMs).toBe(555)
      }
    }),
  )

  it.effect('legacy concurrencyPolicyOverridesLayer maps directly to unified overrides service', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Logix.Runtime.concurrencyPolicyOverridesLayer({
          concurrencyLimit: 19,
          warningCooldownMs: 222,
        }),
      })

      const resolved = yield* readResolvedOverrides(runtime)
      expect(Option.isSome(resolved.unified)).toBe(true)
      expect(Option.isSome(resolved.legacy)).toBe(true)

      if (Option.isSome(resolved.unified) && Option.isSome(resolved.legacy)) {
        expect(resolved.unified.value.concurrencyLimit).toBe(19)
        expect(resolved.unified.value.warningCooldownMs).toBe(222)
        expect(resolved.legacy.value).toEqual(resolved.unified.value)
      }
    }),
  )

  it.effect('legacy setConcurrencyPolicyOverride writes into unified scheduling policy surface', () =>
    Effect.gen(function* () {
      const moduleId = 'RuntimeSchedulingPolicySurfaceRoot'
      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        schedulingPolicy: {
          concurrencyLimit: 6,
          warningCooldownMs: 60,
        },
      })

      yield* Logix.Runtime.setConcurrencyPolicyOverride(runtime, moduleId, {
        concurrencyLimit: 13,
        warningCooldownMs: 130,
      })

      const resolved = yield* readResolvedPolicy(runtime)
      expect(Option.isSome(resolved.unified)).toBe(true)
      expect(Option.isSome(resolved.legacy)).toBe(true)

      if (Option.isSome(resolved.unified) && Option.isSome(resolved.legacy)) {
        const unifiedPatch = resolved.unified.value.overridesByModuleId?.[moduleId]
        const legacyPatch = resolved.legacy.value.overridesByModuleId?.[moduleId]
        expect(unifiedPatch?.concurrencyLimit).toBe(13)
        expect(unifiedPatch?.warningCooldownMs).toBe(130)
        expect(legacyPatch).toEqual(unifiedPatch)
      }
    }),
  )
})
