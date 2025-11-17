import { useContext, useEffect, useMemo } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import * as Logix from '@logix/core'
import { Effect } from 'effect'
import { RuntimeContext } from '../provider/ReactContext.js'
import { ReactModuleHandle, useModuleRuntime } from './useModuleRuntime.js'
import { isDevEnv } from '../provider/env.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'
import { getModuleRuntimeExternalStore } from '../store/ModuleRuntimeExternalStore.js'
import { getModuleRuntimeSelectorExternalStore } from '../store/ModuleRuntimeSelectorExternalStore.js'
import type { ModuleRef } from '../store/ModuleRef.js'
import { shallow } from './shallow.js'

// Infers the State type from the handle: supports both ModuleRuntime and ModuleTag (Tag).
type StateOfHandle<H> =
  H extends ModuleRef<infer S, any>
    ? S
    : H extends Logix.ModuleRuntime<infer S, any>
      ? S
      : H extends Logix.ModuleTagType<any, infer Sh>
        ? Logix.StateOf<Sh>
        : never

export function useSelector<H extends ReactModuleHandle>(handle: H): StateOfHandle<H>

export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector: (state: StateOfHandle<H>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector?: (state: StateOfHandle<H>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V | StateOfHandle<H> {
  const runtimeContext = useContext(RuntimeContext)
  if (!runtimeContext) {
    throw new RuntimeProviderNotFoundError('useSelector')
  }

  const runtime = runtimeContext.runtime
  const moduleRuntime = useModuleRuntime(handle)

  const actualSelector: (state: StateOfHandle<H>) => V =
    selector ?? ((state: StateOfHandle<H>) => state as unknown as V)

  const selectorReadQuery = useMemo(
    () => (typeof selector === 'function' ? Logix.ReadQuery.compile(selector as any) : undefined),
    [selector],
  )

  const actualEqualityFn = useMemo(() => {
    if (typeof equalityFn === 'function') return equalityFn
    if (typeof selector !== 'function') return Object.is
    return selectorReadQuery?.equalsKind === 'shallowStruct' ? shallow : Object.is
  }, [equalityFn, selector, selectorReadQuery?.equalsKind])

  const useStaticLane = typeof selector === 'function' && selectorReadQuery?.lane === 'static'

  const store = useMemo(
    () =>
      useStaticLane && selectorReadQuery
        ? getModuleRuntimeSelectorExternalStore(
            runtime,
            moduleRuntime as unknown as Logix.ModuleRuntime<StateOfHandle<H>, any>,
            selectorReadQuery as any,
            {
              lowPriorityDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityDelayMs,
              lowPriorityMaxDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityMaxDelayMs,
            },
          )
        : getModuleRuntimeExternalStore(
            runtime,
            moduleRuntime as unknown as Logix.ModuleRuntime<StateOfHandle<H>, any>,
            {
              lowPriorityDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityDelayMs,
              lowPriorityMaxDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityMaxDelayMs,
            },
          ),
    [
      moduleRuntime,
      runtime,
      runtimeContext.reactConfigSnapshot.lowPriorityDelayMs,
      runtimeContext.reactConfigSnapshot.lowPriorityMaxDelayMs,
      selectorReadQuery,
      useStaticLane,
    ],
  )

  const selected = useSyncExternalStoreWithSelector<unknown, V>(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
    useStaticLane ? (snapshot) => snapshot as V : (snapshot) => actualSelector(snapshot as StateOfHandle<H>),
    actualEqualityFn,
  )

  // Emit a trace:react-selector Debug event after React commit:
  // - Enabled only in dev/test to avoid production overhead.
  // - Normalized via DebugSink -> RuntimeDebugEventRef for Devtools consumption.
  useEffect(() => {
    if (!isDevEnv() && !Logix.Debug.isDevtoolsEnabled()) {
      return
    }

    const instanceId = moduleRuntime.instanceId

    const selectorFn = selector as any
    const fieldPaths: ReadonlyArray<string> | undefined =
      selectorFn && Array.isArray(selectorFn.fieldPaths) ? selectorFn.fieldPaths.slice() : undefined

    const selectorKey: string | undefined =
      (selectorFn && typeof selectorFn.debugKey === 'string' && selectorFn.debugKey.length > 0
        ? selectorFn.debugKey
        : undefined) ??
      (typeof selectorFn === 'function' && typeof selectorFn.name === 'string' && selectorFn.name.length > 0
        ? selectorFn.name
        : undefined)

    const effect = Logix.Debug.record({
      type: 'trace:react-selector',
      moduleId: moduleRuntime.moduleId,
      instanceId,
      data: {
        componentLabel: 'useSelector',
        selectorKey,
        fieldPaths,
        selectorId: selectorReadQuery?.selectorId,
        lane: selectorReadQuery?.lane,
        producer: selectorReadQuery?.producer,
        fallbackReason: selectorReadQuery?.fallbackReason,
        readsDigest: selectorReadQuery?.readsDigest,
        equalsKind: selectorReadQuery?.equalsKind,
        strictModePhase: 'commit',
      },
    }) as Effect.Effect<void, never, any>

    runtime.runFork(effect)
  }, [runtime, moduleRuntime, selector, selected, selectorReadQuery])

  return selected
}
