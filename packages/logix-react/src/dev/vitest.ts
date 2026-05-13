import {
  clearInstalledLogixDevLifecycleCarrier,
  installLogixDevLifecycleCarrier,
  type LogixDevLifecycleCarrier,
  type LogixDevLifecycleCarrierOptions,
} from './lifecycle.js'

export interface LogixDevLifecycleVitestOptions extends Omit<LogixDevLifecycleCarrierOptions, 'hostKind'> {}

export const installLogixDevLifecycleForVitest = (
  options: LogixDevLifecycleVitestOptions = {},
): LogixDevLifecycleCarrier =>
  installLogixDevLifecycleCarrier({
    ...options,
    hostKind: 'vitest',
    carrierId: options.carrierId ?? '@logixjs/react:vitest-dev-lifecycle',
  })

export const resetLogixDevLifecycleForVitest = (): void => {
  clearInstalledLogixDevLifecycleCarrier()
}
