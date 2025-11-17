import { Config, Effect, Layer } from 'effect'
import * as Logix from '@logix/core'
import { coreNgRuntimeServicesRegistry } from './RuntimeServices.impls.js'

export interface CoreNgKernelLayerOptions {
  readonly packageVersion?: string
  readonly buildId?: string
  readonly capabilities?: ReadonlyArray<string>
}

const parseExecVmModeEnabled = (raw: string): boolean => {
  const normalized = raw.trim().toLowerCase()
  return normalized !== 'off' && normalized !== '0' && normalized !== 'false' && normalized !== 'disabled'
}

const coreNgExecVmModeLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const execVmMode = yield* Config.string('LOGIX_CORE_NG_EXEC_VM_MODE').pipe(Config.withDefault('on'))
    const enabled = parseExecVmModeEnabled(execVmMode)
    return Logix.InternalContracts.execVmModeLayer(enabled)
  }),
) as Layer.Layer<any, never, never>

/**
 * coreNgKernelLayer：
 * - Declares the requested kernel family for this runtime tree as core-ng.
 * - Provides the injectable runtime services registry for core-ng (no overrides enabled by default).
 */
export const coreNgKernelLayer = (options: CoreNgKernelLayerOptions = {}): Layer.Layer<any, never, never> =>
  Layer.mergeAll(
    coreNgExecVmModeLayer,
    Logix.Kernel.kernelLayer({
      kernelId: 'core-ng',
      packageName: '@logix/core-ng',
      ...(options.packageVersion ? { packageVersion: options.packageVersion } : {}),
      ...(options.buildId ? { buildId: options.buildId } : {}),
      ...(options.capabilities ? { capabilities: options.capabilities } : {}),
    }),
    Logix.Kernel.runtimeServicesRegistryLayer(coreNgRuntimeServicesRegistry),
  ) as Layer.Layer<any, never, never>

/**
 * coreNgFullCutoverLayer：
 * - Explicitly enables the full cutover assembly (no fallback).
 * - Writes runtime_default overrides for all required serviceIds in the coverage matrix (implId=core-ng).
 *
 * Note: This layer is the entry point for "claiming we can switch the default / enforcing perf evidence gates".
 * For trial-only runs, keep using coreNgKernelLayer + choose overrides yourself.
 */
export const coreNgFullCutoverLayer = (options: CoreNgKernelLayerOptions = {}): Layer.Layer<any, never, never> => {
  const services: Logix.Kernel.RuntimeServicesOverrides = Object.fromEntries(
    Logix.Kernel.CutoverCoverageMatrix.requiredServiceIds.map((serviceId) => [
      serviceId,
      { implId: 'core-ng', notes: 'full-cutover: runtime_default override (SSoT=Kernel.CutoverCoverageMatrix)' },
    ]),
  )

  return Layer.mergeAll(
    coreNgKernelLayer(options),
    Logix.Kernel.fullCutoverGateModeLayer('fullCutover'),
    Logix.Kernel.runtimeDefaultServicesOverridesLayer(services),
  ) as Layer.Layer<any, never, never>
}
