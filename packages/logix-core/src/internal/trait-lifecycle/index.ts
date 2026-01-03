import { Effect, FiberRef, Option } from 'effect'
import type { BoundApi } from '../runtime/core/module.js'
import * as TaskRunner from '../runtime/core/TaskRunner.js'
import * as ReplayLog from '../runtime/core/ReplayLog.js'
import type { CleanupRequest, ExecuteRequest, FieldRef, ValidateRequest } from './model.js'
import type * as StateTraitValidate from '../state-trait/validate.js'
import * as RowId from '../state-trait/rowid.js'
import { getBoundInternals, getModuleTraitsProgram } from '../runtime/core/runtimeInternalsAccessor.js'

export type { CleanupRequest, ExecuteRequest, FieldRef, ValidateRequest }

/**
 * Ref: builders for FieldRef (serializable and comparable).
 *
 * Notes:
 * - Phase 2 provides only minimal constructors.
 * - Array optimizations (RowID/trackBy) and richer ref semantics will land in later phases.
 */
export const Ref = {
  field: (path: string): FieldRef => ({ kind: 'field', path }),
  list: (path: string, listIndexPath?: ReadonlyArray<number>): FieldRef => ({
    kind: 'list',
    path,
    listIndexPath,
  }),
  item: (
    path: string,
    index: number,
    options?: { readonly listIndexPath?: ReadonlyArray<number>; readonly field?: string },
  ): FieldRef => ({
    kind: 'item',
    path,
    index,
    listIndexPath: options?.listIndexPath,
    field: options?.field,
  }),
  /**
   * fromValuePath：
   * - Parse a valuePath (e.g. "items.0.warehouseId") into a FieldRef.
   * - Supports a single index (required) and multi-level indices via listIndexPath (optional but recommended).
   *
   * Conventions:
   * - If numeric segments are present, return an item ref (the last index becomes item.index; preceding indices go into listIndexPath).
   * - If no numeric segments are present:
   *   - "items[]" (pattern list root) returns a list ref.
   *   - Otherwise return a field ref (including pattern fields like "items[].x").
   * - "$root" / empty string returns the root ref.
   */
  fromValuePath: (valuePath: string): FieldRef => {
    const raw = typeof valuePath === 'string' ? valuePath.trim() : ''
    if (!raw || raw === '$root') return Ref.root()

    const segments = raw.split('.').filter(Boolean)
    if (segments.length === 0) return Ref.root()

    const isIndex = (seg: string): boolean => /^[0-9]+$/.test(seg)
    const stripPattern = (seg: string): string => (seg.endsWith('[]') ? seg.slice(0, -2) : seg)

    const indexPositions: Array<{ readonly pos: number; readonly index: number }> = []
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!
      if (!isIndex(seg)) continue
      const index = Number(seg)
      if (!Number.isFinite(index) || index < 0) return Ref.field(raw)
      indexPositions.push({ pos: i, index })
    }

    // valuePath with indices => item ref
    if (indexPositions.length > 0) {
      const last = indexPositions[indexPositions.length - 1]!
      const listIndexPath = indexPositions.slice(0, -1).map((p) => p.index)

      const listPath = segments
        .slice(0, last.pos)
        .filter((seg) => !isIndex(seg))
        .map(stripPattern)
        .join('.')

      if (!listPath) return Ref.field(raw)

      const fieldRest = segments
        .slice(last.pos + 1)
        .map(stripPattern)
        .join('.')

      return Ref.item(listPath, last.index, {
        listIndexPath: listIndexPath.length > 0 ? listIndexPath : undefined,
        field: fieldRest ? fieldRest : undefined,
      })
    }

    // pattern list root => list ref
    if (segments.some((s) => s.includes('[]'))) {
      const last = segments[segments.length - 1]!
      if (last.endsWith('[]')) {
        return Ref.list(segments.map(stripPattern).join('.'))
      }
    }

    return Ref.field(raw)
  },
  root: (): FieldRef => ({ kind: 'root' }),
} as const

/**
 * scopedValidate (placeholder): in later phases this will compute the minimal set via ReverseClosure and write back into the error tree.
 */
export const scopedValidate = (bound: BoundApi<any, any>, request: ValidateRequest): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    let internals: ReturnType<typeof getBoundInternals> | undefined
    try {
      internals = getBoundInternals(bound as any)
    } catch {
      return
    }

    const enqueue = internals.traits.enqueueStateTraitValidateRequest as unknown as
      | ((r: StateTraitValidate.ScopedValidateRequest) => void)
      | undefined

    if (!enqueue) return

    const toTarget = (ref: FieldRef): StateTraitValidate.ValidateTarget => {
      if (ref.kind === 'root') return { kind: 'root' }
      if (ref.kind === 'field') return { kind: 'field', path: ref.path }
      if (ref.kind === 'list') {
        return {
          kind: 'list',
          path: ref.path,
          ...(ref.listIndexPath ? { listIndexPath: ref.listIndexPath } : {}),
        }
      }
      return {
        kind: 'item',
        path: ref.path,
        index: ref.index,
        ...(ref.listIndexPath ? { listIndexPath: ref.listIndexPath } : {}),
        field: ref.field,
      }
    }

    const internal: StateTraitValidate.ScopedValidateRequest = {
      mode: request.mode as any,
      target: toTarget(request.target),
    }

    const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
    if (inTxn) {
      enqueue(internal)
      return
    }

    yield* internals.txn.runWithStateTransaction({ kind: 'trait', name: 'scopedValidate', details: request }, () =>
      Effect.sync(() => {
        enqueue(internal)
      }),
    )
  })

/**
 * scopedExecute (placeholder): a unified execution entrypoint for query/resource actions (refresh/invalidate, etc.).
 */
export const scopedExecute = (bound: BoundApi<any, any>, request: ExecuteRequest): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    if (request.kind === 'source:refresh') {
      const toFieldPath = (ref: FieldRef): string | undefined => {
        if (ref.kind === 'root') return undefined
        if (ref.kind === 'field' || ref.kind === 'list') return ref.path
        const base = `${ref.path}[]`
        return ref.field ? `${base}.${ref.field}` : base
      }

      const fieldPath = toFieldPath(request.target)
      if (!fieldPath) {
        return
      }

      yield* bound.traits.source.refresh(fieldPath) as Effect.Effect<void, never, any>
      return
    }

    if (request.kind !== 'query:invalidate') {
      return
    }

    const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog)
    if (Option.isNone(replayLogOpt)) {
      return
    }

    let moduleId: string | undefined
    let instanceId: string | undefined
    try {
      const internals = getBoundInternals(bound as any)
      moduleId = internals.moduleId
      instanceId = internals.instanceId
    } catch {
      moduleId = undefined
      instanceId = undefined
    }

    yield* replayLogOpt.value.record({
      _tag: 'InvalidateRequest',
      timestamp: Date.now(),
      moduleId,
      instanceId,
      kind: 'query',
      target: 'query',
      meta: request.request,
    })
  })

/**
 * cleanup (placeholder): deterministic cleanup under structural changes (errors/ui/resources).
 */
export const cleanup = (bound: BoundApi<any, any>, request: CleanupRequest): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const apply = () =>
      bound.state.mutate((draft) => {
        const clearAt = (root: 'errors' | 'ui', path: string): void => {
          if (!path) return
          RowId.unsetAtPathMutating(draft, `${root}.${path}`)
        }

        if (request.kind === 'field:unregister') {
          const target = request.target
          if (target.kind !== 'field') return
          clearAt('errors', target.path)
          clearAt('ui', target.path)
          return
        }

        if (request.kind === 'list:item:remove') {
          const target = request.target
          if (target.kind !== 'item') return
          const base = `${target.path}.${target.index}`
          const path = target.field ? `${base}.${target.field}` : base
          clearAt('errors', path)
          clearAt('ui', path)
          return
        }

        if (request.kind === 'list:reorder') {
          // Reorder does not change the external index semantics by itself.
          // Alignment of errors/ui should be handled by domain reducers or higher-level logic; keep it a no-op here.
          return
        }
      })

    const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
    if (inTxn) {
      return yield* apply()
    }

    let runWithTxn:
      | ((
          origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
          body: () => Effect.Effect<void, never, any>,
        ) => Effect.Effect<void, never, any>)
      | undefined

    try {
      const internals = getBoundInternals(bound as any)
      runWithTxn = (origin, body) => internals.txn.runWithStateTransaction(origin as any, body)
    } catch {
      runWithTxn = undefined
    }

    if (!runWithTxn) {
      return yield* apply()
    }

    return yield* runWithTxn({ kind: 'trait', name: 'cleanup', details: request }, apply)
  })

type SourceWiring = {
  readonly setup: Effect.Effect<void, never, any>
  readonly refreshOnValueChange: (changedPath: string) => Effect.Effect<void, never, any>
}

const isAuxRootPath = (path: string): boolean =>
  path === 'errors' || path === 'ui' || path.startsWith('errors.') || path.startsWith('ui.')

const toPatternPath = (path: string): string => {
  if (!path) return path
  const segments = path.split('.').filter(Boolean)
  return segments
    .map((seg) => (/^[0-9]+$/.test(seg) ? '[]' : seg))
    .join('.')
    .replace(/\.\[\]/g, '[]')
}

const isDepAffectedByChange = (dep: string, changed: string): boolean => {
  if (!dep || !changed) return false
  if (dep === changed) return true
  if (changed.startsWith(`${dep}.`)) return true
  if (changed.startsWith(`${dep}[]`)) return true
  // list root structural change (e.g. changed="items") should affect any list-item deps (e.g. dep="items[].x").
  if (dep.startsWith(`${changed}[]`)) return true
  return false
}

export const makeSourceWiring = (bound: BoundApi<any, any>, module: unknown): SourceWiring => {
  const program = getModuleTraitsProgram(module as any) as { readonly entries?: ReadonlyArray<any> } | undefined

  const sources = program?.entries?.filter((e) => e && e.kind === 'source') ?? []

  const sourceOnMount = sources.filter((e: any) =>
    Array.isArray(e?.meta?.triggers) ? e.meta.triggers.includes('onMount') : false,
  )

  const sourceOnValueChange = sources.filter((e: any) =>
    Array.isArray(e?.meta?.triggers) ? e.meta.triggers.includes('onValueChange') : false,
  )

  const setup = Effect.sync(() => {
    if (sourceOnMount.length === 0) return
    bound.lifecycle.onStart(
      Effect.forEach(sourceOnMount, (entry: any) => bound.traits.source.refresh(entry.fieldPath), {
        concurrency: 'unbounded',
      }).pipe(Effect.asVoid),
    )
  })

  const refreshOnValueChange = (changedPath: string): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      if (!changedPath || isAuxRootPath(changedPath)) return
      if (sourceOnValueChange.length === 0) return

      const changedPattern = toPatternPath(changedPath)

      yield* Effect.forEach(
        sourceOnValueChange,
        (entry: any) => {
          const deps = (entry?.meta?.deps ?? []) as ReadonlyArray<string>
          const affected = deps.some((dep) => isDepAffectedByChange(dep, changedPattern))
          if (!affected) return Effect.void
          return bound.traits.source.refresh(entry.fieldPath)
        },
        { concurrency: 'unbounded' },
      )
    }).pipe(Effect.asVoid)

  return { setup, refreshOnValueChange }
}

/**
 * install (placeholder): the default wiring entrypoint for TraitLifecycle.
 *
 * Notes:
 * - Phase 2 only provides an entrypoint that feature packages can depend on.
 * - Concrete wiring for "domain event → request → in-transaction execution" will be composed by Form/Query default logics in later phases.
 */
export const install = (_bound: BoundApi<any, any>): Effect.Effect<void, never, any> => Effect.void
