import type { ModuleRuntime as PublicModuleRuntime } from './module.js'
import { makeModuleInstanceKey, type ModuleInstanceKey } from './RuntimeStore.js'
import { normalizeNonEmptyString } from './normalize.js'
import type { ModuleRuntimeOptions } from './ModuleRuntime.impl.js'

let nextInstanceSeq = 0

export const makeDefaultInstanceId = (): string => {
  nextInstanceSeq += 1
  return `i${nextInstanceSeq}`
}

export type ResolvedModuleRuntimeMakeOptions<S, A, R> = {
  readonly moduleId: string
  readonly instanceId: string
  readonly moduleInstanceKey: ModuleInstanceKey
  readonly publicTag: ModuleRuntimeOptions<S, A, R>['tag']
}

export const resolveModuleRuntimeMakeOptions = <S, A, R>(
  options: ModuleRuntimeOptions<S, A, R>,
): ResolvedModuleRuntimeMakeOptions<S, A, R> => {
  const moduleId = options.moduleId ?? 'unknown'
  const instanceId = normalizeNonEmptyString(options.instanceId) ?? makeDefaultInstanceId()
  return {
    moduleId,
    instanceId,
    moduleInstanceKey: makeModuleInstanceKey(moduleId, instanceId),
    publicTag: options.tag as ModuleRuntimeOptions<S, A, R>['tag'] | undefined,
  }
}

export type ModuleRuntimePublicTag<S, A> = ModuleRuntimeOptions<S, A, never>['tag'] & {
  readonly __publicModuleRuntime?: PublicModuleRuntime<S, A>
}
