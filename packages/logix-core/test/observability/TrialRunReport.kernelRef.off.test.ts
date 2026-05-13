import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('TrialRunReport.environment (kernel ref, diagnostics off)', () => {
  it.effect('should export environment.kernelImplementationRef but not runtimeServicesEvidence', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunReport.KernelRef.Off', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const report = yield* trialRunModule(program as any, {
        runId: 'run:test:trial-run-report-kernel-ref-off',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(true)
      expect(report.environment?.runtimeServicesEvidence).toBeUndefined()
      expect(report.environment?.kernelImplementationRef).toBeDefined()
      expect(report.environment?.kernelImplementationRef?.kernelId).toBe('core')
      expect(report.environment?.kernelImplementationRef?.packageName).toBe('@logixjs/core')
    }),
  )
})
