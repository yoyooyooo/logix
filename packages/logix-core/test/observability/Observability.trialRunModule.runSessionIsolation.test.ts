import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (run session isolation)', () => {
  it.effect('should isolate runId and BuildEnv config between parallel runs', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.RunSessionIsolation', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const [a, b] = yield* Effect.all(
        [
          Logix.Observability.trialRunModule(program, {
            runId: 'run:test:isolation:a',
            buildEnv: { hostKind: 'node', config: { A: true } },
            diagnosticsLevel: 'off',
            maxEvents: 1,
          }),
          Logix.Observability.trialRunModule(program, {
            runId: 'run:test:isolation:b',
            buildEnv: { hostKind: 'node', config: { B: true } },
            diagnosticsLevel: 'off',
            maxEvents: 1,
          }),
        ],
        { concurrency: 'unbounded' },
      )

      expect(a.runId).toBe('run:test:isolation:a')
      expect(b.runId).toBe('run:test:isolation:b')
      expect(a.evidence?.runId).toBe('run:test:isolation:a')
      expect(b.evidence?.runId).toBe('run:test:isolation:b')

      expect(a.environment?.configKeys ?? []).toContain('A')
      expect(b.environment?.configKeys ?? []).toContain('B')
    }),
  )
})
