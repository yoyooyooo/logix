import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Evidence.summary (runtime services, diagnostics off)', () => {
  it.effect('should not export summary.runtime.services when diagnosticsLevel=off', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Evidence.Summary.RuntimeServices.Off', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:evidence-summary-runtime-services-off',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      const summary: any = report.evidence?.summary
      expect(summary?.runtime?.kernelImplementationRef).toBeDefined()
      expect(summary?.runtime?.services).toBeUndefined()
    }),
  )
})
