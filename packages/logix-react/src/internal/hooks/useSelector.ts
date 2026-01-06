import { useContext, useEffect, useMemo } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import * as Logix from '@logix/core'
import { RuntimeContext } from '../provider/ReactContext.js'
import { ReactModuleHandle, useModuleRuntime } from './useModuleRuntime.js'
import { isDevEnv } from '../provider/env.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'
import { getRuntimeModuleExternalStore, getRuntimeReadQueryExternalStore } from '../store/RuntimeExternalStore.js'
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
    () => (typeof selector === 'function' ? Logix.ReadQuery.compile(selector) : undefined),
    [selector],
  )

  const actualEqualityFn = useMemo(() => {
    if (typeof equalityFn === 'function') return equalityFn
    if (typeof selector !== 'function') return Object.is
    return selectorReadQuery?.equalsKind === 'shallowStruct' ? shallow : Object.is
  }, [equalityFn, selector, selectorReadQuery?.equalsKind])

  const selectorTopicEligible =
    typeof selector === 'function' &&
    selectorReadQuery?.lane === 'static' &&
    selectorReadQuery.readsDigest != null &&
    selectorReadQuery.fallbackReason == null

  const store = useMemo(
    () =>
      selectorTopicEligible && selectorReadQuery
        ? getRuntimeReadQueryExternalStore(runtime, moduleRuntime, selectorReadQuery, {
            lowPriorityDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityDelayMs,
            lowPriorityMaxDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityMaxDelayMs,
          })
        : getRuntimeModuleExternalStore(
            runtime,
            moduleRuntime,
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
      selectorTopicEligible,
    ],
  )

  const selected = useSyncExternalStoreWithSelector<unknown, V>(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot ?? store.getSnapshot,
    selectorTopicEligible ? (snapshot) => snapshot as V : (snapshot) => actualSelector(snapshot as StateOfHandle<H>),
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

    type SelectorMeta = {
      readonly fieldPaths?: unknown
      readonly debugKey?: unknown
    }

    let fieldPaths: ReadonlyArray<string> | undefined
    let selectorKey: string | undefined

    if (typeof selector === 'function') {
      const meta = selector as typeof selector & SelectorMeta

      const rawFieldPaths = meta.fieldPaths
      if (Array.isArray(rawFieldPaths)) {
        const paths = rawFieldPaths.filter((p): p is string => typeof p === 'string')
        fieldPaths = paths.length > 0 ? paths.slice() : undefined
      }

      const rawDebugKey = meta.debugKey
      selectorKey =
        typeof rawDebugKey === 'string' && rawDebugKey.length > 0
          ? rawDebugKey
          : typeof selector.name === 'string' && selector.name.length > 0
            ? selector.name
            : undefined
    }

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
    })

    runtime.runFork(effect)
  }, [runtime, moduleRuntime, selector, selected, selectorReadQuery])

  return selected
}
