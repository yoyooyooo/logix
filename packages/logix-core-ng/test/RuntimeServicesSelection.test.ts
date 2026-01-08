import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as CoreNg from '../src/index.js'

describe('core-ng: RuntimeServices selection', () => {
  it.effect('should bind txnQueue implId=core-ng when overridden', () =>
    Effect.gen(function* () {
      expect(CoreNg.CORE_NG_IMPL_ID).toBe('core-ng')

      const Root = Logix.Module.make('CoreNg.RuntimeServicesSelection', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const layer = Layer.mergeAll(
        CoreNg.coreNgKernelLayer(),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: CoreNg.CORE_NG_IMPL_ID },
        }),
      )

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:core-ng:runtime-services-selection',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
        layer,
      })

      expect(report.environment?.kernelImplementationRef?.kernelId).toBe('core-ng')
      const evidence: any = report.environment?.runtimeServicesEvidence
      expect(evidence).toBeDefined()
      expect(
        evidence.bindings?.some((b: any) => b.serviceId === 'txnQueue' && b.implId === CoreNg.CORE_NG_IMPL_ID),
      ).toBe(true)
    }),
  )
})
