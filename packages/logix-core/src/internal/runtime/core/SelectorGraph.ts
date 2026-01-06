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

export const make = <S>(args: {
  readonly moduleId: string
  readonly instanceId: string
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
}): SelectorGraph<S> => {
  const { moduleId, instanceId, getFieldPathIdRegistry } = args

  const selectorsById = new Map<string, SelectorEntry<S, any>>()
  const indexByReadRoot = new Map<ReadRootKey, Set<string>>()

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
      const readRootKeys = Array.from(new Set(reads.map(getReadRootKeyFromPath)))

      for (const rootKey of readRootKeys) {
        const set = indexByReadRoot.get(rootKey)
        if (set) {
          set.add(readQuery.selectorId)
        } else {
          indexByReadRoot.set(rootKey, new Set([readQuery.selectorId]))
        }
      }

      const entry: SelectorEntry<S, any> = {
        selectorId: readQuery.selectorId,
        readQuery: readQuery as any,
        reads,
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

        const isDirty = (() => {
          if (dirtySet.dirtyAll) return true
          if (entry.reads.length === 0) return true
          if (!registry) return true
          for (const dirtyRootId of dirtySet.rootIds) {
            const dirtyRoot = getDirtyRootPath(dirtyRootId)
            if (!dirtyRoot) return true
            const dirtyRootKey = getReadRootKeyFromPath(dirtyRoot)
            if (entry.readRootKeys.length > 0 && !entry.readRootKeys.includes(dirtyRootKey)) continue
            for (const read of entry.reads) {
              if (overlaps(dirtyRoot, read)) {
                return true
              }
            }
          }
          return false
        })()

        if (!isDirty) {
          return
        }

        let next: any
        const evalStartedAt = emitEvalEvent ? nowMs() : undefined
        try {
          next = entry.readQuery.select(state)
        } catch (err) {
          if (emitEvalEvent) {
            yield* Debug.record({
              type: 'diagnostic',
              moduleId,
              instanceId,
              txnSeq: meta.txnSeq,
              txnId: meta.txnId,
              code: 'read_query::eval_error',
              severity: 'error',
              message: 'ReadQuery selector threw during evaluation.',
              hint: 'Selectors must be pure and not throw; check the selector implementation and inputs.',
              kind: 'read_query_eval_error',
              trigger: { kind: 'read_query', name: 'selector:eval', details: { selectorId: entry.selectorId } },
            })
          }
          return
        }
        const evalMs = emitEvalEvent && evalStartedAt != null ? Math.max(0, nowMs() - evalStartedAt) : undefined

        const hadValue = entry.hasValue
        const prev = entry.cachedValue as any
        const equal = hadValue ? equalsValue(entry.readQuery as any, prev, next) : false
        const changed = !hadValue || !equal

        if (changed) {
          entry.cachedValue = next
          entry.hasValue = true
          entry.cachedAtTxnSeq = meta.txnSeq
          onSelectorChanged?.(entry.selectorId)

          yield* PubSub.publish(entry.hub as any, {
            value: entry.cachedValue,
            meta,
          } satisfies StateChangeWithMeta<any>)
        }

        if (emitEvalEvent) {
          yield* Debug.record({
            type: 'trace:selector:eval',
            moduleId,
            instanceId,
            txnSeq: meta.txnSeq,
            txnId: meta.txnId,
            data: {
              selectorId: entry.selectorId,
              lane: entry.readQuery.lane,
              producer: entry.readQuery.producer,
              fallbackReason: entry.readQuery.fallbackReason,
              readsDigest: entry.readQuery.readsDigest,
              equalsKind: entry.readQuery.equalsKind,
              changed,
              evalMs,
            },
          })
        }

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
          for (const dirtyRootId of dirtySet.rootIds) {
            const dirtyRoot = getDirtyRootPath(dirtyRootId)
            if (!dirtyRoot) {
              for (const [id, entry] of selectorsById.entries()) {
                if (entry.subscriberCount > 0) dirtySelectorIds.add(id)
              }
              break
            }

            const rootKey = getReadRootKeyFromPath(dirtyRoot)
          const candidates = indexByReadRoot.get(rootKey)
          if (!candidates) continue
          for (const selectorId of candidates) {
            if (dirtySelectorIds.has(selectorId)) continue
            const entry = selectorsById.get(selectorId)
            if (!entry || entry.subscriberCount === 0) continue
            if (entry.reads.length === 0) {
              dirtySelectorIds.add(selectorId)
              continue
            }
            for (const read of entry.reads) {
              if (overlaps(dirtyRoot, read)) {
                dirtySelectorIds.add(selectorId)
                break
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

        let next: any
        const evalStartedAt = emitEvalEvent ? nowMs() : undefined
        try {
          next = entry.readQuery.select(state)
        } catch (err) {
          if (emitEvalEvent) {
            yield* Debug.record({
              type: 'diagnostic',
              moduleId,
              instanceId,
              txnSeq: meta.txnSeq,
              txnId: meta.txnId,
              code: 'read_query::eval_error',
              severity: 'error',
              message: 'ReadQuery selector threw during evaluation.',
              hint: 'Selectors must be pure and not throw; check the selector implementation and inputs.',
              kind: 'read_query_eval_error',
              trigger: { kind: 'read_query', name: 'selector:eval', details: { selectorId } },
            })
          }
          continue
        }
        const evalMs = emitEvalEvent && evalStartedAt != null ? Math.max(0, nowMs() - evalStartedAt) : undefined

        const hadValue = entry.hasValue
        const prev = entry.cachedValue as any
        const equal = hadValue ? equalsValue(entry.readQuery as any, prev, next) : false
        const changed = !hadValue || !equal

        if (changed) {
          entry.cachedValue = next
          entry.hasValue = true
          entry.cachedAtTxnSeq = meta.txnSeq
          onSelectorChanged?.(selectorId)

          yield* PubSub.publish(entry.hub as any, {
            value: entry.cachedValue,
            meta,
          } satisfies StateChangeWithMeta<any>)
        }

        if (emitEvalEvent) {
          yield* Debug.record({
            type: 'trace:selector:eval',
            moduleId,
            instanceId,
            txnSeq: meta.txnSeq,
            txnId: meta.txnId,
            data: {
              selectorId,
              lane: entry.readQuery.lane,
              producer: entry.readQuery.producer,
              fallbackReason: entry.readQuery.fallbackReason,
              readsDigest: entry.readQuery.readsDigest,
              equalsKind: entry.readQuery.equalsKind,
              changed,
              evalMs,
            },
          })
        }
      }
    })

  return { ensureEntry, releaseEntry, onCommit }
}
