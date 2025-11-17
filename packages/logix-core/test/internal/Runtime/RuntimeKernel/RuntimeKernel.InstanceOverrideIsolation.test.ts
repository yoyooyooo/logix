import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import * as RuntimeKernel from '../../../../src/internal/runtime/core/RuntimeKernel.js'

describe('RuntimeKernel.InstanceOverrideIsolation (US2)', () => {
  it.scoped('instance override only affects that instance', () =>
    Effect.gen(function* () {
      const a = yield* Effect.provideService(
        ModuleRuntime.make({ n: 0 }, { moduleId: 'M', instanceId: 'i-a' }),
        RuntimeKernel.RuntimeServicesInstanceOverridesTag,
        {
          txnQueue: { implId: 'trace' },
        },
      )

      const b = yield* ModuleRuntime.make({ n: 0 }, { moduleId: 'M', instanceId: 'i-b' })

      const ae = RuntimeKernel.getRuntimeServicesEvidence(a as any)
      const be = RuntimeKernel.getRuntimeServicesEvidence(b as any)

      const aTxnQueue = ae.bindings.find((x) => x.serviceId === 'txnQueue')
      const bTxnQueue = be.bindings.find((x) => x.serviceId === 'txnQueue')

      expect(aTxnQueue?.scope).toBe('instance')
      expect(aTxnQueue?.implId).toBe('trace')

      expect(bTxnQueue?.scope).toBe('builtin')
      expect(bTxnQueue?.implId).toBe('builtin')
    }),
  )
})
