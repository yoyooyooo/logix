import { describe, expect, it } from '@effect/vitest'
import * as RuntimeKernel from '../../../../src/internal/runtime/core/RuntimeKernel.js'

describe('RuntimeKernel.Selection', () => {
  it('should keep fallback notes and overridesApplied when override implId is unknown', () => {
    const builtin: RuntimeKernel.RuntimeServiceImpl<number> = {
      implId: 'builtin',
      implVersion: '1.0.0',
      make: undefined as any,
      notes: 'builtin note',
    }

    const trace: RuntimeKernel.RuntimeServiceImpl<number> = {
      implId: 'trace',
      implVersion: '1.0.0',
      make: undefined as any,
      notes: 'trace note',
    }

    const selected = RuntimeKernel.selectRuntimeService('txnQueue', [builtin, trace], {
      runtimeDefault: {
        txnQueue: {
          implId: 'missing-impl',
          notes: 'override note',
        },
      },
    })

    expect(selected.impl.implId).toBe('builtin')
    expect(selected.binding.scope).toBe('runtime_default')
    expect(selected.binding.overridden).toBe(true)
    expect(selected.binding.notes).toContain('override note')
    expect(selected.binding.notes).toContain('builtin note')
    expect(selected.binding.notes).toContain('falling back')
    expect(selected.overridesApplied).toEqual([
      'runtime_default:txnQueue=missing-impl (fallback=builtin)',
    ])
  })

  it('should compute evidence scope as max binding scope', () => {
    const evidence = RuntimeKernel.makeRuntimeServicesEvidence({
      moduleId: 'M',
      instanceId: 'i-1',
      bindings: [
        {
          serviceId: 'txnQueue',
          implId: 'builtin',
          implVersion: '1.0.0',
          scope: 'runtime_module',
          overridden: true,
        },
        {
          serviceId: 'operationRunner',
          implId: 'trace',
          implVersion: '1.0.0',
          scope: 'provider',
          overridden: true,
        },
      ],
      overridesApplied: ['runtime_module:txnQueue=builtin', 'provider:operationRunner=trace'],
    })

    expect(evidence.scope).toBe('provider')
  })
})
