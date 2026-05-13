import { Effect, Fiber, Option } from 'effect'
import type { BoundApi } from '../runtime/core/module.js'
import * as TaskRunner from '../runtime/core/TaskRunner.js'
import * as ReplayLog from '../runtime/core/ReplayLog.js'
import type { CleanupRequest, ExecuteRequest, FieldRef, ValidateRequest } from './model.js'
import type * as FieldValidate from '../field-kernel/validate.js'
import * as RowId from '../field-kernel/rowid.js'
import { Snapshot, canonicalizeKey } from '../resource.js'
import { getBoundInternals, getModuleFieldsProgram } from '../runtime/core/runtimeInternalsAccessor.js'

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
 * scopedValidate: compute the validate request target and enqueue it into the in-transaction validation lane.
 */
export const scopedValidate = (bound: BoundApi<any, any>, request: ValidateRequest): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    let internals: ReturnType<typeof getBoundInternals> | undefined
    try {
      internals = getBoundInternals(bound as any)
    } catch {
      return
    }

    const enqueue = internals.fields.enqueueFieldValidateRequest as unknown as
      | ((r: FieldValidate.ScopedValidateRequest) => void)
      | undefined

    if (!enqueue) return

    const toTarget = (ref: FieldRef): FieldValidate.ValidateTarget => {
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

    const internal: FieldValidate.ScopedValidateRequest = {
      mode: request.mode as any,
      target: toTarget(request.target),
    }

      const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)
    if (inTxn) {
      enqueue(internal)
      return
    }

    yield* internals.txn.runWithStateTransaction({ kind: 'field', name: 'scopedValidate', details: request }, () =>
      Effect.sync(() => {
        enqueue(internal)
      }),
    )
  }).pipe(Effect.catchCause(() => Effect.void))

/**
 * scopedExecute: unified execution entrypoint for source refresh and query invalidation requests.
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

      yield* bound.fields.source.refresh(fieldPath) as Effect.Effect<void, never, any>
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
 * cleanup: deterministic cleanup under structural changes (errors/ui/resources).
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

  const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)
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

    return yield* runWithTxn({ kind: 'field', name: 'cleanup', details: request }, apply)
  }).pipe(Effect.catchCause(() => Effect.void))

type SourceWiring = {
  readonly registerOnMount: () => void
  readonly refreshOnKeyChange: (changedPath: string) => Effect.Effect<void, never, any>
  readonly flushForSubmit: () => Effect.Effect<void, never, any>
}

const SOURCE_WIRING_CACHE = new WeakMap<object, WeakMap<object, SourceWiring>>()

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
  try {
    const internals = getBoundInternals(bound as any)
    if (typeof module === 'object' && module !== null) {
      const cachedByModule = SOURCE_WIRING_CACHE.get(internals as object)
      const cached = cachedByModule?.get(module)
      if (cached) return cached
    }
  } catch {
    // Fall through for tests or partial bound objects without runtime internals.
  }

  const program = getModuleFieldsProgram(module as any) as { readonly entries?: ReadonlyArray<any> } | undefined

  const sources = program?.entries?.filter((e) => e && e.kind === 'source') ?? []

  const sourceOnMount = sources.filter((e: any) =>
    Array.isArray(e?.meta?.triggers) ? e.meta.triggers.includes('onMount') : false,
  )

  const sourceOnKeyChange = sources.filter((e: any) =>
    Array.isArray(e?.meta?.triggers) ? e.meta.triggers.includes('onKeyChange') : false,
  )

  const pendingRefreshByFieldPath = new Map<string, Fiber.Fiber<void, never>>()

  const readDebounceMs = (entry: any): number => {
    const raw = entry?.meta?.debounceMs
    return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0
  }

  const isSubmitBlockingSource = (entry: any): boolean => entry?.meta?.submitImpact !== 'observe'

  const readSourceKeyHash = (entry: any, state: unknown): string | undefined => {
    try {
      const key = entry?.meta?.key?.(state)
      const canonicalKey = canonicalizeKey(key)
      return canonicalKey._tag === 'accepted' ? canonicalKey.keyHash : undefined
    } catch {
      return undefined
    }
  }

  const refreshSourceEntry = (entry: any): Effect.Effect<void, never, any> => {
    const fieldPath = typeof entry?.fieldPath === 'string' ? entry.fieldPath : ''
    if (!fieldPath) return Effect.void

    const debounceMs = readDebounceMs(entry)
    if (debounceMs <= 0) {
      const pending = pendingRefreshByFieldPath.get(fieldPath)
      if (pending) {
        pendingRefreshByFieldPath.delete(fieldPath)
        return Fiber.interrupt(pending).pipe(
          Effect.flatMap(() => bound.fields.source.refresh(fieldPath)),
          Effect.asVoid,
        )
      }
      return bound.fields.source.refresh(fieldPath)
    }

    return Effect.gen(function* () {
      const pending = pendingRefreshByFieldPath.get(fieldPath)
      if (pending) {
        pendingRefreshByFieldPath.delete(fieldPath)
        yield* Fiber.interrupt(pending)
      }

      const fiber = yield* Effect.forkScoped(
        Effect.sleep(`${debounceMs} millis`).pipe(
          Effect.flatMap(() => bound.fields.source.refresh(fieldPath)),
          Effect.ensuring(Effect.sync(() => pendingRefreshByFieldPath.delete(fieldPath))),
          Effect.catchCause(() => Effect.void),
        ),
      )
      pendingRefreshByFieldPath.set(fieldPath, fiber)
    }).pipe(Effect.asVoid)
  }

  const registerOnMount = (): void => {
    if (sourceOnMount.length === 0) return
    const effect =
      Effect.forEach(sourceOnMount, (entry: any) => bound.fields.source.refresh(entry.fieldPath), {
        concurrency: 'unbounded',
      }).pipe(Effect.asVoid)

    try {
      getBoundInternals(bound as any).lifecycle.registerStart(effect, { name: 'field-source:onMount' })
    } catch {
      // Field runtime can be evaluated by declaration-capture probes without bound internals.
    }
  }

  const refreshOnKeyChange = (changedPath: string): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      if (!changedPath || isAuxRootPath(changedPath)) return
      if (sourceOnKeyChange.length === 0) return

      const changedPattern = toPatternPath(changedPath)

      yield* Effect.forEach(
        sourceOnKeyChange,
        (entry: any) => {
          const deps = (entry?.meta?.deps ?? []) as ReadonlyArray<string>
          const affected = deps.some((dep) => isDepAffectedByChange(dep, changedPattern))
          if (!affected) return Effect.void
          return refreshSourceEntry(entry)
        },
        { concurrency: 'unbounded' },
      )
    }).pipe(Effect.asVoid)

  const flushForSubmit = (): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      if (sourceOnKeyChange.length === 0) return

      yield* Effect.forEach(
        sourceOnKeyChange,
        (entry: any) => {
          if (!isSubmitBlockingSource(entry)) return Effect.void
          const fieldPath = typeof entry?.fieldPath === 'string' ? entry.fieldPath : ''
          if (!fieldPath) return Effect.void

          const pending = pendingRefreshByFieldPath.get(fieldPath)
          let internals: ReturnType<typeof getBoundInternals>
          try {
            internals = getBoundInternals(bound as any)
          } catch {
            return Effect.void
          }

          const handler = internals.fields.getSourceRefreshHandler(fieldPath)
          if (!handler) return Effect.void

          const flushMarker = bound.state.mutate((draft) => {
            const keyHash = readSourceKeyHash(entry, draft)
            if (!keyHash) return

            const current = RowId.getAtPath(draft, fieldPath) as any
            const status = current && typeof current === 'object' ? current.status : undefined
            const currentKeyHash = current && typeof current === 'object' ? current.keyHash : undefined
            if (status === 'success' && currentKeyHash === keyHash) return
            if (status === 'error' && currentKeyHash === keyHash) return

            RowId.setAtPathMutating(
              draft,
              fieldPath,
              Snapshot.loading({ keyHash, submitImpact: entry?.meta?.submitImpact }),
            )
          })

          const forkRefresh = Effect.gen(function* () {
            const state = yield* bound.state.read
            const services = yield* Effect.services<any>()
            yield* internals.fields.forkSourceRefresh(fieldPath, handler, state).pipe(Effect.provideServices(services))
          })

          if (!pending) {
            return flushMarker.pipe(Effect.flatMap(() => forkRefresh), Effect.asVoid)
          }

          pendingRefreshByFieldPath.delete(fieldPath)
          return Fiber.interrupt(pending).pipe(
            Effect.flatMap(() => flushMarker),
            Effect.flatMap(() => forkRefresh),
            Effect.asVoid,
          )
        },
        { concurrency: 'unbounded' },
      )
    }).pipe(Effect.catchCause(() => Effect.void))

  const wiring: SourceWiring = { registerOnMount, refreshOnKeyChange, flushForSubmit }

  try {
    const internals = getBoundInternals(bound as any)
    if (typeof module === 'object' && module !== null) {
      let cachedByModule = SOURCE_WIRING_CACHE.get(internals as object)
      if (!cachedByModule) {
        cachedByModule = new WeakMap<object, SourceWiring>()
        SOURCE_WIRING_CACHE.set(internals as object, cachedByModule)
      }
      cachedByModule.set(module, wiring)
    }
  } catch {
    // Best-effort cache only. The wiring still works as a local instance.
  }

  return wiring
}

/**
 * install: default wiring entrypoint for field runtime wiring.
 *
 * Notes:
 * - This entrypoint gives feature packages one stable dependency point.
 * - Concrete domain wiring is still composed by feature packages on top of this surface.
 */
export const install = (_bound: BoundApi<any, any>): Effect.Effect<void, never, any> => Effect.void
