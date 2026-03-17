import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (disposeTimeout)', () => {
  it.effect('should classify closeScopeTimeout as DisposeTimeout', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.DisposeTimeout', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({
        initial: undefined,
        logics: [
          Root.logic(($) => ({
            setup: $.lifecycle.onDestroy(
              Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50))),
            ),
            run: Effect.void,
          })),
        ],
      })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:dispose-timeout',
        closeScopeTimeout: 10,
        trialRunTimeoutMs: 100,
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('DisposeTimeout')
    }),
  )
})
