import { Effect } from 'effect'
import * as FullCutoverGate from './FullCutoverGate.js'
import { RuntimeServiceBuiltinsTag } from './RuntimeServiceBuiltins.js'
import type * as RuntimeKernel from './RuntimeKernel.js'

export const EXPERIMENTAL_KERNEL_IMPL_ID = 'core-experimental' as const

export const experimentalSupportMatrixRoute = {
  status: 'support-matrix-routing',
  sourceOfTruthPackage: '@logixjs/core',
  recommendedConsumerPackage: '@logixjs/core',
  supportedServiceIds: [...FullCutoverGate.CutoverCoverageMatrix.requiredServiceIds] as ReadonlyArray<string>,
} as const

export const experimentalSupportMatrixSurface = experimentalSupportMatrixRoute

const makeBuiltinAlias = (
  serviceId: string,
  options?: { readonly notes?: string },
): RuntimeKernel.RuntimeServiceImpl<any> => ({
  implId: EXPERIMENTAL_KERNEL_IMPL_ID,
  implVersion: 'v0',
  make: Effect.gen(function* () {
    const builtins = yield* Effect.service(RuntimeServiceBuiltinsTag).pipe(Effect.orDie)
    const builtinMake = builtins.getBuiltinMake(serviceId)
    return (yield* builtinMake) as any
  }) as any,
  ...(options?.notes ? { notes: options.notes } : {}),
})

/**
 * experimentalRuntimeServicesRegistry：
 * - Built-in experimental registry shipped by `@logixjs/core`: currently implemented as builtin aliases
 *   to close the loop for 048 default switching and the full cutover gate.
 * - Assembly-time selection only (non-serializable); selection evidence is still produced/exported by RuntimeServicesEvidence.
 */
export const experimentalRuntimeServicesRegistry: RuntimeKernel.RuntimeServicesRegistry = {
  implsByServiceId: {
    txnQueue: [makeBuiltinAlias('txnQueue', { notes: 'support-matrix-routing: alias builtin txnQueue' })],
    operationRunner: [
      makeBuiltinAlias('operationRunner', { notes: 'support-matrix-routing: alias builtin operationRunner' }),
    ],
    transaction: [makeBuiltinAlias('transaction', { notes: 'support-matrix-routing: alias builtin transaction ops' })],
    dispatch: [makeBuiltinAlias('dispatch', { notes: 'support-matrix-routing: alias builtin dispatch ops' })],
  },
}
