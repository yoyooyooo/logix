import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.trial (runId)', () => {
  it.effect('should use explicit runId for report and evidence', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('RuntimeTrial.RunId', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: undefined,
        logics: [],
      })

      const report = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:runtime-trial',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
        maxEvents: 10,
      })

      expect(report.kind).toBe('VerificationControlPlaneReport')
      expect((report.environment as any)?.runId).toBe('run:test:runtime-trial')
    }),
  )
})
