import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule servicePortsAlignment (missing required)', () => {
  it.effect('should report missingRequired by port (even if not accessed)', () =>
    Effect.gen(function* () {
      class RequiredService extends Context.Tag('svc/required')<RequiredService, { readonly ping: Effect.Effect<void> }>() {}

      const Root = Logix.Module.make('TrialRunModule.ServicePortsAlignment.MissingRequired', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void } as const,
        services: {
          required: RequiredService,
        },
      })

      const program = Root.implement({ initial: { ok: true }, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:serviceports-missing-required',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('MissingDependency')
      expect(report.servicePortsAlignment?.moduleId).toBe('TrialRunModule.ServicePortsAlignment.MissingRequired')
      expect(report.servicePortsAlignment?.missingRequired).toEqual([{ port: 'required', serviceId: 'svc/required' }])
    }),
  )
})

