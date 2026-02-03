import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule servicePortsAlignment (missing optional)', () => {
  it.effect('should report missingOptional without hard-failing', () =>
    Effect.gen(function* () {
      class OptionalService extends Context.Tag('svc/optional')<
        OptionalService,
        { readonly ping: Effect.Effect<void> }
      >() {}

      const Root = Logix.Module.make('TrialRunModule.ServicePortsAlignment.MissingOptional', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void } as const,
        services: {
          optional: { tag: OptionalService, optional: true },
        },
      })

      const program = Root.implement({ initial: { ok: true }, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:serviceports-missing-optional',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(true)
      expect(report.error).toBeUndefined()
      expect(report.servicePortsAlignment?.missingRequired).toEqual([])
      expect(report.servicePortsAlignment?.missingOptional).toEqual([{ port: 'optional', serviceId: 'svc/optional', optional: true }])
    }),
  )
})

