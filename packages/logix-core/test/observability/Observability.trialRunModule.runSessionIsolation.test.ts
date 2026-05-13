import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('Runtime.trial (run session isolation)', () => {
  it.effect('should isolate runId and BuildEnv config between parallel runs', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.RunSessionIsolation', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const [a, b] = yield* Effect.all(
        [
          trialRunModule(program as any, {
            runId: 'run:test:isolation:a',
            buildEnv: { hostKind: 'node', config: { A: true } },
            diagnosticsLevel: 'off',
            maxEvents: 1,
          }),
          trialRunModule(program as any, {
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
