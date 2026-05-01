import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Dual trial-run kernel ref', () => {
  it.effect('should distinguish experimental capabilities in TrialRunReport.environment and EvidencePackage.summary', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunReport.DualKernelRef', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const reportCore = yield* trialRunModule(program as any, {
        runId: 'run:test:dual-trial-run-kernel-ref-core',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      const reportExperimental = yield* trialRunModule(program as any, {
        runId: 'run:test:dual-trial-run-kernel-ref-experimental',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
        layer: Layer.mergeAll(
          CoreKernel.experimentalLayer({
            capabilities: ['trial:experimental'],
          }),
          CoreKernel.fullCutoverGateModeLayer('trial'),
        ) as Layer.Layer<any, never, never>,
      })

      expect(reportCore.ok).toBe(true)
      expect(reportExperimental.ok).toBe(true)

      expect(reportCore.environment?.kernelImplementationRef?.kernelId).toBe('core')
      expect(reportExperimental.environment?.kernelImplementationRef?.kernelId).toBe('core')
      expect(reportExperimental.environment?.kernelImplementationRef?.capabilities).toContain('trial:experimental')

      const coreSummary: any = reportCore.evidence?.summary
      const experimentalSummary: any = reportExperimental.evidence?.summary

      expect(coreSummary?.runtime?.kernelImplementationRef?.kernelId).toBe('core')
      expect(experimentalSummary?.runtime?.kernelImplementationRef?.kernelId).toBe('core')
      expect(experimentalSummary?.runtime?.kernelImplementationRef?.capabilities).toContain('trial:experimental')
    }),
  )
})
