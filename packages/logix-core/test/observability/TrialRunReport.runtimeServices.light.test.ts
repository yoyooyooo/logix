import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('TrialRunReport.environment (runtime services evidence, diagnostics light)', () => {
  it.effect('should export environment.runtimeServicesEvidence when diagnosticsLevel=light', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunReport.RuntimeServices.Light', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const report = yield* trialRunModule(program as any, {
        runId: 'run:test:trial-run-report-runtime-services-light',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
      })

      expect(report.ok).toBe(true)
      expect(report.environment?.runtimeServicesEvidence).toBeDefined()
      expect(report.environment?.runtimeServicesEvidence?.bindings?.length).toBeGreaterThan(0)
    }),
  )
})
