import { useEffect, useMemo, useContext } from 'react'
import * as Logix from '@logix/core'
import { Effect, Scope } from 'effect'
import { useRuntime } from './useRuntime.js'
import { isModuleRef, type ModuleRef } from '../store/ModuleRef.js'
import { RuntimeContext } from '../provider/ReactContext.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'
import { getModuleCache, type ModuleCacheFactory } from '../store/ModuleCache.js'
import { isDevEnv } from '../provider/env.js'

const isModuleRuntime = (value: unknown): value is Logix.ModuleRuntime<any, any> =>
  typeof value === 'object' && value !== null && 'dispatch' in value && 'getState' in value

export type ReactModuleHandle = Logix.ModuleRuntime<any, any> | Logix.ModuleTagType<any, any> | ModuleRef<any, any>

export function useModuleRuntime<Sh extends Logix.AnyModuleShape>(
  handle: ReactModuleHandle,
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
  const runtime = useRuntime()
  const runtimeContext = useContext(RuntimeContext)
  if (!runtimeContext) {
    throw new RuntimeProviderNotFoundError('useModuleRuntime')
  }

  const cache = useMemo(
    () => getModuleCache(runtimeContext.runtime, runtimeContext.reactConfigSnapshot, runtimeContext.configVersion),
    [runtimeContext.runtime, runtimeContext.reactConfigSnapshot, runtimeContext.configVersion],
  )

  const isTagHandle = !isModuleRef(handle) && !isModuleRuntime(handle)

  const resolved = useMemo(() => {
    if (isModuleRef(handle)) {
      return handle.runtime as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
    }

    if (isModuleRuntime(handle)) {
      return handle as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
    }

    const tag = handle as unknown as Logix.ModuleTagType<string, Logix.AnyModuleShape>
    const tokenId = tag.id ?? 'ModuleTag'

    const preloadKey = runtimeContext.policy.preload?.keysByTagId.get(tokenId)
    const key = preloadKey ?? `tag:${tokenId}`

    const mode = runtimeContext.policy.moduleTagMode

    const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
      (tag as unknown as Effect.Effect<Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>, never, any>).pipe(
        Scope.extend(scope),
      )

    return (
      mode === 'suspend'
        ? cache.read(key, factory, undefined, tokenId, {
            entrypoint: 'react.useModuleRuntime',
            policyMode: runtimeContext.policy.mode,
            yield: runtimeContext.policy.yield,
          })
        : cache.readSync(key, factory, undefined, tokenId, {
            entrypoint: 'react.useModuleRuntime',
            policyMode: runtimeContext.policy.mode,
            warnSyncBlockingThresholdMs: 5,
          })
    ) as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
  }, [cache, runtimeContext.policy, handle])

  useEffect(() => {
    if (!isTagHandle) {
      return
    }
    if (!isDevEnv() && !Logix.Debug.isDevtoolsEnabled()) {
      return
    }

    const tokenId = (handle as any)?.id ?? 'ModuleTag'

    const effect = Logix.Debug.record({
      type: 'trace:react.moduleTag.resolve',
      moduleId: (resolved as any).moduleId,
      instanceId: (resolved as any).instanceId,
      data: {
        mode: runtimeContext.policy.moduleTagMode,
        tokenId,
        yieldStrategy: runtimeContext.policy.yield.strategy,
      },
    })

    runtime.runFork(effect)
  }, [runtime, runtimeContext.policy, resolved, handle, isTagHandle])

  return resolved
}
