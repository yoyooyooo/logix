import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Exec VM evidence (diagnostics off)', () => {
  it.effect('should not export trace:exec-vm debug event payload', () =>
    Effect.gen(function* () {
      const program = Logix.Debug.record({
        type: 'trace:exec-vm',
        moduleId: '@logixjs/core-ng',
        instanceId: 'kernel:core-ng',
        data: {
          version: 'v1',
          stage: 'assembly',
          hit: true,
          reasonCode: 'not_implemented',
          serviceId: 'transaction',
          implId: 'core-ng',
        },
      } as any)

      const result = yield* Logix.Observability.trialRun(program, {
        runId: 'run:test:exec-vm-evidence-off',
        diagnosticsLevel: 'off',
        maxEvents: 50,
      })

      expect(result.evidence.events.length).toBe(0)
    }),
  )
})
