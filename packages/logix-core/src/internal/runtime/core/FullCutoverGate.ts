import type { KernelId } from './KernelRef.js'
import type { RuntimeServiceBinding, RuntimeServicesEvidence } from './RuntimeKernel.js'

export interface CutoverCoverageMatrix {
  readonly version: 'v1'
  readonly requiredServiceIds: ReadonlyArray<string>
}

export const CutoverCoverageMatrix = {
  version: 'v1',
  requiredServiceIds: ['txnQueue', 'operationRunner', 'transaction', 'dispatch'],
} as const satisfies CutoverCoverageMatrix

export type FullCutoverGateMode = 'trial' | 'fullCutover'

export interface FullCutoverGateAnchor {
  readonly moduleId: string
  readonly instanceId: string
  /**
   * Convention: txnSeq=0 denotes assembly (a wiring-time failure anchor).
   * Full Cutover Gate is evaluated during assembly by default, so it does not depend on a real txn.
   */
  readonly txnSeq: number
}

export type FullCutoverGateVerdict = 'PASS' | 'FAIL'

export interface FullCutoverGateResult {
  readonly version: 'v1'
  readonly mode: FullCutoverGateMode
  readonly requestedKernelId: KernelId
  readonly verdict: FullCutoverGateVerdict
  /**
   * fullyActivated: a stricter "full cutover" truth value.
   * - Requires every serviceId in the coverage matrix to be bound to the expected implId.
   * - Requires no fallback (any `fallback=` in overridesApplied means not fully activated).
   *
   * Note: in trial mode the verdict may be PASS while fullyActivated can still be false.
   */
  readonly fullyActivated: boolean
  readonly missingServiceIds: ReadonlyArray<string>
  readonly fallbackServiceIds: ReadonlyArray<string>
  readonly anchor: FullCutoverGateAnchor
  /**
   * When diagnostics=off, it must stay slim (avoid permanent overhead).
   * In light/full, additional explainable info is allowed (still must be serializable).
   */
  readonly details?: {
    readonly expectedImplId: string
    readonly bindings: ReadonlyArray<RuntimeServiceBinding>
    readonly overridesApplied: ReadonlyArray<string>
  }
}

const expectedImplIdForKernel = (kernelId: KernelId): string => (kernelId === 'core' ? 'builtin' : kernelId)

const parseFallbackServiceIds = (overridesApplied: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out = new Set<string>()
  for (const entry of overridesApplied) {
    if (!entry.includes('(fallback=')) continue
    const colon = entry.indexOf(':')
    if (colon < 0) continue
    const eq = entry.indexOf('=', colon + 1)
    if (eq < 0) continue
    const serviceId = entry.slice(colon + 1, eq)
    if (serviceId.length > 0) out.add(serviceId)
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b))
}

const collectMissingServiceIds = (args: {
  readonly expectedImplId: string
  readonly requiredServiceIds: ReadonlyArray<string>
  readonly bindings: ReadonlyArray<RuntimeServiceBinding>
}): ReadonlyArray<string> => {
  const bindingByServiceId = new Map<string, RuntimeServiceBinding>()
  for (const b of args.bindings) {
    bindingByServiceId.set(b.serviceId, b)
  }

  const missing: string[] = []
  for (const serviceId of args.requiredServiceIds) {
    const binding = bindingByServiceId.get(serviceId)
    const implId = binding?.implId
    if (!implId || implId !== args.expectedImplId) {
      missing.push(serviceId)
    }
  }

  return missing
}

export const evaluateFullCutoverGate = (args: {
  readonly mode: FullCutoverGateMode
  readonly requestedKernelId: KernelId
  readonly runtimeServicesEvidence: RuntimeServicesEvidence
  readonly coverageMatrix?: CutoverCoverageMatrix
  readonly diagnosticsLevel?: 'off' | 'light' | 'full' | 'sampled'
}): FullCutoverGateResult => {
  const expectedImplId = expectedImplIdForKernel(args.requestedKernelId)
  const matrix = args.coverageMatrix ?? CutoverCoverageMatrix

  const fallbackServiceIds = parseFallbackServiceIds(args.runtimeServicesEvidence.overridesApplied)
  const missingServiceIds = collectMissingServiceIds({
    expectedImplId,
    requiredServiceIds: matrix.requiredServiceIds,
    bindings: args.runtimeServicesEvidence.bindings,
  })

  const fullyActivated = missingServiceIds.length === 0 && fallbackServiceIds.length === 0

  const verdict: FullCutoverGateVerdict = args.mode === 'fullCutover' ? (fullyActivated ? 'PASS' : 'FAIL') : 'PASS'

  const moduleIdRaw = args.runtimeServicesEvidence.moduleId
  const moduleId = typeof moduleIdRaw === 'string' && moduleIdRaw.length > 0 ? moduleIdRaw : 'unknown'

  const anchor: FullCutoverGateAnchor = {
    moduleId,
    instanceId: args.runtimeServicesEvidence.instanceId,
    txnSeq: 0,
  }

  const level = args.diagnosticsLevel ?? 'off'

  return {
    version: 'v1',
    mode: args.mode,
    requestedKernelId: args.requestedKernelId,
    verdict,
    fullyActivated,
    missingServiceIds,
    fallbackServiceIds,
    anchor,
    ...(level === 'off'
      ? {}
      : {
          details: {
            expectedImplId,
            bindings: args.runtimeServicesEvidence.bindings,
            overridesApplied: args.runtimeServicesEvidence.overridesApplied,
          },
        }),
  }
}
