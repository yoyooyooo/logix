import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime (048): no implicit fallback', () => {
  it('should fail under fullCutover when requested impl registry is missing (no silent fallback)', async () => {
    const Root = Logix.Module.make('Runtime.048.NoImplicitFallback', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
      reducers: { noop: (s: any) => s },
    })

    const program = Root.implement({
      initial: { count: 0 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.mergeAll(
        Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logixjs/core-ng' }),
        Logix.Kernel.fullCutoverGateModeLayer('fullCutover'),
        Logix.Kernel.runtimeServicesRegistryLayer({ implsByServiceId: {} }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer(
          Object.fromEntries(
            Logix.Kernel.CutoverCoverageMatrix.requiredServiceIds.map((serviceId) => [serviceId, { implId: 'core-ng' }]),
          ),
        ),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      // Force module assembly (and thus fullCutover gate evaluation).
      yield* Root.tag
    })

    try {
      await expect(runtime.runPromise(boot)).rejects.toThrow(/FullCutoverGateFailed/)
    } finally {
      await runtime.dispose()
    }
  })
})
