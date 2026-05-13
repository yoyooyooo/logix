import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Config, Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Runtime.trial (missing config)', () => {
  it.effect('should fail with MissingDependency and include missingConfigKeys', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.MissingConfig', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: undefined,
        logics: [
          Root.logic('root-logic', ($) => {
            $.readyAfter(
              Effect.gen(function* () {
                yield* Config.string('MISSING_CONFIG_KEY')
              }) as any,
              { id: 'missing-config' },
            )
            return Effect.void
          }),
        ],
      })

      const report = yield* trialRunModule(program as any, {
        runId: 'run:test:missing-config',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('MissingDependency')
      expect(report.environment?.missingConfigKeys ?? []).toContain('MISSING_CONFIG_KEY')

      const controlReport = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:missing-config-control-plane',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(controlReport.dependencyCauses).toContainEqual({
        kind: 'config',
        phase: 'startup-boot',
        ownerCoordinate: 'config:MISSING_CONFIG_KEY',
        providerSource: 'runtime-overlay',
        focusRef: {
          declSliceId: 'config:MISSING_CONFIG_KEY',
        },
        errorCode: 'MissingDependency',
      })
    }),
  )
})
