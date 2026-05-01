import { Effect } from 'effect'
import type { ModuleRuntime as PublicModuleRuntime } from './module.js'
import type {
  FieldProgram,
  FieldConvergeGenerationEvidence,
  FieldConvergePlanCacheEvidence,
} from '../../field-kernel/model.js'
import type * as FieldKernelConverge from '../../field-kernel/converge.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import { setRuntimeInternals } from './runtimeInternalsAccessor.js'
import type * as RowId from '../../field-kernel/rowid.js'

export type FieldRuntimeState = {
  program: FieldProgram<any> | undefined
  convergeStaticIrDigest: string | undefined
  convergePlanCache: FieldKernelConverge.ConvergePlanCache | undefined
  convergeGeneration: FieldConvergeGenerationEvidence
  pendingCacheMissReason: FieldConvergePlanCacheEvidence['missReason'] | undefined
  /**
   * Number of times the pending miss reason has been updated since the last txn window.
   * Used for generation-thrash self-protection (multiple bumps before any txn runs).
   */
  pendingCacheMissReasonCount: number
  lastConvergeIrKeys: { readonly writersKey: string; readonly depsKey: string } | undefined
  listConfigs: ReadonlyArray<RowId.ListConfig>
}

export const installInternalHooks = <S, A>(args: {
  readonly runtime: PublicModuleRuntime<S, A>
  readonly runtimeInternals: RuntimeInternals
}): Effect.Effect<void, never, never> =>
  Effect.sync(() => {
    const { runtime, runtimeInternals } = args

    setRuntimeInternals(runtime as any, runtimeInternals)
  })
