import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Config, Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (missing config)', () => {
  it.effect('should fail with MissingDependency and include missingConfigKeys', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.MissingConfig', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({
        initial: undefined,
        logics: [
          Root.logic(() => ({
            setup: Effect.gen(function* () {
              yield* Config.string('MISSING_CONFIG_KEY')
            }) as any,
            run: Effect.void,
          })),
        ],
      })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:missing-config',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('MissingDependency')
      expect(report.environment?.missingConfigKeys ?? []).toContain('MISSING_CONFIG_KEY')
    }),
  )
})
