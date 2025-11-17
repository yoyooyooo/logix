import { describe, it, expect } from 'vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('Root.resolve override semantics', () => {
  it('ignores local overrides; root mocking happens at runtime creation', async () => {
    interface StepConfig {
      readonly step: number
    }

    class StepConfigTag extends Context.Tag('@test/RootResolveOverride/StepConfig')<StepConfigTag, StepConfig>() {}

    const RootModule = Logix.Module.make('RootResolveOverrideRoot', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const RootImpl = RootModule.implement({ initial: { ok: true } })

    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.succeed(StepConfigTag, { step: 1 }),
    })

    const mockRuntime = Logix.Runtime.make(RootImpl, {
      layer: Layer.succeed(StepConfigTag, { step: 999 }),
    })

    try {
      const inOverrideScope = Effect.gen(function* () {
        const override = yield* StepConfigTag
        const root = yield* Logix.Root.resolve(StepConfigTag)
        return { override, root }
      }).pipe(Effect.provideService(StepConfigTag, { step: 5 }))

      const result = runtime.runSync(inOverrideScope)
      expect(result.override.step).toBe(5)
      expect(result.root.step).toBe(1)

      const mocked = mockRuntime.runSync(Logix.Root.resolve(StepConfigTag))
      expect(mocked.step).toBe(999)
    } finally {
      await mockRuntime.dispose()
      await runtime.dispose()
    }
  })
})
