import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'

export type RuntimeProviderPolicyMode = 'sync' | 'suspend' | 'defer'

export type YieldStrategy = 'none' | 'microtask' | 'macrotask'

export interface YieldPolicy {
  readonly strategy?: YieldStrategy
  /**
   * Only enable yield when historical init cost exceeds this threshold.
   *
   * Note: the first run still forces yield (to ensure suspend mode enters pending ASAP).
   * "First run" is memoized per runtime/session (more robust to remount/HMR).
   */
  readonly onlyWhenOverBudgetMs?: number
}

export type ModuleHandle =
  | RuntimeContracts.AnyProgram
  | Logix.Module.ModuleTag<string, Logix.AnyModuleShape>

export interface ModulePreloadPolicy {
  readonly handles: ReadonlyArray<ModuleHandle>
  readonly concurrency?: number
  readonly yield?: YieldPolicy
}

export interface RuntimeProviderPolicy {
  readonly mode?: RuntimeProviderPolicyMode
  readonly syncBudgetMs?: number
  readonly yield?: YieldPolicy
  /**
   * Only effective when mode="defer": pre-initialize critical modules after Provider commit,
   * avoiding cold start during the subtree's first render.
   *
   * - Shorthand: pass handles array directly.
   * - Full form: pass { handles, concurrency, yield }.
   */
  readonly preload?: ReadonlyArray<ModuleHandle> | ModulePreloadPolicy
}

export type ResolvedModuleResolveMode = 'sync' | 'suspend'

export interface ResolvedRuntimeProviderPolicy {
  readonly mode: RuntimeProviderPolicyMode
  readonly programMode: ResolvedModuleResolveMode
  readonly moduleTagMode: ResolvedModuleResolveMode
  readonly syncBudgetMs: number
  readonly yield: Required<Pick<YieldPolicy, 'strategy'>> & Pick<YieldPolicy, 'onlyWhenOverBudgetMs'>
  readonly preload: null | {
    readonly handles: ReadonlyArray<ModuleHandle>
    readonly concurrency: number
    readonly yield: Required<Pick<YieldPolicy, 'strategy'>> & Pick<YieldPolicy, 'onlyWhenOverBudgetMs'>
    readonly keysByModuleId: ReadonlyMap<string, string>
    readonly keysByTagId: ReadonlyMap<string, string>
  }
}

export const DEFAULT_PRELOAD_CONCURRENCY = 5
export const DEFAULT_SYNC_BUDGET_MS = 5
export const DEFAULT_YIELD_STRATEGY: YieldStrategy = 'microtask'
export const isProgramHandle = (
  handle: unknown,
): handle is RuntimeContracts.AnyProgram =>
  RuntimeContracts.hasProgramRuntimeBlueprint(handle)

const isModuleTag = (handle: unknown): handle is Logix.Module.ModuleTag<string, Logix.AnyModuleShape> => {
  if (!handle || (typeof handle !== 'object' && typeof handle !== 'function')) {
    return false
  }
  const candidate = handle as { _kind?: unknown }
  return candidate._kind === 'ModuleTag'
}

export const getPreloadKeyForModuleId = (moduleId: string): string => `preload:program:${moduleId}`
export const getPreloadKeyForTagId = (tagId: string): string => `preload:tag:${tagId}`

export const getProgramOwnerId = (handle: RuntimeContracts.AnyProgram): string =>
  RuntimeContracts.getProgramBlueprintId(handle) ?? handle.id

const normalizeYieldPolicy = (policy: YieldPolicy | undefined): ResolvedRuntimeProviderPolicy['yield'] => ({
  strategy: policy?.strategy ?? DEFAULT_YIELD_STRATEGY,
  onlyWhenOverBudgetMs: policy?.onlyWhenOverBudgetMs,
})

const normalizePreload = (
  preload: RuntimeProviderPolicy['preload'],
): null | {
  handles: ReadonlyArray<ModuleHandle>
  concurrency: number
  yield: ResolvedRuntimeProviderPolicy['yield']
} => {
  if (!preload) return null

  const policy: ModulePreloadPolicy = Array.isArray(preload)
    ? { handles: preload }
    : (preload as unknown as ModulePreloadPolicy)

  const handles: ModuleHandle[] = []
  for (const handle of policy.handles ?? []) {
    if (isProgramHandle(handle) || isModuleTag(handle)) {
      handles.push(handle)
    }
  }

  return {
    handles,
    concurrency: Math.max(1, policy.concurrency ?? DEFAULT_PRELOAD_CONCURRENCY),
    yield: normalizeYieldPolicy(policy.yield),
  }
}

export const resolveRuntimeProviderPolicy = (args: {
  readonly policy: RuntimeProviderPolicy | undefined
  readonly parentPolicy: ResolvedRuntimeProviderPolicy | null
}): ResolvedRuntimeProviderPolicy => {
  const inheritedMode = args.parentPolicy?.mode
  const mode: RuntimeProviderPolicyMode =
    args.policy?.mode ?? (inheritedMode !== undefined ? inheritedMode : ('suspend' as RuntimeProviderPolicyMode))

  const moduleResolveMode: ResolvedModuleResolveMode = mode === 'sync' ? 'sync' : 'suspend'

  const preload = mode === 'defer' ? normalizePreload(args.policy?.preload) : null

  const keysByModuleId = new Map<string, string>()
  const keysByTagId = new Map<string, string>()

  if (preload) {
    for (const handle of preload.handles) {
      if (isProgramHandle(handle)) {
        const ownerId = getProgramOwnerId(handle)
        keysByModuleId.set(ownerId, getPreloadKeyForModuleId(ownerId))
      } else if (isModuleTag(handle)) {
        const tagId = handle.id ?? 'ModuleTag'
        keysByTagId.set(tagId, getPreloadKeyForTagId(tagId))
      }
    }
  }

  return {
    mode,
    programMode: moduleResolveMode,
    moduleTagMode: moduleResolveMode,
    syncBudgetMs: Math.max(0, args.policy?.syncBudgetMs ?? args.parentPolicy?.syncBudgetMs ?? DEFAULT_SYNC_BUDGET_MS),
    yield: normalizeYieldPolicy(args.policy?.yield ?? args.parentPolicy?.yield),
    preload: preload
      ? {
          ...preload,
          keysByModuleId,
          keysByTagId,
        }
      : null,
  }
}
