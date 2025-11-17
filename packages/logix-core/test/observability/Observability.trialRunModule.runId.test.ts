import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (runId)', () => {
  it.effect('should use explicit runId for report and evidence', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.RunId', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
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
