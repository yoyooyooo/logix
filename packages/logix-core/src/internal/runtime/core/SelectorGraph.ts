import { Effect, PubSub } from 'effect'
import { isPrefixOf, normalizeFieldPath, toKey, type FieldPath, type FieldPathIdRegistry } from '../../field-path.js'
import type { ReadQueryCompiled } from './ReadQuery.js'
import type { TxnDirtyEvidenceSnapshot } from './StateTransaction.js'
import type { StateChangeWithMeta, StateCommitMeta } from './module.js'
import * as Debug from './DebugSink.js'

type ReadRootKey = string

type IndexedRootCandidate<S> = {
  readonly selectorId: string
  readonly entry: SelectorEntry<S, any>
  readonly readsForRoot: ReadonlyArray<FieldPath>
}

type DirtyRootScratchBucket = {
  generation: number
  readonly paths: Array<FieldPath>
  readonly pathKeys: Set<string>
}

type SelectorEvalEventPolicy = 'always' | 'sampled'

type SelectorEntry<S, V> = {
  readonly selectorId: string
  readonly readQuery: ReadQueryCompiled<S, V>
  readonly reads: ReadonlyArray<FieldPath>
  readonly readsByRootKey: ReadonlyMap<ReadRootKey, ReadonlyArray<FieldPath>>
  readonly readRootKeys: ReadonlyArray<ReadRootKey>
  readonly hub: PubSub.PubSub<StateChangeWithMeta<V>>
  subscriberCount: number
  lastScheduledTxnSeq: number
  cachedAtTxnSeq: number
  hasValue: boolean
  cachedValue: V | undefined
}

const MAX_CACHED_SELECTOR_ENTRIES = 256

export interface SelectorGraph<S> {
  readonly ensureEntry: <V>(
    readQuery: ReadQueryCompiled<S, V>,
  ) => Effect.Effect<SelectorEntry<S, V>, never, never>
  readonly releaseEntry: (selectorId: string) => void
  /**
   * O(1) check: whether any selector entries exist.
   *
   * Important perf contract:
   * - Avoid triggering DirtySet construction on commit when there are no selectors at all.
   */
  readonly hasAnyEntries: () => boolean
  readonly onCommit: (
    state: S,
    meta: StateCommitMeta,
    dirty: TxnDirtyEvidenceSnapshot,
    diagnosticsLevel: Debug.DiagnosticsLevel,
    onSelectorChanged?: (selectorId: string) => void,
  ) => Effect.Effect<void, never, never>
}

const getReadRootKeyFromPath = (path: FieldPath): ReadRootKey => path[0] ?? ''

const overlaps = (a: FieldPath, b: FieldPath): boolean => isPrefixOf(a, b) || isPrefixOf(b, a)

const isRedundantDirtyRoot = (existingDirtyRoots: ReadonlyArray<FieldPath>, dirtyRoot: FieldPath): boolean => {
  for (const existing of existingDirtyRoots) {
    if (isPrefixOf(existing, dirtyRoot)) {
      return true
    }
  }
  return false
}

const upsertDirtyRoot = (existingDirtyRoots: Array<FieldPath>, dirtyRoot: FieldPath): boolean => {
  if (isRedundantDirtyRoot(existingDirtyRoots, dirtyRoot)) {
    return false
  }

  let nextLength = 0
  for (let i = 0; i < existingDirtyRoots.length; i++) {
    const existing = existingDirtyRoots[i]!
    if (isPrefixOf(dirtyRoot, existing)) {
      continue
    }
    existingDirtyRoots[nextLength] = existing
    nextLength += 1
  }
  existingDirtyRoots.length = nextLength
  existingDirtyRoots.push(dirtyRoot)
  return true
}

const rebuildDirtyRootPathKeyCache = (pathKeys: Set<string>, paths: ReadonlyArray<FieldPath>): void => {
  pathKeys.clear()
  for (let i = 0; i < paths.length; i += 1) {
    pathKeys.add(toKey(paths[i]!))
  }
}

const upsertDirtyRootWithPathKeyCache = (
  existingDirtyRoots: Array<FieldPath>,
  pathKeys: Set<string>,
  dirtyRoot: FieldPath,
  fastAppendEnabled: boolean,
): boolean => {
  const dirtyRootKey = toKey(dirtyRoot)
  if (pathKeys.has(dirtyRootKey)) {
    return false
  }

  const beforeLength = existingDirtyRoots.length
  const changed = upsertDirtyRoot(existingDirtyRoots, dirtyRoot)
  if (!changed) {
    return false
  }

  if (fastAppendEnabled && existingDirtyRoots.length === beforeLength + 1) {
    pathKeys.add(dirtyRootKey)
    return true
  }

  rebuildDirtyRootPathKeyCache(pathKeys, existingDirtyRoots)
  return true
}

const equalsShallowStruct = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true
  if (!a || !b) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, k)) return false
    if (!Object.is(aObj[k], bObj[k])) return false
  }
  return true
}

const equalsValue = <V>(query: ReadQueryCompiled<any, V>, a: V, b: V): boolean => {
  if (query.equalsKind === 'custom' && typeof query.equals === 'function') {
    return query.equals(a, b)
  }
  if (query.equalsKind === 'shallowStruct') {
    return equalsShallowStruct(a, b)
  }
  return Object.is(a, b)
}

const nowMs = (): number => {
  const perf = (globalThis as any).performance as { now?: () => number } | undefined
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

const SAMPLED_SELECTOR_EVAL_SLOW_THRESHOLD_MS = 4

const shouldEvaluateEntryForDirtyRoots = <S>(args: {
  readonly entry: SelectorEntry<S, any>
  readonly dirty: TxnDirtyEvidenceSnapshot
  readonly getDirtyPath: (id: number) => FieldPath | undefined
  readonly hasRegistry: boolean
}): boolean => {
  if (args.dirty.dirtyAll) return true
  if (args.entry.reads.length === 0) return true
  if (!args.hasRegistry) return true

  for (const dirtyPathId of args.dirty.dirtyPathIds) {
    const dirtyPath = args.getDirtyPath(dirtyPathId)
    if (!dirtyPath) return true

    const dirtyRootKey = getReadRootKeyFromPath(dirtyPath)
    const readsForRoot = args.entry.readsByRootKey.get(dirtyRootKey)
    if (!readsForRoot || readsForRoot.length === 0) {
      continue
    }

    for (const read of readsForRoot) {
      if (overlaps(dirtyPath, read)) {
        return true
      }
    }
  }

  return false
}

const evaluateEntry = <S>(args: {
  readonly entry: SelectorEntry<S, any>
  readonly selectorId: string
  readonly state: S
  readonly meta: StateCommitMeta
  readonly emitEvalEvent: boolean
  readonly evalEventPolicy: SelectorEvalEventPolicy
  readonly moduleId: string
  readonly instanceId: string
  readonly onSelectorChanged?: (selectorId: string) => void
}): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    let next: any
    const evalStartedAt = args.emitEvalEvent ? nowMs() : undefined

    try {
      next = args.entry.readQuery.select(args.state)
    } catch {
      if (args.emitEvalEvent) {
        yield* Debug.record({
          type: 'diagnostic',
          moduleId: args.moduleId,
          instanceId: args.instanceId,
          txnSeq: args.meta.txnSeq,
          txnId: args.meta.txnId,
          code: 'read_query::eval_error',
          severity: 'error',
          message: 'ReadQuery selector threw during evaluation.',
          hint: 'Selectors must be pure and not throw; check the selector implementation and inputs.',
          kind: 'read_query_eval_error',
          trigger: { kind: 'read_query', name: 'selector:eval', details: { selectorId: args.selectorId } },
        })
      }
      return
    }

    const evalMs = args.emitEvalEvent && evalStartedAt != null ? Math.max(0, nowMs() - evalStartedAt) : undefined
    const hadValue = args.entry.hasValue
    const prev = args.entry.cachedValue as any
    const equal = hadValue ? equalsValue(args.entry.readQuery as any, prev, next) : false
    const changed = !hadValue || !equal

    if (changed) {
      args.entry.cachedValue = next
      args.entry.hasValue = true
      args.entry.cachedAtTxnSeq = args.meta.txnSeq
      args.onSelectorChanged?.(args.selectorId)

      yield* PubSub.publish(args.entry.hub as any, {
        value: args.entry.cachedValue,
        meta: args.meta,
      } satisfies StateChangeWithMeta<any>)
    }

    const shouldEmitEvalTrace =
      args.emitEvalEvent &&
      (args.evalEventPolicy === 'always' || changed || (evalMs != null && evalMs >= SAMPLED_SELECTOR_EVAL_SLOW_THRESHOLD_MS))

    if (!shouldEmitEvalTrace) {
      return
    }

    yield* Debug.record({
      type: 'trace:selector:eval',
      moduleId: args.moduleId,
      instanceId: args.instanceId,
      txnSeq: args.meta.txnSeq,
      txnId: args.meta.txnId,
      data: {
        selectorId: args.selectorId,
        lane: args.entry.readQuery.lane,
        producer: args.entry.readQuery.producer,
        fallbackReason: args.entry.readQuery.fallbackReason,
        readsDigest: args.entry.readQuery.readsDigest,
        equalsKind: args.entry.readQuery.equalsKind,
        changed,
        evalMs,
      },
    })
  })

export const make = <S>(args: {
  readonly moduleId: string
  readonly instanceId: string
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
}): SelectorGraph<S> => {
  const { moduleId, instanceId, getFieldPathIdRegistry } = args
  const dirtyPathKeyCacheEnabled =
    ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.LOGIX_SELECTOR_INDEX_V2_DIRTY_PATH_KEY_CACHE ??
      '1') !== '0'
  const dirtyPathKeyFastAppendEnabled =
    ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.LOGIX_SELECTOR_INDEX_V2_DIRTY_PATH_KEY_FAST_APPEND ??
      '1') !== '0'

  const activeEntriesById = new Map<string, SelectorEntry<S, any>>()
  const cachedEntriesById = new Map<string, SelectorEntry<S, any>>()
  const candidateIndexByReadRoot = new Map<ReadRootKey, Array<IndexedRootCandidate<S>>>()
  const selectorsWithoutReads = new Set<string>()
  const dirtyRootScratchBuckets = new Map<ReadRootKey, DirtyRootScratchBucket>()
  const dirtyRootScratchActiveRootKeys: Array<ReadRootKey> = []
  let dirtyRootScratchGeneration = 0

  const hasAnyEntries: SelectorGraph<S>['hasAnyEntries'] = () => activeEntriesById.size > 0

  const registerIndexedRootCandidates = (entry: SelectorEntry<S, any>): void => {
    for (const rootKey of entry.readRootKeys) {
      const readsForRoot = entry.readsByRootKey.get(rootKey)
      if (!readsForRoot || readsForRoot.length === 0) continue

      const candidate: IndexedRootCandidate<S> = {
        selectorId: entry.selectorId,
        entry,
        readsForRoot,
      }

      const bucket = candidateIndexByReadRoot.get(rootKey)
      if (bucket) {
        bucket.push(candidate)
      } else {
        candidateIndexByReadRoot.set(rootKey, [candidate])
      }
    }
  }

  const unregisterIndexedRootCandidates = (entry: SelectorEntry<S, any>): void => {
    for (const rootKey of entry.readRootKeys) {
      const bucket = candidateIndexByReadRoot.get(rootKey)
      if (!bucket) continue

      let nextLength = 0
      for (let index = 0; index < bucket.length; index += 1) {
        const candidate = bucket[index]!
        if (candidate.entry === entry) {
          continue
        }
        bucket[nextLength] = candidate
        nextLength += 1
      }
      bucket.length = nextLength

      if (bucket.length === 0) {
        candidateIndexByReadRoot.delete(rootKey)
      }
    }
  }

  const beginDirtyRootScratchGeneration = (): number => {
    dirtyRootScratchGeneration += 1
    dirtyRootScratchActiveRootKeys.length = 0
    return dirtyRootScratchGeneration
  }

  const getDirtyRootScratchBucket = (rootKey: ReadRootKey, generation: number): DirtyRootScratchBucket => {
    const existing = dirtyRootScratchBuckets.get(rootKey)
    if (existing) {
      if (existing.generation !== generation) {
        existing.generation = generation
        existing.paths.length = 0
        existing.pathKeys.clear()
        dirtyRootScratchActiveRootKeys.push(rootKey)
      }
      return existing
    }

    const created: DirtyRootScratchBucket = {
      generation,
      paths: [],
      pathKeys: new Set<string>(),
    }
    dirtyRootScratchBuckets.set(rootKey, created)
    dirtyRootScratchActiveRootKeys.push(rootKey)
    return created
  }

  const resetCachedEntryValue = (entry: SelectorEntry<S, any>): void => {
    entry.hasValue = false
    entry.cachedValue = undefined
    entry.cachedAtTxnSeq = 0
    entry.lastScheduledTxnSeq = -1
  }

  const cacheReleasedEntry = (selectorId: string, entry: SelectorEntry<S, any>): void => {
    resetCachedEntryValue(entry)

    if (cachedEntriesById.has(selectorId)) {
      cachedEntriesById.delete(selectorId)
    }
    cachedEntriesById.set(selectorId, entry)

    while (cachedEntriesById.size > MAX_CACHED_SELECTOR_ENTRIES) {
      const oldestSelectorId = cachedEntriesById.keys().next().value
      if (typeof oldestSelectorId !== 'string') {
        break
      }
      cachedEntriesById.delete(oldestSelectorId)
    }
  }

  const ensureEntry: SelectorGraph<S>['ensureEntry'] = (readQuery) => {
    const existing = activeEntriesById.get(readQuery.selectorId)
    if (existing) {
      return Effect.succeed(existing as any)
    }

    const cached = cachedEntriesById.get(readQuery.selectorId)
    if (cached) {
      cachedEntriesById.delete(readQuery.selectorId)
      activeEntriesById.set(readQuery.selectorId, cached)
      if (cached.readRootKeys.length === 0) {
        selectorsWithoutReads.add(readQuery.selectorId)
      } else {
        registerIndexedRootCandidates(cached)
      }
      return Effect.succeed(cached as any)
    }

    return Effect.gen(function* () {
      const hub = yield* PubSub.unbounded<StateChangeWithMeta<any>>()

      const reads: Array<FieldPath> = []
      const readsByRootKey = new Map<ReadRootKey, FieldPath[]>()
      const readRootKeys: Array<ReadRootKey> = []
      for (const rawRead of readQuery.reads) {
        if (typeof rawRead !== 'string') continue
        const read = normalizeFieldPath(rawRead)
        if (read == null) continue

        reads.push(read)
        const rootKey = getReadRootKeyFromPath(read)
        const bucket = readsByRootKey.get(rootKey)
        if (bucket) {
          bucket.push(read)
        } else {
          readsByRootKey.set(rootKey, [read])
          readRootKeys.push(rootKey)
        }
      }
      if (readRootKeys.length === 0) {
        selectorsWithoutReads.add(readQuery.selectorId)
      } else {
        // Build a stable per-root candidate index at registration time so commit-time
        // scheduling can reuse it directly without rebuilding transient arrays.
      }

      const entry: SelectorEntry<S, any> = {
        selectorId: readQuery.selectorId,
        readQuery: readQuery as any,
        reads,
        readsByRootKey,
        readRootKeys,
        hub,
        subscriberCount: 0,
        lastScheduledTxnSeq: -1,
        cachedAtTxnSeq: 0,
        hasValue: false,
        cachedValue: undefined,
      }
      activeEntriesById.set(readQuery.selectorId, entry)
      registerIndexedRootCandidates(entry)
      return entry as any
    })
  }

  const releaseEntry: SelectorGraph<S>['releaseEntry'] = (selectorId) => {
    const entry = activeEntriesById.get(selectorId)
    if (!entry) return
    entry.subscriberCount = Math.max(0, entry.subscriberCount - 1)
    if (entry.subscriberCount > 0) return

    activeEntriesById.delete(selectorId)
    selectorsWithoutReads.delete(selectorId)
    unregisterIndexedRootCandidates(entry)
    cacheReleasedEntry(selectorId, entry)
  }

  const onCommit: SelectorGraph<S>['onCommit'] = (state, meta, dirty, diagnosticsLevel, onSelectorChanged) =>
    Effect.gen(function* () {
      if (activeEntriesById.size === 0) return

      const emitEvalEvent =
        diagnosticsLevel === 'light' || diagnosticsLevel === 'full' || diagnosticsLevel === 'sampled'
      const evalEventPolicy: SelectorEvalEventPolicy = diagnosticsLevel === 'sampled' ? 'sampled' : 'always'

      const registry: FieldPathIdRegistry | undefined =
        dirty.dirtyAll || dirty.dirtyPathIds.length === 0 ? undefined : getFieldPathIdRegistry?.()

      const getDirtyPath = (id: number): FieldPath | undefined => {
        if (!registry) return undefined
        if (!Number.isFinite(id)) return undefined
        const idx = Math.floor(id)
        if (idx < 0) return undefined
        const path = registry.fieldPaths[idx]
        return path && Array.isArray(path) ? path : undefined
      }

      const evaluateSubscribedEntry = (entry: SelectorEntry<S, any>, selectorId: string): Effect.Effect<void> => {
        if (entry.subscriberCount === 0) return Effect.void
        if (entry.lastScheduledTxnSeq === meta.txnSeq) return Effect.void

        // evaluateEntry is total (E=never): mark before execution to dedupe multi-root scans in the same txn.
        entry.lastScheduledTxnSeq = meta.txnSeq
        return evaluateEntry({
          entry,
          selectorId,
          state,
          meta,
          emitEvalEvent,
          evalEventPolicy,
          moduleId,
          instanceId,
          onSelectorChanged,
        })
      }

      const evaluateAllSubscribedSelectors = (): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          for (const [selectorId, entry] of activeEntriesById.entries()) {
            yield* evaluateSubscribedEntry(entry, selectorId)
          }
        })

      if (activeEntriesById.size === 1) {
        const entry = activeEntriesById.values().next().value
        if (!entry) return

        if (
          !shouldEvaluateEntryForDirtyRoots({
            entry,
            dirty,
            getDirtyPath,
            hasRegistry: registry != null,
          })
        ) {
          return
        }

        yield* evaluateSubscribedEntry(entry, entry.selectorId)
        return
      }

      if (dirty.dirtyAll) {
        yield* evaluateAllSubscribedSelectors()
        return
      }

      if (!registry) {
        yield* evaluateAllSubscribedSelectors()
        return
      }

      for (const selectorId of selectorsWithoutReads) {
        const entry = activeEntriesById.get(selectorId)
        if (!entry) continue
        yield* evaluateSubscribedEntry(entry, selectorId)
      }

      const dirtyRootGeneration = beginDirtyRootScratchGeneration()
      for (const dirtyPathId of dirty.dirtyPathIds) {
        const dirtyPath = getDirtyPath(dirtyPathId)
        if (!dirtyPath) {
          yield* evaluateAllSubscribedSelectors()
          return
        }

        const rootKey = getReadRootKeyFromPath(dirtyPath)
        const scratchBucket = getDirtyRootScratchBucket(rootKey, dirtyRootGeneration)
        if (dirtyPathKeyCacheEnabled) {
          upsertDirtyRootWithPathKeyCache(
            scratchBucket.paths,
            scratchBucket.pathKeys,
            dirtyPath,
            dirtyPathKeyFastAppendEnabled,
          )
        } else {
          upsertDirtyRoot(scratchBucket.paths, dirtyPath)
        }
      }

      for (let rootIndex = 0; rootIndex < dirtyRootScratchActiveRootKeys.length; rootIndex += 1) {
        const rootKey = dirtyRootScratchActiveRootKeys[rootIndex]!
        const dirtyRootsForRoot = dirtyRootScratchBuckets.get(rootKey)?.paths
        if (!dirtyRootsForRoot || dirtyRootsForRoot.length === 0) {
          continue
        }

        const candidates = candidateIndexByReadRoot.get(rootKey)
        if (!candidates || candidates.length === 0) {
          continue
        }

        const hasRootLevelDirty = dirtyRootsForRoot.some((path) => path.length <= 1)

        for (const candidate of candidates) {
          const { entry, selectorId, readsForRoot } = candidate
          if (entry.subscriberCount === 0 || entry.lastScheduledTxnSeq === meta.txnSeq) continue

          if (hasRootLevelDirty) {
            yield* evaluateSubscribedEntry(entry, selectorId)
            continue
          }

          let overlapsAnyDirtyRoot = false
          for (const dirtyRootPath of dirtyRootsForRoot) {
            for (const read of readsForRoot) {
              if (overlaps(dirtyRootPath, read)) {
                overlapsAnyDirtyRoot = true
                break
              }
            }
            if (overlapsAnyDirtyRoot) {
              break
            }
          }
          if (!overlapsAnyDirtyRoot) continue

          yield* evaluateSubscribedEntry(entry, selectorId)
        }
      }
    })

  return { ensureEntry, releaseEntry, hasAnyEntries, onCommit }
}
