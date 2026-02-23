import { Effect, PubSub, Scope } from 'effect'
import { isPrefixOf, normalizeFieldPath, type DirtySet, type FieldPath, type FieldPathIdRegistry } from '../../field-path.js'
import type { ReadQueryCompiled } from './ReadQuery.js'
import type { StateChangeWithMeta, StateCommitMeta } from './module.js'
import * as Debug from './DebugSink.js'

type ReadRootKey = string

type SelectorEntry<S, V> = {
  readonly selectorId: string
  readonly readQuery: ReadQueryCompiled<S, V>
  readonly reads: ReadonlyArray<FieldPath>
  readonly readsByRootKey: ReadonlyMap<ReadRootKey, ReadonlyArray<FieldPath>>
  readonly readRootKeys: ReadonlyArray<ReadRootKey>
  readonly hub: PubSub.PubSub<StateChangeWithMeta<V>>
  subscriberCount: number
  cachedAtTxnSeq: number
  hasValue: boolean
  cachedValue: V | undefined
}

export interface SelectorGraph<S> {
  readonly ensureEntry: <V>(
    readQuery: ReadQueryCompiled<S, V>,
  ) => Effect.Effect<SelectorEntry<S, V>, never, Scope.Scope>
  readonly releaseEntry: (selectorId: string) => void
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

const hasOverlapBetweenDirtyRootsAndReads = (
  dirtyRoots: ReadonlyArray<FieldPath>,
  readsForRoot: ReadonlyArray<FieldPath>,
): boolean => {
  for (const dirtyRoot of dirtyRoots) {
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

    if (!args.emitEvalEvent) {
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

  const ensureEntry: SelectorGraph<S>['ensureEntry'] = (readQuery) => {
    const existing = selectorsById.get(readQuery.selectorId)
    if (existing) {
      return Effect.succeed(existing as any)
    }

    return Effect.gen(function* () {
      const hub = yield* PubSub.unbounded<StateChangeWithMeta<any>>()

      const reads = readQuery.reads
        .filter((x): x is string => typeof x === 'string')
        .map((raw) => normalizeFieldPath(raw))
        .filter((x): x is FieldPath => x != null)
      const readsByRootKey = new Map<ReadRootKey, FieldPath[]>()
      for (const read of reads) {
        const rootKey = getReadRootKeyFromPath(read)
        const bucket = readsByRootKey.get(rootKey)
        if (bucket) {
          bucket.push(read)
        } else {
          readsByRootKey.set(rootKey, [read])
        }
      }
      const readRootKeys = Array.from(readsByRootKey.keys())
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

      if (selectorsById.size === 1) {
        const entry = selectorsById.values().next().value
        if (!entry || entry.subscriberCount === 0) return

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

        yield* evaluateEntry({
          entry,
          selectorId: entry.selectorId,
          state,
          meta,
          emitEvalEvent,
          moduleId,
          instanceId,
          onSelectorChanged,
        })
        return
      }

      const dirtySelectorIds: Set<string> = new Set()

      if (dirtySet.dirtyAll) {
        for (const [id, entry] of selectorsById.entries()) {
          if (entry.subscriberCount > 0) dirtySelectorIds.add(id)
        }
      } else {
        if (!registry) {
          for (const [id, entry] of selectorsById.entries()) {
            if (entry.subscriberCount > 0) dirtySelectorIds.add(id)
          }
        } else {
          for (const selectorId of selectorsWithoutReads) {
            const entry = selectorsById.get(selectorId)
            if (entry && entry.subscriberCount > 0) {
              dirtySelectorIds.add(selectorId)
            }
          }

          const dirtyRootsByKey = new Map<ReadRootKey, FieldPath[]>()
          let hasUnknownDirtyRoot = false

          for (const dirtyRootId of dirtySet.rootIds) {
            const dirtyRoot = getDirtyRootPath(dirtyRootId)
            if (!dirtyRoot) {
              hasUnknownDirtyRoot = true
              break
            }

            const rootKey = getReadRootKeyFromPath(dirtyRoot)
            const bucket = dirtyRootsByKey.get(rootKey)
            if (bucket) {
              bucket.push(dirtyRoot)
            } else {
              dirtyRootsByKey.set(rootKey, [dirtyRoot])
            }
          }

          if (hasUnknownDirtyRoot) {
            for (const [id, entry] of selectorsById.entries()) {
              if (entry.subscriberCount > 0) dirtySelectorIds.add(id)
            }
          } else {
            for (const [rootKey, dirtyRoots] of dirtyRootsByKey.entries()) {
              const candidates = indexByReadRoot.get(rootKey)
              if (!candidates || candidates.size === 0) continue

              for (const selectorId of candidates) {
                if (dirtySelectorIds.has(selectorId)) continue
                const entry = selectorsById.get(selectorId)
                if (!entry || entry.subscriberCount === 0) continue
                const readsForRoot = entry.readsByRootKey.get(rootKey)
                if (!readsForRoot || readsForRoot.length === 0) continue
                if (hasOverlapBetweenDirtyRootsAndReads(dirtyRoots, readsForRoot)) {
                  dirtySelectorIds.add(selectorId)
                }
              }
            }
          }
        }
      }

      if (dirtySelectorIds.size === 0) return

      for (const selectorId of dirtySelectorIds) {
        const entry = selectorsById.get(selectorId)
        if (!entry || entry.subscriberCount === 0) continue

        yield* evaluateEntry({
          entry,
          selectorId,
          state,
          meta,
          emitEvalEvent,
          moduleId,
          instanceId,
          onSelectorChanged,
        })
      }
    })

  return { ensureEntry, releaseEntry, onCommit }
}
