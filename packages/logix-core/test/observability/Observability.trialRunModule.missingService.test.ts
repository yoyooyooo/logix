import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (missing service)', () => {
  it.effect('should fail with MissingDependency and include missingServices', () =>
    Effect.gen(function* () {
      class BusinessService extends ServiceMap.Service<BusinessService, { readonly ping: Effect.Effect<void> }>()('BusinessService') {}

      const Root = Logix.Module.make('TrialRunModule.MissingService', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
      })

      const program = Root.implement({
        initial: { ok: true },
        logics: [
          Root.logic(() => ({
            setup: Effect.gen(function* () {
              yield* Effect.service(BusinessService).pipe(Effect.orDie)
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
