import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule servicePortsAlignment (provided)', () => {
  it.effect('should report empty missing lists when services are provided', () =>
    Effect.gen(function* () {
      class RequiredService extends Context.Tag('svc/required')<
        RequiredService,
        { readonly ping: Effect.Effect<void> }
      >() {}

      class OptionalService extends Context.Tag('svc/optional')<
        OptionalService,
        { readonly ping: Effect.Effect<void> }
      >() {}

      const Root = Logix.Module.make('TrialRunModule.ServicePortsAlignment.Provided', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void } as const,
        services: {
          required: RequiredService,
          optional: { tag: OptionalService, optional: true },
        },
      })

      const program = Root.implement({ initial: { ok: true }, logics: [] })

      const layer = Layer.mergeAll(
        Layer.succeed(RequiredService, { ping: Effect.void }),
        Layer.succeed(OptionalService, { ping: Effect.void }),
      ) as Layer.Layer<any, never, never>

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:serviceports-provided',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
        layer,
      })

      expect(report.ok).toBe(true)
      expect(report.error).toBeUndefined()
      expect(report.servicePortsAlignment?.declared).toEqual([
        { port: 'optional', serviceId: 'svc/optional', optional: true },
        { port: 'required', serviceId: 'svc/required' },
      ])
      expect(report.servicePortsAlignment?.missingRequired).toEqual([])
      expect(report.servicePortsAlignment?.missingOptional).toBeUndefined()
    }),
  )
})

