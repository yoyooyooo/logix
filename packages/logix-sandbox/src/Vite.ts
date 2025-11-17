import {
  logixSandboxKernelPlugin as impl,
  type LogixSandboxKernelPluginOptions,
  type VitePlugin,
} from './internal/kernel/vitePlugin'

export type { LogixSandboxKernelPluginOptions, VitePlugin } from './internal/kernel/vitePlugin'

export function logixSandboxKernelPlugin(options: LogixSandboxKernelPluginOptions = {}): VitePlugin {
  return impl(options)
}
