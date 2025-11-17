import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (runtime services evidence)', () => {
  it.effect('should export environment.runtimeServicesEvidence (020 schema aligned shape)', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.RuntimeServicesEvidence', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:runtime-services-evidence',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
      })

      expect(report.ok).toBe(true)
      expect(report.environment?.runtimeServicesEvidence).toBeDefined()
      expect(report.environment?.runtimeServicesEvidence?.bindings?.length).toBeGreaterThan(0)

      const first = report.environment?.runtimeServicesEvidence?.bindings?.[0] as any
      expect(typeof first?.serviceId).toBe('string')
      expect(typeof first?.scope).toBe('string')
    }),
  )
})
