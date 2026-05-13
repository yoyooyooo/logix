import { Effect } from 'effect'
import { useEffect } from 'react'
import type { ManagedRuntime } from 'effect'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import {
  disposeRuntimeExternalStoresForHotLifecycle,
  toExternalStoreHostCleanupSummary,
} from '../store/RuntimeExternalStore.hotLifecycle.js'

type HostBindingDisposer = () => void

export type ReactHotLifecycleBinding = {
  readonly owner: RuntimeContracts.RuntimeHotLifecycleOwner
  readonly disposeHostBindings: () => RuntimeContracts.HostBindingCleanupSummary
  readonly reset: (nextRuntime: ManagedRuntime.ManagedRuntime<any, any>, nextRuntimeInstanceId?: string) => Effect.Effect<
    RuntimeContracts.RuntimeHotLifecycleTransition,
    never,
    never
  >
  readonly dispose: () => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition, never, never>
}

const runtimeInstanceIds = new WeakMap<object, string>()
const hostBindingDisposersByRuntime = new WeakMap<object, Map<string, HostBindingDisposer>>()
let runtimeInstanceSeq = 0

export const registerRuntimeHostBindingDisposer = (
  runtime: object,
  bindingId: string,
  dispose: HostBindingDisposer,
): void => {
  const map = hostBindingDisposersByRuntime.get(runtime) ?? new Map<string, HostBindingDisposer>()
  map.set(bindingId, dispose)
  hostBindingDisposersByRuntime.set(runtime, map)
}

export const unregisterRuntimeHostBindingDisposer = (runtime: object, bindingId: string): void => {
  const map = hostBindingDisposersByRuntime.get(runtime)
  if (!map) return
  map.delete(bindingId)
  if (map.size === 0) {
    hostBindingDisposersByRuntime.delete(runtime)
  }
}

export const disposeRuntimeHostBindingsForHotLifecycle = (
  runtime: object,
): RuntimeContracts.HostBindingCleanupSummary => {
  const map = hostBindingDisposersByRuntime.get(runtime)
  if (!map) return {}

  let closed = 0
  let failed = 0
  for (const dispose of map.values()) {
    try {
      dispose()
      closed += 1
    } catch {
      failed += 1
    }
  }
  map.clear()
  hostBindingDisposersByRuntime.delete(runtime)
  return closed === 0 && failed === 0
    ? {}
    : {
        'provider-layer-overlay': {
          closed,
          failed,
        },
      }
}

export const getReactRuntimeInstanceId = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  explicit?: string,
): string => {
  if (explicit && explicit.length > 0) {
    runtimeInstanceIds.set(runtime as unknown as object, explicit)
    return explicit
  }
  const cached = runtimeInstanceIds.get(runtime as unknown as object)
  if (cached) return cached
  runtimeInstanceSeq += 1
  const next = `react-runtime:${runtimeInstanceSeq}`
  runtimeInstanceIds.set(runtime as unknown as object, next)
  return next
}

export const mergeHostCleanupSummaries = (
  summaries: ReadonlyArray<RuntimeContracts.HostBindingCleanupSummary | undefined>,
): RuntimeContracts.HostBindingCleanupSummary => {
  const out: Record<string, { closed: number; failed: number }> = {}
  for (const summary of summaries) {
    if (!summary) continue
    for (const [category, value] of Object.entries(summary)) {
      if (!value) continue
      const current = out[category] ?? { closed: 0, failed: 0 }
      current.closed += value.closed
      current.failed += value.failed
      out[category] = current
    }
  }
  return out as RuntimeContracts.HostBindingCleanupSummary
}

export const disposeHostBindingsForRuntime = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
): RuntimeContracts.HostBindingCleanupSummary => {
  const externalStoreSummary = disposeRuntimeExternalStoresForHotLifecycle(runtime as unknown as object)
  const hostBindingSummary = disposeRuntimeHostBindingsForHotLifecycle(runtime as unknown as object)
  return mergeHostCleanupSummaries([
    toExternalStoreHostCleanupSummary(externalStoreSummary),
    hostBindingSummary,
  ])
}

export const useRuntimeHotLifecycleProjectionCleanup = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
): void => {
  useEffect(() => {
    return () => {
      disposeHostBindingsForRuntime(runtime)
    }
  }, [runtime])
}

export const createReactHotLifecycleBinding = (args: {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly ownerId: string
  readonly runtimeInstanceId?: string
  readonly cleanup?: () => Effect.Effect<void, never, never>
}): ReactHotLifecycleBinding => {
  const runtimeInstanceId = getReactRuntimeInstanceId(args.runtime, args.runtimeInstanceId)
  const owner = RuntimeContracts.getOrCreateRuntimeHotLifecycleOwner(args.runtime as unknown as object, {
    ownerId: args.ownerId,
    runtimeInstanceId,
    cleanup: args.cleanup,
  })

  return {
    owner,
    disposeHostBindings: () => disposeHostBindingsForRuntime(args.runtime),
    reset: (nextRuntime, nextRuntimeInstanceId) => {
      const hostCleanupSummary = disposeHostBindingsForRuntime(args.runtime)
      return owner.reset({
        nextRuntimeInstanceId: getReactRuntimeInstanceId(nextRuntime, nextRuntimeInstanceId),
        hostCleanupSummary,
      })
    },
    dispose: () => {
      const hostCleanupSummary = disposeHostBindingsForRuntime(args.runtime)
      return owner.dispose({ hostCleanupSummary })
    },
  }
}
