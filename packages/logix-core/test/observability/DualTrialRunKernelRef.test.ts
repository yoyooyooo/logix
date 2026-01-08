import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Dual trial-run kernel ref', () => {
  it.effect('should distinguish kernelId in TrialRunReport.environment and EvidencePackage.summary', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunReport.DualKernelRef', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const reportCore = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:dual-trial-run-kernel-ref-core',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      const reportCoreNg = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:dual-trial-run-kernel-ref-core-ng',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
        layer: Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logixjs/core-ng' }),
      })

      expect(reportCore.ok).toBe(true)
      expect(reportCoreNg.ok).toBe(true)

      expect(reportCore.environment?.kernelImplementationRef?.kernelId).toBe('core')
      expect(reportCoreNg.environment?.kernelImplementationRef?.kernelId).toBe('core-ng')

      const coreSummary: any = reportCore.evidence?.summary
      const coreNgSummary: any = reportCoreNg.evidence?.summary

      expect(coreSummary?.runtime?.kernelImplementationRef?.kernelId).toBe('core')
      expect(coreNgSummary?.runtime?.kernelImplementationRef?.kernelId).toBe('core-ng')
    }),
  )
})
