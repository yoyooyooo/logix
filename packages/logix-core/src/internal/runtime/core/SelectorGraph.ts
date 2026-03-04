import { Effect, PubSub, Scope } from 'effect'
import { isPrefixOf, normalizeFieldPath, type DirtySet, type FieldPath, type FieldPathIdRegistry } from '../../field-path.js'
import type { ReadQueryCompiled } from './ReadQuery.js'
import type { StateChangeWithMeta, StateCommitMeta } from './module.js'
import * as Debug from './DebugSink.js'

type ReadRootKey = string

type IndexedRootCandidate<S> = {
  readonly selectorId: string
  readonly entry: SelectorEntry<S, any>
  readonly readsForRoot: ReadonlyArray<FieldPath>
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

export interface SelectorGraph<S> {
  readonly ensureEntry: <V>(
    readQuery: ReadQueryCompiled<S, V>,
  ) => Effect.Effect<SelectorEntry<S, V>, never, Scope.Scope>
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
    dirtySet: DirtySet,
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
  readonly dirtySet: DirtySet
  readonly getDirtyRootPath: (id: number) => FieldPath | undefined
  readonly hasRegistry: boolean
}): boolean => {
  if (args.dirtySet.dirtyAll) return true
  if (args.entry.reads.length === 0) return true
  if (!args.hasRegistry) return true

  for (const dirtyRootId of args.dirtySet.rootIds) {
    const dirtyRoot = args.getDirtyRootPath(dirtyRootId)
    if (!dirtyRoot) return true

    const dirtyRootKey = getReadRootKeyFromPath(dirtyRoot)
    const readsForRoot = args.entry.readsByRootKey.get(dirtyRootKey)
    if (!readsForRoot || readsForRoot.length === 0) {
      continue
    }

    for (const read of readsForRoot) {
      if (overlaps(dirtyRoot, read)) {
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

  const selectorsById = new Map<string, SelectorEntry<S, any>>()
  const indexByReadRoot = new Map<ReadRootKey, Set<string>>()
  const selectorsWithoutReads = new Set<string>()

  const hasAnyEntries: SelectorGraph<S>['hasAnyEntries'] = () => selectorsById.size > 0

  const ensureEntry: SelectorGraph<S>['ensureEntry'] = (readQuery) => {
    const existing = selectorsById.get(readQuery.selectorId)
    if (existing) {
      return Effect.succeed(existing as any)
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
        for (const rootKey of readRootKeys) {
          const set = indexByReadRoot.get(rootKey)
          if (set) {
            set.add(readQuery.selectorId)
          } else {
            indexByReadRoot.set(rootKey, new Set([readQuery.selectorId]))
          }
        }
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
      selectorsById.set(readQuery.selectorId, entry)
      return entry as any
    })
  }

  const releaseEntry: SelectorGraph<S>['releaseEntry'] = (selectorId) => {
    const entry = selectorsById.get(selectorId)
    if (!entry) return
    entry.subscriberCount = Math.max(0, entry.subscriberCount - 1)
    if (entry.subscriberCount > 0) return

    selectorsById.delete(selectorId)
    selectorsWithoutReads.delete(selectorId)
    for (const rootKey of entry.readRootKeys) {
      const set = indexByReadRoot.get(rootKey)
      if (!set) continue
      set.delete(selectorId)
      if (set.size === 0) {
        indexByReadRoot.delete(rootKey)
      }
    }
  }

  const onCommit: SelectorGraph<S>['onCommit'] = (state, meta, dirtySet, diagnosticsLevel, onSelectorChanged) =>
    Effect.gen(function* () {
      if (selectorsById.size === 0) return

      const emitEvalEvent =
        diagnosticsLevel === 'light' || diagnosticsLevel === 'full' || diagnosticsLevel === 'sampled'
      const evalEventPolicy: SelectorEvalEventPolicy = diagnosticsLevel === 'sampled' ? 'sampled' : 'always'

      const registry: FieldPathIdRegistry | undefined =
        dirtySet.dirtyAll || dirtySet.rootIds.length === 0 ? undefined : getFieldPathIdRegistry?.()

      const getDirtyRootPath = (id: number): FieldPath | undefined => {
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
          for (const [selectorId, entry] of selectorsById.entries()) {
            yield* evaluateSubscribedEntry(entry, selectorId)
          }
        })

      const indexedCandidatesByRoot = new Map<ReadRootKey, ReadonlyArray<IndexedRootCandidate<S>>>()
      const getIndexedCandidatesForRoot = (rootKey: ReadRootKey): ReadonlyArray<IndexedRootCandidate<S>> => {
        const cached = indexedCandidatesByRoot.get(rootKey)
        if (cached) {
          return cached
        }

        const selectorIds = indexByReadRoot.get(rootKey)
        if (!selectorIds || selectorIds.size === 0) {
          indexedCandidatesByRoot.set(rootKey, [])
          return []
        }

        const indexed: Array<IndexedRootCandidate<S>> = []
        for (const selectorId of selectorIds) {
          const entry = selectorsById.get(selectorId)
          if (!entry) continue
          const readsForRoot = entry.readsByRootKey.get(rootKey)
          if (!readsForRoot || readsForRoot.length === 0) continue
          indexed.push({
            selectorId,
            entry,
            readsForRoot,
          })
        }

        indexedCandidatesByRoot.set(rootKey, indexed)
        return indexed
      }

      if (selectorsById.size === 1) {
        const entry = selectorsById.values().next().value
        if (!entry) return

        if (
          !shouldEvaluateEntryForDirtyRoots({
            entry,
            dirtySet,
            getDirtyRootPath,
            hasRegistry: registry != null,
          })
        ) {
          return
        }

        yield* evaluateSubscribedEntry(entry, entry.selectorId)
        return
      }

      if (dirtySet.dirtyAll) {
        yield* evaluateAllSubscribedSelectors()
        return
      }

      if (!registry) {
        yield* evaluateAllSubscribedSelectors()
        return
      }

      for (const selectorId of selectorsWithoutReads) {
        const entry = selectorsById.get(selectorId)
        if (!entry) continue
        yield* evaluateSubscribedEntry(entry, selectorId)
      }

      const dirtyRootsToProcessByRoot = new Map<ReadRootKey, Array<FieldPath>>()
      for (const dirtyRootId of dirtySet.rootIds) {
        const dirtyRoot = getDirtyRootPath(dirtyRootId)
        if (!dirtyRoot) {
          yield* evaluateAllSubscribedSelectors()
          return
        }

        const rootKey = getReadRootKeyFromPath(dirtyRoot)

        const existingDirtyRoots = dirtyRootsToProcessByRoot.get(rootKey)
        if (existingDirtyRoots) {
          upsertDirtyRoot(existingDirtyRoots, dirtyRoot)
          continue
        }
        dirtyRootsToProcessByRoot.set(rootKey, [dirtyRoot])
      }

      for (const [rootKey, dirtyRootsForRoot] of dirtyRootsToProcessByRoot) {
        const candidates = getIndexedCandidatesForRoot(rootKey)
        if (candidates.length === 0) {
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
