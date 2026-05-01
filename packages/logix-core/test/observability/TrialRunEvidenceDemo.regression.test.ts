import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Effect, Exit, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { trialRun } from '../../src/internal/verification/trialRun.js'

describe('TrialRun evidence demo (regression)', () => {
  it.effect('should complete and export runtime.services + converge Static IR summary', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
      })

      const Actions = {
        noop: Schema.Void,
      }

      const Def = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('T073.TrialRunEvidenceDemo', {
  state: State,
  actions: Actions,
  reducers: { noop: (s: any) => s }
}), FieldContracts.fieldFrom(State)({
          derivedA: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
        }))

      const programModule = Logix.Program.make(Def, {
        initial: { a: 0, derivedA: 1 },
        logics: [],
      })

      const program = Effect.gen(function* () {
        const ctx = yield* RuntimeContracts.getProgramRuntimeBlueprint(programModule).layer.pipe(Layer.build)
        const runtime = ServiceMap.get(ctx, Def.tag)

        yield* runtime.dispatch({ _tag: 'noop', payload: undefined })
        yield* Effect.yieldNow

        return runtime.instanceId as string
      })

      const result = yield* trialRun(program, {
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
