import { Effect, PubSub, Scope } from 'effect'
import { isPrefixOf, normalizeFieldPath, type FieldPath, type FieldPathIdRegistry } from '../../field-path.js'
import type { ReadQueryCompiled } from './ReadQuery.js'
import type { TxnDirtyEvidenceSnapshot } from './StateTransaction.js'
import type { StateChangeWithMeta, StateCommitMeta } from './module.js'
import * as Debug from './DebugSink.js'
import { routeReadQuery } from './selectorRoute.precision.js'
import { classifyDirtyPrecision, type DirtyPrecisionRecord } from './selectorRoute.dirty.js'

type ReadRootKey = string

type IndexedRootCandidate<S> = {
  readonly selectorFingerprint: string
  readonly entry: SelectorEntry<S, any>
  readonly readsForRoot: ReadonlyArray<FieldPath>
}

type SelectorEvalEventPolicy = 'always' | 'sampled'

type SelectorEntry<S, V> = {
  readonly selectorId: string
  readonly selectorFingerprint: string
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
  readonly releaseEntry: (selectorFingerprint: string) => void
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
    onSelectorChanged?: (selectorFingerprint: string) => void,
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

const recordDirtyFallbackDiagnostic = (args: {
  readonly moduleId: string
  readonly instanceId: string
  readonly meta: StateCommitMeta
  readonly record: DirtyPrecisionRecord
}): Effect.Effect<void, never, never> =>
  Debug.record({
    type: 'diagnostic',
    moduleId: args.moduleId,
    instanceId: args.instanceId,
    txnSeq: args.meta.txnSeq,
    txnId: args.meta.txnId,
    code: 'selector_route::dirty_fallback',
    severity: 'error',
    message: 'Selector dirty/read overlap fell back to a broad evaluation route.',
    hint: args.record.repairHint ?? 'Record exact dirty paths for writes that affect host selector projection.',
    kind: 'selector_dirty_fallback',
    trigger: {
      kind: 'selector_route',
      name: 'dirty_fallback',
      details: {
        dirtyQuality: args.record.quality,
        fallbackKind: args.record.fallbackKind,
        reason: args.record.reason,
      },
    },
  })

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
  readonly selectorFingerprint: string
  readonly state: S
  readonly meta: StateCommitMeta
  readonly emitEvalEvent: boolean
  readonly evalEventPolicy: SelectorEvalEventPolicy
  readonly moduleId: string
  readonly instanceId: string
  readonly onSelectorChanged?: (selectorFingerprint: string) => void
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
      args.onSelectorChanged?.(args.selectorFingerprint)

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
        selectorFingerprint: args.selectorFingerprint,
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
    const route = routeReadQuery(readQuery)
    const selectorFingerprint = route.selectorFingerprint.value
    const existing = selectorsById.get(selectorFingerprint)
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
        selectorsWithoutReads.add(selectorFingerprint)
      } else {
        for (const rootKey of readRootKeys) {
          const set = indexByReadRoot.get(rootKey)
          if (set) {
            set.add(selectorFingerprint)
          } else {
            indexByReadRoot.set(rootKey, new Set([selectorFingerprint]))
          }
        }
      }

      const entry: SelectorEntry<S, any> = {
        selectorId: readQuery.selectorId,
        selectorFingerprint,
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
      selectorsById.set(selectorFingerprint, entry)
      return entry as any
    })
  }

  const releaseEntry: SelectorGraph<S>['releaseEntry'] = (selectorFingerprint) => {
    const entry = selectorsById.get(selectorFingerprint)
    if (!entry) return
    entry.subscriberCount = Math.max(0, entry.subscriberCount - 1)
    if (entry.subscriberCount > 0) return

    selectorsById.delete(selectorFingerprint)
    selectorsWithoutReads.delete(selectorFingerprint)
    for (const rootKey of entry.readRootKeys) {
      const set = indexByReadRoot.get(rootKey)
      if (!set) continue
      set.delete(selectorFingerprint)
      if (set.size === 0) {
        indexByReadRoot.delete(rootKey)
      }
    }
  }

  const onCommit: SelectorGraph<S>['onCommit'] = (state, meta, dirty, diagnosticsLevel, onSelectorChanged) =>
    Effect.gen(function* () {
      if (selectorsById.size === 0) return

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

      const evaluateSubscribedEntry = (entry: SelectorEntry<S, any>): Effect.Effect<void> => {
        if (entry.subscriberCount === 0) return Effect.void
        if (entry.lastScheduledTxnSeq === meta.txnSeq) return Effect.void

        // evaluateEntry is total (E=never): mark before execution to dedupe multi-root scans in the same txn.
        entry.lastScheduledTxnSeq = meta.txnSeq
        return evaluateEntry({
          entry,
          selectorId: entry.selectorId,
          selectorFingerprint: entry.selectorFingerprint,
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
          for (const entry of selectorsById.values()) {
            yield* evaluateSubscribedEntry(entry)
          }
        })

      const indexedCandidatesByRoot = new Map<ReadRootKey, ReadonlyArray<IndexedRootCandidate<S>>>()
      const getIndexedCandidatesForRoot = (rootKey: ReadRootKey): ReadonlyArray<IndexedRootCandidate<S>> => {
        const cached = indexedCandidatesByRoot.get(rootKey)
        if (cached) {
          return cached
        }

        const selectorFingerprints = indexByReadRoot.get(rootKey)
        if (!selectorFingerprints || selectorFingerprints.size === 0) {
          indexedCandidatesByRoot.set(rootKey, [])
          return []
        }

        const indexed: Array<IndexedRootCandidate<S>> = []
        for (const selectorFingerprint of selectorFingerprints) {
          const entry = selectorsById.get(selectorFingerprint)
          if (!entry) continue
          const readsForRoot = entry.readsByRootKey.get(rootKey)
          if (!readsForRoot || readsForRoot.length === 0) continue
          indexed.push({
            selectorFingerprint,
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

        if (emitEvalEvent && dirty.dirtyAll) {
          yield* recordDirtyFallbackDiagnostic({
            moduleId,
            instanceId,
            meta,
            record: classifyDirtyPrecision({
              dirtyAll: true,
              dirtyAllReason: dirty.dirtyAllReason,
              hasPathAuthority: false,
            }),
          })
        } else if (emitEvalEvent && !registry && dirty.dirtyPathIds.length > 0) {
          yield* recordDirtyFallbackDiagnostic({
            moduleId,
            instanceId,
            meta,
            record: classifyDirtyPrecision({
              dirtyAll: false,
              hasPathAuthority: false,
            }),
          })
        } else if (emitEvalEvent && registry) {
          for (const dirtyPathId of dirty.dirtyPathIds) {
            if (!getDirtyPath(dirtyPathId)) {
              yield* recordDirtyFallbackDiagnostic({
                moduleId,
                instanceId,
                meta,
                record: classifyDirtyPrecision({
                  dirtyAll: false,
                  hasPathAuthority: true,
                  missingDirtyPath: true,
                }),
              })
              break
            }
          }
        }

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

        yield* evaluateSubscribedEntry(entry)
        return
      }

      if (dirty.dirtyAll) {
        if (emitEvalEvent) {
          yield* recordDirtyFallbackDiagnostic({
            moduleId,
            instanceId,
            meta,
            record: classifyDirtyPrecision({
              dirtyAll: true,
              dirtyAllReason: dirty.dirtyAllReason,
              hasPathAuthority: false,
            }),
          })
        }
        yield* evaluateAllSubscribedSelectors()
        return
      }

      if (!registry) {
        if (emitEvalEvent) {
          yield* recordDirtyFallbackDiagnostic({
            moduleId,
            instanceId,
            meta,
            record: classifyDirtyPrecision({
              dirtyAll: false,
              hasPathAuthority: false,
            }),
          })
        }
        yield* evaluateAllSubscribedSelectors()
        return
      }

      for (const selectorFingerprint of selectorsWithoutReads) {
        const entry = selectorsById.get(selectorFingerprint)
        if (!entry) continue
        yield* evaluateSubscribedEntry(entry)
      }

      const dirtyRootsToProcessByRoot = new Map<ReadRootKey, Array<FieldPath>>()
      for (const dirtyPathId of dirty.dirtyPathIds) {
        const dirtyPath = getDirtyPath(dirtyPathId)
        if (!dirtyPath) {
          if (emitEvalEvent) {
            yield* recordDirtyFallbackDiagnostic({
              moduleId,
              instanceId,
              meta,
              record: classifyDirtyPrecision({
                dirtyAll: false,
                hasPathAuthority: true,
                missingDirtyPath: true,
              }),
            })
          }
          yield* evaluateAllSubscribedSelectors()
          return
        }

        const rootKey = getReadRootKeyFromPath(dirtyPath)

        const existingDirtyRoots = dirtyRootsToProcessByRoot.get(rootKey)
        if (existingDirtyRoots) {
          upsertDirtyRoot(existingDirtyRoots, dirtyPath)
          continue
        }
        dirtyRootsToProcessByRoot.set(rootKey, [dirtyPath])
      }

      for (const [rootKey, dirtyRootsForRoot] of dirtyRootsToProcessByRoot) {
        const candidates = getIndexedCandidatesForRoot(rootKey)
        if (candidates.length === 0) {
          continue
        }

        const hasRootLevelDirty = dirtyRootsForRoot.some((path) => path.length <= 1)

        for (const candidate of candidates) {
          const { entry, readsForRoot } = candidate
          if (entry.subscriberCount === 0 || entry.lastScheduledTxnSeq === meta.txnSeq) continue

          if (hasRootLevelDirty) {
            yield* evaluateSubscribedEntry(entry)
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

          yield* evaluateSubscribedEntry(entry)
        }
      }
    })

  return { ensureEntry, releaseEntry, hasAnyEntries, onCommit }
}
