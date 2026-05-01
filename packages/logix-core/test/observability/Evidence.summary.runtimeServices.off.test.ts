import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Evidence.summary (runtime services, diagnostics off)', () => {
  it.effect('should not export summary.runtime.services when diagnosticsLevel=off', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Evidence.Summary.RuntimeServices.Off', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const report = yield* trialRunModule(program as any, {
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
