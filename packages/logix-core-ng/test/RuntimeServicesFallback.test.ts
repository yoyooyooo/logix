import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as CoreNg from '../src/index.js'

describe('core-ng: RuntimeServices fallback', () => {
  it.effect('should record overridesApplied fallback when implId is unknown', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('CoreNg.RuntimeServicesFallback', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const layer = Layer.mergeAll(
        CoreNg.coreNgKernelLayer(),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__' },
        }),
      )

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:core-ng:runtime-services-fallback',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
        layer,
      })

      expect(report.environment?.kernelImplementationRef?.kernelId).toBe('core-ng')
      const evidence: any = report.environment?.runtimeServicesEvidence
      expect(evidence).toBeDefined()
      expect(
        Array.isArray(evidence.overridesApplied) &&
          evidence.overridesApplied.some((s: unknown) => String(s).includes('runtime_default:txnQueue=__missing__')) &&
          evidence.overridesApplied.some((s: unknown) => String(s).includes('fallback=')),
      ).toBe(true)
    }),
  )
})
