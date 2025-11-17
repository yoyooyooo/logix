import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('TrialRunReport.environment (runtime services evidence, diagnostics light)', () => {
  it.effect('should export environment.runtimeServicesEvidence when diagnosticsLevel=light', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunReport.RuntimeServices.Light', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
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
