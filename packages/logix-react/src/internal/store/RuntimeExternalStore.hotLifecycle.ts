import type * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'

export interface RuntimeExternalStoreHotLifecycleSummary {
  readonly closed: number
  readonly failed: number
}

type StoreDisposer = () => void

const disposersByRuntime = new WeakMap<object, Map<string, StoreDisposer>>()

export const registerRuntimeExternalStoreDisposer = (
  runtime: object,
  topicKey: string,
  dispose: StoreDisposer,
): void => {
  const map = disposersByRuntime.get(runtime) ?? new Map<string, StoreDisposer>()
  map.set(topicKey, dispose)
  disposersByRuntime.set(runtime, map)
}

export const unregisterRuntimeExternalStoreDisposer = (runtime: object, topicKey: string): void => {
  const map = disposersByRuntime.get(runtime)
  if (!map) return
  map.delete(topicKey)
  if (map.size === 0) {
    disposersByRuntime.delete(runtime)
  }
}

export const disposeRuntimeExternalStoresForHotLifecycle = (
  runtime: object,
): RuntimeExternalStoreHotLifecycleSummary => {
  const map = disposersByRuntime.get(runtime)
  if (!map) {
    return { closed: 0, failed: 0 }
  }

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
  disposersByRuntime.delete(runtime)
  return { closed, failed }
}

export const toExternalStoreHostCleanupSummary = (
  summary: RuntimeExternalStoreHotLifecycleSummary,
): RuntimeContracts.HostBindingCleanupSummary =>
  summary.closed === 0 && summary.failed === 0
    ? {}
    : {
        'external-store-listener': {
          closed: summary.closed,
          failed: summary.failed,
        },
      }
