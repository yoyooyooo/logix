import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('TrialRun evidence demo (regression)', () => {
  it.scoped('should complete and export runtime.services + converge Static IR summary', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
      })

      const Actions = {
        noop: Schema.Void,
      }

      const Def = Logix.Module.make('T073.TrialRunEvidenceDemo', {
        state: State,
        actions: Actions,
        reducers: { noop: (s: any) => s },
        traits: Logix.StateTrait.from(State)({
          derivedA: Logix.StateTrait.computed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
        }),
      })

      const Mod = Def.implement({
        initial: { a: 0, derivedA: 1 },
        logics: [],
      })

      const program = Effect.gen(function* () {
        const ctx = yield* Mod.impl.layer.pipe(Layer.build)
        const runtime = Context.get(ctx, Def.tag)

        yield* runtime.dispatch({ _tag: 'noop', payload: undefined })
        yield* Effect.yieldNow()

        return runtime.instanceId as string
      })

      const result = yield* Logix.Observability.trialRun(program, {
        runId: 'run:test:trial-run-evidence-demo',
        source: { host: 'node', label: 'TrialRunEvidenceDemo.regression.test' },
        diagnosticsLevel: 'full',
        runtimeServicesInstanceOverrides: {
          txnQueue: { implId: 'trace', notes: 'test: instance override' },
        },
        maxEvents: 200,
      })

      expect(Exit.isSuccess(result.exit)).toBe(true)

      const summary: any = result.evidence.summary
      expect(summary).toBeTruthy()
      expect(summary.runtime?.services).toBeTruthy()
      expect(summary.converge?.staticIrByDigest).toBeTruthy()
    }),
  )
})
