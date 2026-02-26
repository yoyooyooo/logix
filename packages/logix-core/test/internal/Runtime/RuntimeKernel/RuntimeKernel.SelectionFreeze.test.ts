import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as RuntimeKernel from '../../../../src/internal/runtime/core/RuntimeKernel.js'

describe('RuntimeKernel.SelectionFreeze', () => {
  it.effect('resolveRuntimeServicesOverrides should return frozen snapshot and reject implicit drift from source mutation', () =>
    Effect.gen(function* () {
      const runtimeConfig: RuntimeKernel.RuntimeServicesRuntimeConfig = {
        services: {
          txnQueue: { implId: 'trace', notes: 'runtime-default' },
        },
        servicesByModuleId: {
          M: {
            dispatch: { implId: 'builtin', notes: 'runtime-module' },
          },
        },
      }

      const providerOverrides: RuntimeKernel.RuntimeServicesProviderOverrides = {
        services: {
          transaction: { implId: 'builtin', notes: 'provider-default' },
        },
        servicesByModuleId: {
          M: {
            operationRunner: { implId: 'builtin', notes: 'provider-module' },
          },
        },
      }

      const instanceOverrides: RuntimeKernel.RuntimeServicesOverrides = {
        txnQueue: { implId: 'builtin', notes: 'instance' },
      }

      const resolved = yield* RuntimeKernel.resolveRuntimeServicesOverrides({ moduleId: 'M' }).pipe(
        Effect.provideService(RuntimeKernel.RuntimeServicesRuntimeConfigTag, runtimeConfig),
        Effect.provideService(RuntimeKernel.RuntimeServicesProviderOverridesTag, providerOverrides),
        Effect.provideService(RuntimeKernel.RuntimeServicesInstanceOverridesTag, instanceOverrides),
      )

      expect(Object.isFrozen(resolved)).toBe(true)
      expect(Object.isFrozen(resolved.runtimeDefault as object)).toBe(true)
      expect(Object.isFrozen(resolved.runtimeModule as object)).toBe(true)
      expect(Object.isFrozen(resolved.provider as object)).toBe(true)
      expect(Object.isFrozen(resolved.providerModule as object)).toBe(true)
      expect(Object.isFrozen(resolved.instance as object)).toBe(true)

      ;(runtimeConfig as any).services.txnQueue.implId = '__missing__'
      ;(runtimeConfig as any).servicesByModuleId.M.dispatch.implId = '__missing__'
      ;(providerOverrides as any).services.transaction.implId = '__missing__'
      ;(providerOverrides as any).servicesByModuleId.M.operationRunner.implId = '__missing__'
      ;(instanceOverrides as any).txnQueue.implId = '__missing__'

      expect((resolved.runtimeDefault as any)?.txnQueue?.implId).toBe('trace')
      expect((resolved.runtimeModule as any)?.dispatch?.implId).toBe('builtin')
      expect((resolved.provider as any)?.transaction?.implId).toBe('builtin')
      expect((resolved.providerModule as any)?.operationRunner?.implId).toBe('builtin')
      expect((resolved.instance as any)?.txnQueue?.implId).toBe('builtin')
    }),
  )
})
