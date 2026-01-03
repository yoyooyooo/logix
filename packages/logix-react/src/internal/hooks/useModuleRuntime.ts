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

type StateOfHandle<H> =
  H extends ModuleRef<infer S, any>
    ? S
    : H extends Logix.ModuleRuntime<infer S, any>
      ? S
      : H extends Logix.ModuleTagType<any, infer Sh>
        ? Logix.StateOf<Sh>
        : never

type ActionOfHandle<H> =
  H extends ModuleRef<any, infer A>
    ? A
    : H extends Logix.ModuleRuntime<any, infer A>
      ? A
      : H extends Logix.ModuleTagType<any, infer Sh>
        ? Logix.ActionOf<Sh>
        : never

export function useModuleRuntime<H extends ReactModuleHandle>(
  handle: H,
): Logix.ModuleRuntime<StateOfHandle<H>, ActionOfHandle<H>>

export function useModuleRuntime(handle: ReactModuleHandle): Logix.ModuleRuntime<any, any> {
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
      return handle.runtime
    }

    if (isModuleRuntime(handle)) {
      return handle
    }

    const tag = handle as unknown as Logix.ModuleTagType<string, Logix.AnyModuleShape>
    const tokenId = tag.id ?? 'ModuleTag'

    const preloadKey = runtimeContext.policy.preload?.keysByTagId.get(tokenId)
    const key = preloadKey ?? `tag:${tokenId}`

    const mode = runtimeContext.policy.moduleTagMode

    const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
      (tag as unknown as Effect.Effect<Logix.ModuleRuntime<any, any>, never, any>).pipe(Scope.extend(scope))

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
    ) as Logix.ModuleRuntime<any, any>
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

  return resolved as Logix.ModuleRuntime<any, any>
}
