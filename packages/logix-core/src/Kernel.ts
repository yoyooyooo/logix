import { Layer } from 'effect'
import type { Layer as LayerType } from 'effect'
import type * as Debug from './Debug.js'
import * as FullCutoverGate from './internal/runtime/core/FullCutoverGate.js'
import * as RuntimeKernel from './internal/runtime/core/RuntimeKernel.js'
import * as KernelRef from './internal/runtime/core/KernelRef.js'
export type { RuntimeServiceBuiltins } from './internal/runtime/core/RuntimeServiceBuiltins.js'
export { RuntimeServiceBuiltinsTag } from './internal/runtime/core/RuntimeServiceBuiltins.js'

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

export type FullCutoverGateAnchor = FullCutoverGate.FullCutoverGateAnchor

export type FullCutoverGateVerdict = FullCutoverGate.FullCutoverGateVerdict

export type FullCutoverGateResult = FullCutoverGate.FullCutoverGateResult

export const evaluateFullCutoverGate = (args: {
  readonly mode: FullCutoverGateMode
  readonly requestedKernelId: KernelId
  readonly runtimeServicesEvidence: RuntimeServicesEvidence
  readonly coverageMatrix?: CutoverCoverageMatrix
  readonly diagnosticsLevel?: Debug.DiagnosticsLevel
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

/**
 * kernelLayer:
 * - Declares the requested kernel family in the current runtime tree.
 * - This does not prove full activation; fallback/mix is decided by RuntimeServicesEvidence.
 */
export const kernelLayer = (ref: KernelImplementationRef): LayerType.Layer<any, never, never> =>
  Layer.succeed(KernelRef.KernelImplementationRefTag, ref) as LayerType.Layer<any, never, never>

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
 * - Injects additional `serviceId -> impls` during runtime assembly (e.g. implementations provided by core-ng).
 */
export const runtimeServicesRegistryLayer = (registry: RuntimeServicesRegistry): LayerType.Layer<any, never, never> =>
  Layer.succeed(RuntimeKernel.RuntimeServicesRegistryTag, registry) as LayerType.Layer<any, never, never>

/**
 * fullCutoverGateModeLayer:
 * - Controls cutover gate evaluation mode during runtime assembly (trial/fullCutover).
 * - The default path (048) should explicitly set fullCutover; trial-run/comparison may override to trial.
 */
export const fullCutoverGateModeLayer = (mode: FullCutoverGateMode): LayerType.Layer<any, never, never> =>
  Layer.succeed(RuntimeKernel.FullCutoverGateModeTag, mode) as LayerType.Layer<any, never, never>

/**
 * isKernelFullyActivated:
 * - Minimal verdict for "full cutover": no fallbacks are allowed.
 */
export const isKernelFullyActivated = (evidence: RuntimeServicesEvidence): boolean =>
  !evidence.overridesApplied.some((s) => s.includes('fallback='))
