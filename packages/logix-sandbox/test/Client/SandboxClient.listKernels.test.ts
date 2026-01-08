import { describe, it, expect } from 'vitest'
import { createSandboxClient } from '@logixjs/sandbox'

describe('SandboxClient (058): listKernels', () => {
  it('returns stable kernels order and defaultKernelId (registry mode)', () => {
    const client = createSandboxClient({
      kernelRegistry: {
        kernels: [
          { kernelId: 'core', kernelUrl: '/sandbox/logix-core.core.js', label: 'core' },
          { kernelId: 'core-ng', kernelUrl: '/sandbox/logix-core.core-ng.js', label: 'core-ng' },
        ],
        defaultKernelId: 'core-ng',
      },
    })

    const listed = client.listKernels()
    expect(listed.kernels.map((k) => k.kernelId)).toEqual(['core', 'core-ng'])
    expect(listed.defaultKernelId).toBe('core-ng')
  })
})
