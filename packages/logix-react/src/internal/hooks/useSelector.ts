import React, { useContext, useEffect, useMemo, useRef } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import * as Logix from '@logixjs/core'
import { RuntimeContext } from '../provider/ReactContext.js'
import type { ReactModuleHandle, StateOfHandle } from './useModuleRuntime.js'
import { useModuleRuntime } from './useModuleRuntime.js'
import { isDevEnv } from '../provider/env.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'
import {
  getRuntimeExternalStoreLastPulseEnvelope,
  getRuntimeModuleExternalStore,
  getRuntimeReadQueryExternalStore,
  runtimeSelectorDeltaMaybeChanged,
  subscribeRuntimeExternalStoreWithComponentMultiplex,
} from '../store/RuntimeExternalStore.js'
import { shallow } from './shallow.js'

type ReactInternalsA = {
  readonly getOwner?: () => unknown
}

type ReactInternalsCurrentOwner = {
  readonly current: unknown
}

type ReactInternalsLike = {
  readonly A?: ReactInternalsA
  readonly ReactCurrentOwner?: ReactInternalsCurrentOwner
}

type ReactWithInternals = typeof React & {
  readonly __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: ReactInternalsLike
  readonly __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: ReactInternalsLike
}

const NO_SELECTED_VALUE = Symbol('logix-react:useSelector-no-selected-value')

const readCurrentComponentOwner = (): object | undefined => {
  const reactWithInternals = React as ReactWithInternals
  const internals =
    reactWithInternals.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
    reactWithInternals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED

  if (!internals) return undefined

  const ownerFromDispatcher = internals.A?.getOwner?.()
  if (ownerFromDispatcher && typeof ownerFromDispatcher === 'object') {
    return ownerFromDispatcher as object
  }

  const ownerFromLegacyField = internals.ReactCurrentOwner?.current
  if (ownerFromLegacyField && typeof ownerFromLegacyField === 'object') {
    return ownerFromLegacyField as object
  }

  return undefined
}

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
  const hookListenerIdRef = useRef<symbol | undefined>(undefined)
  if (!hookListenerIdRef.current) {
    hookListenerIdRef.current = Symbol('logix-react:useSelector-listener')
  }

  const componentOwnerRef = useRef<object | null | undefined>(undefined)
  if (componentOwnerRef.current === undefined) {
    componentOwnerRef.current = readCurrentComponentOwner() ?? null
  }
  const componentOwner = componentOwnerRef.current ?? undefined

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
    selectorReadQuery != null &&
    selectorReadQuery.fallbackReason !== 'unstableSelectorId' &&
    selectorReadQuery.staticIr.fallbackReason !== 'unstableSelectorId'

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

  const selectFromSnapshot = useMemo(
    () =>
      selectorTopicEligible
        ? ((snapshot: unknown) => snapshot as V)
        : ((snapshot: unknown) => actualSelector(snapshot as StateOfHandle<H>)),
    [actualSelector, selectorTopicEligible],
  )

  const lastSelectedRef = useRef<V | typeof NO_SELECTED_VALUE>(NO_SELECTED_VALUE)
  const equalityRef = useRef(actualEqualityFn)
  equalityRef.current = actualEqualityFn

  const subscribe = useMemo(() => {
    const shouldNotify = (): boolean => {
      const previousSelected = lastSelectedRef.current
      if (previousSelected === NO_SELECTED_VALUE) return true

      if (selectorTopicEligible && selectorReadQuery) {
        const envelope = getRuntimeExternalStoreLastPulseEnvelope(store)
        if (envelope && !runtimeSelectorDeltaMaybeChanged(envelope.selectorDelta, selectorReadQuery.selectorId)) {
          return false
        }
      }

      try {
        const nextSelected = selectFromSnapshot(store.getSnapshot())
        return !equalityRef.current(previousSelected as V, nextSelected)
      } catch {
        return true
      }
    }

    if (!componentOwner) {
      return (listener: () => void) =>
        store.subscribe(() => {
          if (shouldNotify()) {
            listener()
          }
        })
    }
    const hookListenerId = hookListenerIdRef.current as symbol
    return (listener: () => void) =>
      subscribeRuntimeExternalStoreWithComponentMultiplex(store, componentOwner, hookListenerId, listener, {
        shouldNotify,
      })
  }, [componentOwner, selectFromSnapshot, selectorReadQuery, selectorTopicEligible, store])

  const selected = useSyncExternalStoreWithSelector<unknown, V>(
    subscribe,
    store.getSnapshot,
    store.getServerSnapshot ?? store.getSnapshot,
    selectFromSnapshot,
    actualEqualityFn,
  )

  useEffect(() => {
    lastSelectedRef.current = selected as V
  }, [selected])

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
