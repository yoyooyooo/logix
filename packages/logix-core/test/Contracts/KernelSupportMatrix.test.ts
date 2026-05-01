import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import { describe, expect, it } from '@effect/vitest'
import * as Logix from '../../src/index.js'
import {
  EXPERIMENTAL_KERNEL_IMPL_ID,
  experimentalRuntimeServicesRegistry,
  experimentalSupportMatrixRoute,
} from '../../src/internal/runtime/core/RuntimeServices.impls.experimental.js'

describe('contracts: kernel support matrix', () => {
  it('should encode experimental routing only as a support-matrix-routing input', () => {
    expect(experimentalSupportMatrixRoute.status).toBe('support-matrix-routing')
    expect(experimentalSupportMatrixRoute.sourceOfTruthPackage).toBe('@logixjs/core')
    expect(experimentalSupportMatrixRoute.recommendedConsumerPackage).toBe('@logixjs/core')
    expect(experimentalSupportMatrixRoute.supportedServiceIds).toEqual(CoreKernel.CutoverCoverageMatrix.requiredServiceIds)

    const registryServiceIds = Object.keys(experimentalRuntimeServicesRegistry.implsByServiceId).sort()
    expect(registryServiceIds).toEqual([...CoreKernel.CutoverCoverageMatrix.requiredServiceIds].sort())

    for (const serviceId of registryServiceIds) {
      const impls = experimentalRuntimeServicesRegistry.implsByServiceId[serviceId] ?? []
      expect(impls.length).toBeGreaterThan(0)
      for (const impl of impls) {
        expect(impl.implId).toBe(EXPERIMENTAL_KERNEL_IMPL_ID)
        expect(impl.notes).toContain('support-matrix-routing')
      }
    }
  })
})
