import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Runtime.trial (missing service)', () => {
  it.effect('should fail with MissingDependency and include missingServices', () =>
    Effect.gen(function* () {
      class BusinessService extends ServiceMap.Service<BusinessService, { readonly ping: Effect.Effect<void> }>()('BusinessService') {}

      const Root = Logix.Module.make('TrialRunModule.MissingService', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
      })

      const program = Logix.Program.make(Root, {
        initial: { ok: true },
        logics: [
          Root.logic<BusinessService>('root-logic', ($) => {
            $.readyAfter(Effect.asVoid(Effect.service(BusinessService).pipe(Effect.orDie)), {
              id: 'business-service',
            })
            return Effect.void
          }),
        ],
      })

      const report = yield* trialRunModule(program, {
        runId: 'run:test:missing-service',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('MissingDependency')
      expect(report.environment?.missingServices ?? []).toContain('BusinessService')

      const controlReport = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:missing-service-control-plane',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(controlReport.dependencyCauses).toContainEqual({
        kind: 'service',
        phase: 'startup-boot',
        ownerCoordinate: 'service:BusinessService',
        providerSource: 'runtime-overlay',
        focusRef: {
          declSliceId: 'service:BusinessService',
        },
        errorCode: 'MissingDependency',
      })
      expect(controlReport.repairHints[0]?.focusRef).toEqual({
        declSliceId: 'service:BusinessService',
      })
    }),
  )
})
