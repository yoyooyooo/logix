import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('TrialRunReport.environment (kernel ref, diagnostics off)', () => {
  it.effect('should export environment.kernelImplementationRef but not runtimeServicesEvidence', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunReport.KernelRef.Off', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:trial-run-report-kernel-ref-off',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(true)
      expect(report.environment?.runtimeServicesEvidence).toBeUndefined()
      expect(report.environment?.kernelImplementationRef).toBeDefined()
      expect(report.environment?.kernelImplementationRef?.kernelId).toBe('core')
      expect(report.environment?.kernelImplementationRef?.packageName).toBe('@logix/core')
    }),
  )
})
