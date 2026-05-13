import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Runtime.trial (runtime services evidence)', () => {
  it.effect('should export environment.runtimeServicesEvidence (020 schema aligned shape)', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.RuntimeServicesEvidence', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const report = yield* trialRunModule(program as any, {
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
