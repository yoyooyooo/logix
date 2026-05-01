import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRun } from '../../src/internal/verification/trialRun.js'

describe('Exec VM evidence (diagnostics off)', () => {
  it.effect('should not export trace:exec-vm debug event payload', () =>
    Effect.gen(function* () {
      const program = CoreDebug.record({
        type: 'trace:exec-vm',
        moduleId: '@logixjs/core',
        instanceId: 'kernel:core',
        data: {
          version: 'v1',
          stage: 'assembly',
          hit: true,
          reasonCode: 'not_implemented',
          serviceId: 'transaction',
          implId: 'core-experimental',
        },
      } as any)

      const result = yield* trialRun(program, {
        runId: 'run:test:exec-vm-evidence-off',
        diagnosticsLevel: 'off',
        maxEvents: 50,
      })

      expect(result.evidence.events.length).toBe(0)
    }),
  )
})
