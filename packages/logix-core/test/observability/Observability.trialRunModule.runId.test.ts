import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Runtime.trial (runId)', () => {
  it.effect('should use explicit runId for report and evidence', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.RunId', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const report = yield* trialRunModule(program as any, {
        runId: 'run:test:explicit',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
        maxEvents: 10,
      })

      expect(report.runId).toBe('run:test:explicit')
      expect(report.evidence?.runId).toBe('run:test:explicit')
    }),
  )
})
