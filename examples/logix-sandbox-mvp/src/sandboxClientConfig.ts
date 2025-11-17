import type { KernelRegistry, SandboxClientConfig } from '@logix/sandbox'

export const sandboxKernelRegistry: KernelRegistry = {
  kernels: [
    { kernelId: 'core', label: 'core', kernelUrl: '/sandbox/logix-core.js' },
    { kernelId: 'core-ng', label: 'core-ng', kernelUrl: '/sandbox/logix-core.js' },
  ],
  defaultKernelId: 'core',
}

export const sandboxClientConfig: SandboxClientConfig = {
  kernelRegistry: sandboxKernelRegistry,
}
