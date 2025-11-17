import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (missing service)', () => {
  it.effect('should fail with MissingDependency and include missingServices', () =>
    Effect.gen(function* () {
      class BusinessService extends Context.Tag('BusinessService')<
        BusinessService,
        { readonly ping: Effect.Effect<void> }
      >() {}

      const Root = Logix.Module.make('TrialRunModule.MissingService', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
      })

      const program = Root.implement({
        initial: { ok: true },
        logics: [
          Root.logic(() => ({
            setup: Effect.gen(function* () {
              yield* BusinessService
            }),
            run: Effect.void,
          })),
        ],
      })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:missing-service',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('MissingDependency')
      expect(report.environment?.missingServices ?? []).toContain('BusinessService')
    }),
  )
})
