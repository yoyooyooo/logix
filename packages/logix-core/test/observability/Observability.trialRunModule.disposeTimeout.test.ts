import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Runtime.trial (disposeTimeout)', () => {
  it.effect('should classify closeScopeTimeout as DisposeTimeout', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.DisposeTimeout', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: undefined,
        logics: [
          Root.logic('root-logic', () =>
            Effect.acquireRelease(
              Effect.void,
              () => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50))),
            ).pipe(Effect.flatMap(() => Effect.never)),
          ),
        ],
      })

      const report = yield* trialRunModule(program as any, {
        runId: 'run:test:dispose-timeout',
        closeScopeTimeout: 10,
        trialRunTimeoutMs: 100,
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('DisposeTimeout')

      const controlReport = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:dispose-timeout-control-plane',
        closeScopeTimeout: 10,
        trialRunTimeoutMs: 100,
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(controlReport.lifecycle).toMatchObject({
        primaryFailure: null,
        closeSummary: expect.stringContaining('timed out'),
        phase: 'startup-close',
      })
    }),
  )
})
