import { Effect } from 'effect'
import type {
  HotLifecycleResourceRegistry,
  RuntimeResourceCategory,
  RuntimeResourceCategorySummary,
  RuntimeResourceRecord,
  RuntimeResourceRef,
  RuntimeResourceStatus,
  RuntimeResourceSummary,
} from './types.js'

const RESOURCE_CATEGORIES: ReadonlyArray<RuntimeResourceCategory> = [
  'task',
  'timer',
  'watcher',
  'subscription',
  'module-cache-entry',
  'imports-scope',
  'runtime-store-topic',
  'debug-sink',
]

const emptyCategorySummary = (): RuntimeResourceCategorySummary => ({
  active: 0,
  closing: 0,
  closed: 0,
  failed: 0,
})

type MutableRuntimeResourceCategorySummary = {
  -readonly [K in keyof RuntimeResourceCategorySummary]: RuntimeResourceCategorySummary[K]
}

export const emptyRuntimeResourceSummary = (): RuntimeResourceSummary => {
  const out = {} as RuntimeResourceSummary
  for (const category of RESOURCE_CATEGORIES) {
    out[category] = emptyCategorySummary()
  }
  return out
}

interface RegistryEntry {
  readonly ref: RuntimeResourceRef
  status: RuntimeResourceStatus
}

export const createHotLifecycleResourceRegistry = (args: { readonly ownerId: string }): HotLifecycleResourceRegistry => {
  const entries = new Map<string, RegistryEntry>()

  const toRecord = (entry: RegistryEntry): RuntimeResourceRecord => ({
    resourceId: entry.ref.resourceId,
    category: entry.ref.category,
    ownerId: entry.ref.ownerId,
    moduleId: entry.ref.moduleId,
    moduleInstanceId: entry.ref.moduleInstanceId,
    status: entry.status,
  })

  const setStatus = (resourceId: string, status: RuntimeResourceStatus): RuntimeResourceRecord | undefined => {
    const entry = entries.get(resourceId)
    if (!entry) return undefined
    entry.status = status
    return toRecord(entry)
  }

  const summary = (): RuntimeResourceSummary => {
    const out = emptyRuntimeResourceSummary()
    for (const entry of entries.values()) {
      const categorySummary = out[entry.ref.category] as MutableRuntimeResourceCategorySummary
      categorySummary[entry.status] += 1
    }
    return out
  }

  const cleanupActive = (): Effect.Effect<RuntimeResourceSummary, never, never> =>
    Effect.gen(function* () {
      for (const [resourceId, entry] of entries) {
        if (entry.status !== 'active' && entry.status !== 'closing') {
          continue
        }
        entry.status = 'closing'
        try {
          if (entry.ref.cleanup) {
            yield* entry.ref.cleanup()
          }
          entry.status = 'closed'
        } catch {
          entry.status = 'failed'
        }
        entries.set(resourceId, entry)
      }
      return summary()
    })

  return {
    ownerId: args.ownerId,
    register: (ref) => {
      const normalized: RuntimeResourceRef = {
        ...ref,
        ownerId: ref.ownerId || args.ownerId,
      }
      const entry: RegistryEntry = {
        ref: normalized,
        status: 'active',
      }
      entries.set(normalized.resourceId, entry)
      return toRecord(entry)
    },
    unregister: (resourceId) => {
      entries.delete(resourceId)
    },
    markClosing: (resourceId) => setStatus(resourceId, 'closing'),
    markClosed: (resourceId) => setStatus(resourceId, 'closed'),
    markFailed: (resourceId) => setStatus(resourceId, 'failed'),
    cleanupActive,
    activeCount: () => {
      let count = 0
      for (const entry of entries.values()) {
        if (entry.status === 'active' || entry.status === 'closing') {
          count += 1
        }
      }
      return count
    },
    records: () => Array.from(entries.values(), toRecord),
    summary,
  }
}
