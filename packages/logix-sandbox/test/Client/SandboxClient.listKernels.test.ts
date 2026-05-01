import { describe, it, expect } from 'vitest'
import { createSandboxClient } from '../../src/Client.js'

describe('SandboxClient (058): listKernels', () => {
  it('returns stable kernels order and defaultKernelId (registry mode)', () => {
    const client = createSandboxClient({
      kernelRegistry: {
        kernels: [
          { kernelId: 'core', kernelUrl: '/sandbox/logix-core.core.js', label: 'core' },
          { kernelId: 'experimental', kernelUrl: '/sandbox/logix-core.experimental.js', label: 'experimental' },
        ],
        defaultKernelId: 'core',
      },
    })

    const listed = client.listKernels()
    expect(listed.kernels.map((k) => k.kernelId)).toEqual(['core', 'experimental'])
    expect(listed.defaultKernelId).toBe('core')
  })
})
