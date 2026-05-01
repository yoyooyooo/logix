import type { KernelRegistry, SandboxClientConfig } from './sandbox-contract'

export const sandboxKernelRegistry: KernelRegistry = {
  kernels: [
    { kernelId: 'core', label: 'core', kernelUrl: '/sandbox/logix-core.js' },
  ],
  defaultKernelId: 'core',
}

export const sandboxClientConfig: SandboxClientConfig = {
  kernelRegistry: sandboxKernelRegistry,
}
