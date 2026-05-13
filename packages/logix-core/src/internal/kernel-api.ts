import { Config, Effect, Layer } from 'effect'
import type { Layer as LayerType } from 'effect'
import type { DiagnosticsLevel } from './runtime/core/DebugSink.js'
import * as FullCutoverGate from './runtime/core/FullCutoverGate.js'
import * as RuntimeKernel from './runtime/core/RuntimeKernel.js'
import * as KernelRef from './runtime/core/KernelRef.js'
export {
  EXPERIMENTAL_KERNEL_IMPL_ID,
  experimentalRuntimeServicesRegistry,
  experimentalSupportMatrixRoute,
  experimentalSupportMatrixSurface,
} from './runtime/core/RuntimeServices.impls.experimental.js'
export type { RuntimeServiceBuiltins } from './runtime/core/RuntimeServiceBuiltins.js'
export { RuntimeServiceBuiltinsTag } from './runtime/core/RuntimeServiceBuiltins.js'
import { execVmModeLayer as execVmModeLayerInternal } from './field-kernel/exec-vm-mode.js'
import {
  EXPERIMENTAL_KERNEL_IMPL_ID,
  experimentalRuntimeServicesRegistry,
} from './runtime/core/RuntimeServices.impls.experimental.js'

export type KernelId = KernelRef.KernelId

export interface KernelImplementationRef extends KernelRef.KernelImplementationRef {}

export const defaultKernelImplementationRef = KernelRef.defaultKernelImplementationRef

export const isKernelImplementationRef = KernelRef.isKernelImplementationRef

export type RuntimeServiceOverride = RuntimeKernel.RuntimeServiceOverride
export type RuntimeServicesOverrides = RuntimeKernel.RuntimeServicesOverrides
export type RuntimeServiceBinding = RuntimeKernel.RuntimeServiceBinding
export type RuntimeServicesEvidence = RuntimeKernel.RuntimeServicesEvidence

export type RuntimeServiceImpl<Service> = RuntimeKernel.RuntimeServiceImpl<Service>
export type RuntimeServicesRegistry = RuntimeKernel.RuntimeServicesRegistry

export type CutoverCoverageMatrix = FullCutoverGate.CutoverCoverageMatrix

export const CutoverCoverageMatrix = FullCutoverGate.CutoverCoverageMatrix

export type FullCutoverGateMode = FullCutoverGate.FullCutoverGateMode

export type FullCutoverGateReason = FullCutoverGate.FullCutoverGateReason

export type FullCutoverGateAnchor = FullCutoverGate.FullCutoverGateAnchor

export type FullCutoverGateVerdict = FullCutoverGate.FullCutoverGateVerdict

export type FullCutoverGateResult = FullCutoverGate.FullCutoverGateResult

export const evaluateFullCutoverGate = (args: {
  readonly mode: FullCutoverGateMode
  readonly requestedKernelId: KernelId
  readonly runtimeServicesEvidence: RuntimeServicesEvidence
  readonly coverageMatrix?: CutoverCoverageMatrix
  readonly diagnosticsLevel?: DiagnosticsLevel
}): FullCutoverGateResult => {
  return FullCutoverGate.evaluateFullCutoverGate({
    mode: args.mode,
    requestedKernelId: args.requestedKernelId,
    runtimeServicesEvidence: args.runtimeServicesEvidence,
    coverageMatrix: args.coverageMatrix,
    diagnosticsLevel: args.diagnosticsLevel,
  })
}

export interface KernelContractMetaAllowlistItem {
  readonly metaKey: string
  readonly reason?: string
}

export const KernelContractMetaAllowlist = [] as const satisfies ReadonlyArray<KernelContractMetaAllowlistItem>

export interface ExperimentalLayerOptions {
  readonly packageVersion?: string
  readonly buildId?: string
  readonly capabilities?: ReadonlyArray<string>
  readonly execVmMode?: boolean
}

const parseExecVmModeEnabled = (raw: string): boolean => {
  const normalized = raw.trim().toLowerCase()
  return normalized !== 'off' && normalized !== '0' && normalized !== 'false' && normalized !== 'disabled'
}

const mergeCapabilities = (
  options: ExperimentalLayerOptions,
  extra: ReadonlyArray<string>,
): ReadonlyArray<string> | undefined => {
  const merged = Array.from(new Set([...(options.capabilities ?? []), ...extra]))
  return merged.length > 0 ? merged : undefined
}

const experimentalExecVmModeLayer = (enabled?: boolean): LayerType.Layer<any, never, never> => {
  if (enabled !== undefined) {
    return execVmModeLayerInternal(enabled) as LayerType.Layer<any, never, never>
  }

  return Layer.unwrap(
    Effect.gen(function* () {
      const execVmMode = yield* Config.string('LOGIX_CORE_EXEC_VM_MODE').pipe(Config.withDefault('on'))
      return execVmModeLayerInternal(parseExecVmModeEnabled(execVmMode))
    }),
  ) as LayerType.Layer<any, never, never>
}

const capabilityList = (
  options: ExperimentalLayerOptions,
  extra: ReadonlyArray<string>,
): { readonly capabilities: ReadonlyArray<string> } | {} => {
  const capabilities = mergeCapabilities(options, extra)
  return capabilities ? { capabilities } : {}
}

/**
 * kernelLayer:
 * - Declares the requested kernel family in the current runtime tree.
 * - This does not prove full activation; fallback/mix is decided by RuntimeServicesEvidence.
 */
export const kernelLayer = (ref: KernelImplementationRef): LayerType.Layer<any, never, never> =>
  Layer.succeed(KernelRef.KernelImplementationRefTag, ref) as LayerType.Layer<any, never, never>

/**
 * experimentalLayer:
 * - Declares the runtime as the single `core` kernel with experimental routing capabilities enabled.
 * - Installs the experimental runtime services registry and optional Exec VM mode.
 */
export const experimentalLayer = (options: ExperimentalLayerOptions = {}): LayerType.Layer<any, never, never> =>
  Layer.mergeAll(
    experimentalExecVmModeLayer(options.execVmMode),
    kernelLayer({
      kernelId: 'core',
      packageName: '@logixjs/core',
      ...(options.packageVersion ? { packageVersion: options.packageVersion } : {}),
      ...(options.buildId ? { buildId: options.buildId } : {}),
      ...capabilityList(options, ['experimental']),
    }),
    runtimeServicesRegistryLayer(experimentalRuntimeServicesRegistry),
  ) as LayerType.Layer<any, never, never>

/**
 * fullCutoverLayer:
 * - Enables the experimental registry and applies runtime_default overrides for the full cutover matrix.
 */
export const fullCutoverLayer = (options: ExperimentalLayerOptions = {}): LayerType.Layer<any, never, never> => {
  const services: RuntimeServicesOverrides = Object.fromEntries(
    CutoverCoverageMatrix.requiredServiceIds.map((serviceId) => [
      serviceId,
      { implId: EXPERIMENTAL_KERNEL_IMPL_ID, notes: 'full-cutover: runtime_default override (SSoT=Kernel.CutoverCoverageMatrix)' },
    ]),
  )

  return Layer.mergeAll(
    experimentalLayer({
      ...options,
      capabilities: mergeCapabilities(options, ['full-cutover']),
    }),
    fullCutoverGateModeLayer('fullCutover'),
    runtimeDefaultServicesOverridesLayer(services),
  ) as LayerType.Layer<any, never, never>
}

/**
 * runtimeDefaultServicesOverridesLayer:
 * - Provides `runtime_default` scope `serviceId -> implId` overrides during ManagedRuntime assembly.
 * - Does not set servicesByModuleId by default (do not use moduleId as the default kernel selection granularity).
 */
export const runtimeDefaultServicesOverridesLayer = (
  services: RuntimeServicesOverrides,
): LayerType.Layer<any, never, never> =>
  Layer.succeed(RuntimeKernel.RuntimeServicesRuntimeConfigTag, {
    services,
  }) as LayerType.Layer<any, never, never>

/**
 * getRuntimeServicesEvidence:
 * - Reads RuntimeServicesEvidence installed on a ModuleRuntime (serviceId -> implId evidence).
 * - Public entry to avoid importing from `src/internal`.
 */
export const getRuntimeServicesEvidence = RuntimeKernel.getRuntimeServicesEvidence

/**
 * getKernelImplementationRef:
 * - Reads KernelImplementationRef installed on a ModuleRuntime (requested kernel family).
 */
export const getKernelImplementationRef = KernelRef.getKernelImplementationRef

/**
 * runtimeServicesRegistryLayer:
 * - Injects additional `serviceId -> impls` during runtime assembly (e.g. experimental implementations).
 */
export const runtimeServicesRegistryLayer = (registry: RuntimeServicesRegistry): LayerType.Layer<any, never, never> =>
  Layer.succeed(RuntimeKernel.RuntimeServicesRegistryTag, registry) as LayerType.Layer<any, never, never>

/**
 * fullCutoverGateModeLayer:
 * - Controls cutover gate evaluation mode during runtime assembly (trial/fullCutover).
 * - Default is fullCutover; trial-run/comparison may override to trial explicitly.
 */
export const fullCutoverGateModeLayer = (mode: FullCutoverGateMode): LayerType.Layer<any, never, never> =>
  Layer.succeed(RuntimeKernel.FullCutoverGateModeTag, mode) as LayerType.Layer<any, never, never>

/**
 * isKernelFullyActivated:
 * - Minimal verdict for "full cutover": no fallbacks are allowed.
 */
export const isKernelFullyActivated = (evidence: RuntimeServicesEvidence): boolean =>
  !evidence.overridesApplied.some((s) => s.includes('fallback='))
