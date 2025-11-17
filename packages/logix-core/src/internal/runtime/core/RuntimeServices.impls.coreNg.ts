import { Effect } from 'effect'
import { RuntimeServiceBuiltinsTag } from './RuntimeServiceBuiltins.js'
import type * as RuntimeKernel from './RuntimeKernel.js'

export const CORE_NG_IMPL_ID = 'core-ng' as const

const makeBuiltinAlias = (
  serviceId: string,
  options?: { readonly notes?: string },
): RuntimeKernel.RuntimeServiceImpl<any> => ({
  implId: CORE_NG_IMPL_ID,
  implVersion: 'v0',
  make: Effect.gen(function* () {
    const builtins = yield* RuntimeServiceBuiltinsTag
    const builtinMake = builtins.getBuiltinMake(serviceId)
    return (yield* builtinMake) as any
  }) as any,
  ...(options?.notes ? { notes: options.notes } : {}),
})

/**
 * coreNgRuntimeServicesRegistry：
 * - Built-in placeholder for the `core-ng` implementation shipped by `@logix/core`: currently implemented as builtin aliases
 *   to close the loop for 048 default switching and the full cutover gate.
 * - Assembly-time selection only (non-serializable); selection evidence is still produced/exported by RuntimeServicesEvidence.
 */
export const coreNgRuntimeServicesRegistry: RuntimeKernel.RuntimeServicesRegistry = {
  implsByServiceId: {
    txnQueue: [makeBuiltinAlias('txnQueue', { notes: 'full-cutover: alias builtin txnQueue' })],
    operationRunner: [makeBuiltinAlias('operationRunner', { notes: 'full-cutover: alias builtin operationRunner' })],
    transaction: [makeBuiltinAlias('transaction', { notes: 'full-cutover: alias builtin transaction ops' })],
    dispatch: [makeBuiltinAlias('dispatch', { notes: 'full-cutover: alias builtin dispatch ops' })],
  },
}
