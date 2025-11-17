import { Config, Effect } from 'effect'
import * as Logix from '@logix/core'
import { recordExecVmEvidence } from './ExecVmEvidence.js'

export const CORE_NG_IMPL_ID = 'core-ng' as const

const makeBuiltinAlias = (
  serviceId: string,
  options?: { readonly notes?: string },
): Logix.Kernel.RuntimeServiceImpl<any> => ({
  implId: CORE_NG_IMPL_ID,
  implVersion: 'v0',
  make: Effect.gen(function* () {
    const builtins = yield* Logix.Kernel.RuntimeServiceBuiltinsTag
    const builtinMake = builtins.getBuiltinMake(serviceId)
    const impl = (yield* builtinMake) as any

    if (serviceId === 'transaction') {
      const execVmMode = yield* Config.string('LOGIX_CORE_NG_EXEC_VM_MODE').pipe(Config.withDefault('on'))
      const normalizedExecVmMode = execVmMode.trim().toLowerCase()
      const isExecVmEnabled =
        normalizedExecVmMode !== 'off' &&
        normalizedExecVmMode !== '0' &&
        normalizedExecVmMode !== 'false' &&
        normalizedExecVmMode !== 'disabled'

      const assemblyEvidence =
        typeof (impl as any)?.__logixGetExecVmAssemblyEvidence === 'function'
          ? (impl as any).__logixGetExecVmAssemblyEvidence()
          : undefined

      const convergeStaticIrDigest =
        typeof (assemblyEvidence as any)?.convergeStaticIrDigest === 'string'
          ? ((assemblyEvidence as any).convergeStaticIrDigest as string)
          : undefined
      let didRecordExecIrHash = typeof convergeStaticIrDigest === 'string' && convergeStaticIrDigest.length > 0

      const tryReadConvergeStaticIrDigest = (): string | undefined => {
        const evidence =
          typeof (impl as any)?.__logixGetExecVmAssemblyEvidence === 'function'
            ? (impl as any).__logixGetExecVmAssemblyEvidence()
            : undefined

        const digest =
          typeof (evidence as any)?.convergeStaticIrDigest === 'string'
            ? ((evidence as any).convergeStaticIrDigest as string)
            : undefined

        return typeof digest === 'string' && digest.length > 0 ? digest : undefined
      }

      yield* recordExecVmEvidence({
        version: 'v1',
        stage: 'assembly',
        hit: isExecVmEnabled,
        ...(!isExecVmEnabled
          ? {
              reasonCode: 'disabled',
              reasonDetail: `LOGIX_CORE_NG_EXEC_VM_MODE=${execVmMode}`,
            }
          : null),
        execIrVersion: convergeStaticIrDigest ? convergeStaticIrDigest.split(':')[0] : undefined,
        execIrHash: convergeStaticIrDigest,
        serviceId,
        implId: CORE_NG_IMPL_ID,
      })

      if (!isExecVmEnabled || didRecordExecIrHash) {
        return impl
      }

      const baseRunWithStateTransaction =
        typeof (impl as any).runWithStateTransaction === 'function' ? (impl as any).runWithStateTransaction : undefined

      if (!baseRunWithStateTransaction) {
        return impl
      }

      let retryBudget = 3

      const runFast = (origin: any, body: any) => baseRunWithStateTransaction(origin, body)

      let runWithStateTransaction: (origin: any, body: any) => any = (origin: any, body: any) =>
        baseRunWithStateTransaction(origin, body).pipe(
          Effect.tap(() => {
            if (didRecordExecIrHash || retryBudget <= 0) {
              runWithStateTransaction = runFast
              return Effect.void
            }

            retryBudget -= 1
            const digest = tryReadConvergeStaticIrDigest()
            if (!digest) {
              if (retryBudget <= 0) {
                runWithStateTransaction = runFast
              }
              return Effect.void
            }

            didRecordExecIrHash = true
            runWithStateTransaction = runFast
            return recordExecVmEvidence({
              version: 'v1',
              stage: 'assembly',
              hit: true,
              execIrVersion: digest.split(':')[0],
              execIrHash: digest,
              serviceId,
              implId: CORE_NG_IMPL_ID,
            })
          }),
        )

      return {
        ...impl,
        runWithStateTransaction: (origin: any, body: any) => runWithStateTransaction(origin, body),
      }
    }

    return impl
  }) as any,
  ...(options?.notes ? { notes: options.notes } : {}),
})

/**
 * coreNgRuntimeServicesRegistry：
 * - Registers only optional implementations on the core-ng side (no serialized override; only used at assembly time).
 * - Selection evidence is still produced and exported by @logix/core's RuntimeServicesEvidence.
 */
export const coreNgRuntimeServicesRegistry: Logix.Kernel.RuntimeServicesRegistry = {
  implsByServiceId: {
    txnQueue: [makeBuiltinAlias('txnQueue', { notes: 'full-cutover: alias builtin txnQueue' })],
    operationRunner: [makeBuiltinAlias('operationRunner', { notes: 'full-cutover: alias builtin operationRunner' })],
    transaction: [makeBuiltinAlias('transaction', { notes: 'full-cutover: alias builtin transaction ops' })],
    dispatch: [makeBuiltinAlias('dispatch', { notes: 'full-cutover: alias builtin dispatch ops' })],
  },
}
