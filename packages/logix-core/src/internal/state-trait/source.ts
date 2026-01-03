import { Effect, Fiber, FiberRef, Option } from 'effect'
import { create } from 'mutative'
import * as EffectOp from '../effect-op.js'
import { Snapshot, internal as ResourceInternal, keyHash as hashKey } from '../resource.js'
import * as EffectOpCore from '../runtime/core/EffectOpCore.js'
import * as Debug from '../runtime/core/DebugSink.js'
import * as TaskRunner from '../runtime/core/TaskRunner.js'
import { isDevEnv, ReplayModeConfigTag } from '../runtime/core/env.js'
import * as ReplayLog from '../runtime/core/ReplayLog.js'
import type { PatchReason } from '../runtime/core/StateTransaction.js'
import type { FieldPath, FieldPathId } from '../field-path.js'
import { normalizeFieldPath } from '../field-path.js'
import type { BoundApi } from '../runtime/core/module.js'
import { getBoundInternals } from '../runtime/core/runtimeInternalsAccessor.js'
import { RunSessionTag } from '../observability/runSession.js'
import * as DepsTrace from './deps-trace.js'
import * as RowId from './rowid.js'
import type { StateTraitEntry, StateTraitPlanStep, StateTraitProgram } from './model.js'

export interface SourceSyncContext<S> {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly getDraft: () => S
  readonly setDraft: (next: S) => void
  readonly recordPatch: (
    path: string | FieldPath | FieldPathId | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ) => void
}

const onceInRunSession = (key: string): Effect.Effect<boolean, never, any> =>
  Effect.serviceOption(RunSessionTag).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.local.once(key) : true)),
  )

const formatList = (items: ReadonlyArray<string>, limit = 10): string => {
  if (items.length === 0) return ''
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')}, …(+${items.length - limit})`
}

const emitDepsMismatch = (params: {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly kind: 'computed' | 'source'
  readonly fieldPath: string
  readonly diff: DepsTrace.DepsDiff
}): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const key = `${params.instanceId ?? 'unknown'}::${params.kind}::${params.fieldPath}`
    const shouldEmit = yield* onceInRunSession(`deps_mismatch:${key}`)
    if (!shouldEmit) return

    yield* Debug.record({
      type: 'diagnostic',
      moduleId: params.moduleId,
      instanceId: params.instanceId,
      code: 'state_trait::deps_mismatch',
      severity: 'warning',
      message:
        `[deps] ${params.kind} "${params.fieldPath}" declared=[${formatList(params.diff.declared)}] ` +
        `reads=[${formatList(params.diff.reads)}] missing=[${formatList(params.diff.missing)}] ` +
        `unused=[${formatList(params.diff.unused)}]`,
      hint:
        'deps is the single source of truth for dependencies: incremental scheduling / reverse closures / performance optimizations rely on deps only. ' +
        'Keep deps consistent with actual reads; if you really depend on the whole object, declare a coarser-grained dep (e.g. "profile") to cover sub-field reads.',
      kind: `deps_mismatch:${params.kind}`,
    })
  })

const getMiddlewareStack = (): Effect.Effect<EffectOp.MiddlewareStack, never, any> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
  )

const recordTraitPatch = (
  bound: BoundApi<any, any>,
  path: string,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  traitNodeId?: string,
): void => {
  const normalized = normalizeFieldPath(path) ?? []
  try {
    const internals = getBoundInternals(bound as any)
    internals.txn.recordStatePatch(normalized, reason, from, to, traitNodeId)
  } catch {
    // no-op for legacy/mocked bound
  }
}

const recordReplayEvent = (bound: BoundApi<any, any>, event: ReplayLog.ReplayLogEvent): void => {
  try {
    const internals = getBoundInternals(bound as any)
    internals.txn.recordReplayEvent(event)
  } catch {
    // no-op for legacy/mocked bound
  }
}

const getBoundScope = (bound: BoundApi<any, any>): { readonly moduleId?: string; readonly instanceId?: string } => {
  try {
    const internals = getBoundInternals(bound as any)
    return { moduleId: internals.moduleId, instanceId: internals.instanceId }
  } catch {
    return { moduleId: undefined, instanceId: undefined }
  }
}

const setSnapshotInTxn = (
  bound: BoundApi<any, any>,
  fieldPath: string,
  next: unknown,
  reason: PatchReason,
  stepId: string,
  traitNodeId?: string,
): Effect.Effect<boolean, never, any> =>
  Effect.gen(function* () {
    let wrote = false
    yield* bound.state.mutate((draft) => {
      const prev = RowId.getAtPath(draft, fieldPath)
      if (Object.is(prev, next)) return
      wrote = true
      RowId.setAtPathMutating(draft, fieldPath, next)
      recordTraitPatch(bound, fieldPath, reason, prev, next, traitNodeId)
    })
    return wrote
  })

const writebackIfCurrentKeyHash = (
  bound: BoundApi<any, any>,
  fieldPath: string,
  keyHash: string,
  next: unknown,
  reason: PatchReason,
  stepId: string,
  traitNodeId?: string,
  replayEvent?: ReplayLog.ReplayLogEvent,
): Effect.Effect<boolean, never, any> =>
  Effect.gen(function* () {
    let wrote = false
    yield* bound.state.mutate((draft) => {
      const current = RowId.getAtPath(draft, fieldPath)
      const currentKeyHash = current && typeof current === 'object' ? (current as any).keyHash : undefined
      if (currentKeyHash !== keyHash) return

      const prev = current
      if (Object.is(prev, next)) return

      wrote = true
      RowId.setAtPathMutating(draft, fieldPath, next)
      if (replayEvent) {
        recordReplayEvent(bound, replayEvent)
      }
      recordTraitPatch(bound, fieldPath, reason, prev, next, traitNodeId)
    })
    return wrote
  })

/**
 * syncIdleInTransaction：
 * - Synchronously evaluate all source.key(state) within the transaction window.
 * - If a key becomes empty (undefined), synchronously reset the field to an idle snapshot (avoid tearing).
 */
export const syncIdleInTransaction = <S extends object>(
  program: StateTraitProgram<S>,
  ctx: SourceSyncContext<S>,
): Effect.Effect<void> =>
  Effect.sync(() => {
    const draft = ctx.getDraft() as any
    const updates: Array<{ readonly fieldPath: string; readonly prev: unknown }> = []

    for (const entry of program.entries) {
      if (entry.kind !== 'source') continue
      const fieldPath = entry.fieldPath
      const listItem = RowId.parseListItemFieldPath(fieldPath)

      if (listItem) {
        // list.item scope: evaluate key per row by index, and synchronously write back idle for inactive rows.
        const listValue = RowId.getAtPath(draft, listItem.listPath)
        const items: ReadonlyArray<unknown> = Array.isArray(listValue) ? listValue : []

        for (let index = 0; index < items.length; index++) {
          const item = items[index]

          let key: unknown
          try {
            key = (entry.meta as any).key(item)
          } catch {
            continue
          }

          if (key !== undefined) continue

          const concretePath = RowId.toListItemValuePath(listItem.listPath, index, listItem.itemPath)
          const prev = RowId.getAtPath(draft, concretePath)
          const prevStatus = prev && typeof prev === 'object' ? (prev as any).status : undefined
          if (prevStatus === 'idle') {
            const data = (prev as any)?.data
            const error = (prev as any)?.error
            if (data === undefined && error === undefined) {
              continue
            }
          }

          updates.push({ fieldPath: concretePath, prev })
        }

        continue
      }

      let key: unknown
      try {
        key = (entry.meta as any).key(draft)
      } catch {
        continue
      }

      if (key !== undefined) continue

      const prev = RowId.getAtPath(draft, fieldPath)
      const prevStatus = prev && typeof prev === 'object' ? (prev as any).status : undefined
      if (prevStatus === 'idle') {
        // Still ensure data/error are cleared.
        const data = (prev as any)?.data
        const error = (prev as any)?.error
        if (data === undefined && error === undefined) {
          continue
        }
      }

      updates.push({ fieldPath, prev })
    }

    if (updates.length === 0) return

    const reason: PatchReason = 'source-refresh'

    const nextDraft = create(draft, (next) => {
      for (const u of updates) {
        RowId.setAtPathMutating(next, u.fieldPath, Snapshot.idle())
      }
    })

    ctx.setDraft(nextDraft as S)

    for (const u of updates) {
      const normalized = normalizeFieldPath(u.fieldPath) ?? []
      ctx.recordPatch(normalized, reason, u.prev, Snapshot.idle(), `source:${u.fieldPath}:idle`)
    }
  })

/**
 * installSourceRefresh：
 * - Register the refresh implementation for a single source field (ResourceSnapshot + keyHash gate + concurrency).
 */
export const installSourceRefresh = <S>(
  bound: BoundApi<any, any>,
  step: StateTraitPlanStep,
  entry: Extract<StateTraitEntry<S, string>, { readonly kind: 'source' }>,
): Effect.Effect<void, never, any> => {
  if (!step.targetFieldPath) return Effect.void

  const fieldPath = step.targetFieldPath
  const resourceId = step.resourceId ?? entry.meta.resource
  const listItem = RowId.parseListItemFieldPath(fieldPath)

  let internals: ReturnType<typeof getBoundInternals> | undefined
  try {
    internals = getBoundInternals(bound as any)
  } catch {
    return Effect.void
  }

  const register = internals.traits.registerSourceRefresh

  const recordSnapshot = (
    replayMode: 'live' | 'replay',
    replayLog: ReplayLog.ReplayLogService | undefined,
    input:
      | ReplayLog.ReplayLogEvent
      | {
          readonly moduleId?: string
          readonly instanceId?: string
          readonly fieldPath: string
          readonly keyHash?: string
          readonly concurrency?: string
          readonly phase: ReplayLog.ResourceSnapshotPhase
          readonly snapshot: unknown
        },
  ): Effect.Effect<void, never, any> => {
    if (!replayLog) return Effect.void
    if (replayMode !== 'live') return Effect.void
    const event: ReplayLog.ReplayLogEvent =
      input && typeof input === 'object' && (input as any)._tag === 'ResourceSnapshot'
        ? (input as ReplayLog.ReplayLogEvent)
        : {
            _tag: 'ResourceSnapshot',
            resourceId,
            fieldPath: (input as any).fieldPath,
            keyHash: (input as any).keyHash,
            concurrency: (input as any).concurrency,
            phase: (input as any).phase,
            snapshot: (input as any).snapshot,
            timestamp: Date.now(),
            moduleId: (input as any).moduleId,
            instanceId: (input as any).instanceId,
          }
    return replayLog.record(event)
  }

  // list.item scope: in-flight gating by RowID (avoid writing to the wrong row under insert/remove/reorder).
  if (listItem) {
    const store = internals.traits.rowIdStore as RowId.RowIdStore | undefined
    if (!store) {
      return Effect.void
    }

    const listPath = listItem.listPath
    const itemPath = listItem.itemPath
    if (!itemPath) {
      // Never write the snapshot back to the whole item (it would overwrite business values).
      return Effect.void
    }

    const concurrency = (entry.meta as any).concurrency as 'switch' | 'exhaust-trailing' | undefined
    const mode = concurrency ?? 'switch'

    const inFlight = new Map<
      RowId.RowId,
      {
        readonly gen: number
        readonly fiber: Fiber.RuntimeFiber<void, never>
        readonly keyHash: string
      }
    >()
    const trailing = new Map<RowId.RowId, { readonly key: unknown; readonly keyHash: string }>()
    let gen = 0

    // When a row is removed: clear trailing/inFlight references to avoid wrong attribution or memory leaks.
    store.onRemoved(listPath, (rowId) => {
      trailing.delete(rowId)
      inFlight.delete(rowId)
    })

    const setSnapshotForRowInTxn = (
      rowId: RowId.RowId,
      next: unknown,
      reason: PatchReason,
      stepId: string,
    ): Effect.Effect<string | undefined, never, any> =>
      Effect.gen(function* () {
        let wrotePath: string | undefined
        yield* bound.state.mutate((draft) => {
          const index = store.getIndex(listPath, rowId)
          if (index === undefined) return
          const concretePath = RowId.toListItemValuePath(listPath, index, itemPath)
          const prev = RowId.getAtPath(draft, concretePath)
          if (Object.is(prev, next)) return
          wrotePath = concretePath
          RowId.setAtPathMutating(draft, concretePath, next)
          recordTraitPatch(bound, concretePath, reason, prev, next, step.debugInfo?.graphNodeId)
        })
        return wrotePath
      })

    const writebackIfCurrentKeyHashForRow = (
      rowId: RowId.RowId,
      keyHash: string,
      next: unknown,
      reason: PatchReason,
      stepId: string,
      phase?: ReplayLog.ResourceSnapshotPhase,
    ): Effect.Effect<string | undefined, never, any> =>
      Effect.gen(function* () {
        let wrotePath: string | undefined
        yield* bound.state.mutate((draft) => {
          const index = store.getIndex(listPath, rowId)
          if (index === undefined) return
          const concretePath = RowId.toListItemValuePath(listPath, index, itemPath)

          const current = RowId.getAtPath(draft, concretePath)
          const currentKeyHash = current && typeof current === 'object' ? (current as any).keyHash : undefined
          if (currentKeyHash !== keyHash) return

          const prev = current
          if (Object.is(prev, next)) return

          wrotePath = concretePath
          RowId.setAtPathMutating(draft, concretePath, next)
          if (phase) {
            const { moduleId, instanceId } = getBoundScope(bound)
            recordReplayEvent(bound, {
              _tag: 'ResourceSnapshot',
              resourceId,
              fieldPath: concretePath,
              keyHash,
              concurrency: mode,
              phase,
              snapshot: next,
              timestamp: Date.now(),
              moduleId,
              instanceId,
            })
          }
          recordTraitPatch(bound, concretePath, reason, prev, next, step.debugInfo?.graphNodeId)
        })
        return wrotePath
      })

    const startFetch = (
      rowId: RowId.RowId,
      key: unknown,
      keyHash: string,
      replayMode: 'live' | 'replay',
      replayLog: ReplayLog.ReplayLogService | undefined,
    ): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const { moduleId, instanceId } = getBoundScope(bound)

        const indexForLog = store.getIndex(listPath, rowId)
        const logFieldPath =
          indexForLog === undefined ? undefined : RowId.toListItemValuePath(listPath, indexForLog, itemPath)

        let loadingSnapshot: unknown = Snapshot.loading({ keyHash })
        if (replayMode === 'replay' && replayLog && logFieldPath) {
          const replayLoading = yield* replayLog.consumeNextResourceSnapshot({
            resourceId,
            fieldPath: logFieldPath,
            keyHash,
            phase: 'loading',
          })
          if (replayLoading) {
            loadingSnapshot = replayLoading.snapshot
          }
        }
        const wroteLoadingPath = yield* setSnapshotForRowInTxn(
          rowId,
          loadingSnapshot,
          'source-refresh',
          `source:${fieldPath}:${rowId}:loading`,
        )
        if (wroteLoadingPath) {
          const event: ReplayLog.ReplayLogEvent = {
            _tag: 'ResourceSnapshot',
            resourceId,
            fieldPath: wroteLoadingPath,
            keyHash,
            concurrency: mode,
            phase: 'loading',
            snapshot: loadingSnapshot,
            timestamp: Date.now(),
            moduleId,
            instanceId,
          }
          recordReplayEvent(bound, event)
          yield* recordSnapshot(replayMode, replayLog, event)
        }

        const io = Effect.gen(function* () {
          if (replayMode === 'replay' && replayLog) {
            // Let loading commit become visible first, then replay the settled phase (preserve the async-resource timeline shape).
            yield* Effect.yieldNow()
            const consumePath = wroteLoadingPath ?? logFieldPath
            if (!consumePath) return yield* Effect.void

            const replayed = yield* replayLog.consumeNextResourceSnapshot({
              resourceId,
              fieldPath: consumePath,
              keyHash,
            })
            if (!replayed) return yield* Effect.void

            if (replayed.phase === 'success') {
              yield* writebackIfCurrentKeyHashForRow(
                rowId,
                keyHash,
                replayed.snapshot,
                'source-refresh',
                `source:${fieldPath}:${rowId}:success`,
                'success',
              )
            } else if (replayed.phase === 'error') {
              yield* writebackIfCurrentKeyHashForRow(
                rowId,
                keyHash,
                replayed.snapshot,
                'source-refresh',
                `source:${fieldPath}:${rowId}:error`,
                'error',
              )
            }

            return yield* Effect.void
          }

          const stack = yield* getMiddlewareStack()

          const registryOpt = yield* Effect.serviceOption(ResourceInternal.ResourceRegistryTag)
          const registry = Option.isSome(registryOpt) ? registryOpt.value : undefined
          const spec = registry?.specs.get(resourceId)

          if (!spec) {
            return yield* Effect.void
          }

          const loadEffect = (spec.load as any)(key) as Effect.Effect<any, any, any>

          const meta: any = {
            moduleId,
            instanceId,
            fieldPath,
            resourceId,
            key,
            keyHash,
            rowId,
            traitNodeId: step.debugInfo?.graphNodeId,
            stepId: step.id,
          }

          if (!(typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq))) {
            const sessionOpt = yield* Effect.serviceOption(RunSessionTag)
            if (Option.isSome(sessionOpt)) {
              const seqKey = instanceId ?? 'global'
              meta.opSeq = sessionOpt.value.local.nextSeq('opSeq', seqKey)
            }
          }

          const op = EffectOp.make<any, any, any>({
            kind: 'service',
            name: resourceId,
            effect: loadEffect,
            meta,
          })

          const exit = yield* Effect.exit(EffectOp.run(op, stack))

          if (exit._tag === 'Success') {
            const successSnapshot = Snapshot.success({ keyHash, data: exit.value })
            const wroteSuccessPath = yield* writebackIfCurrentKeyHashForRow(
              rowId,
              keyHash,
              successSnapshot,
              'source-refresh',
              `source:${fieldPath}:${rowId}:success`,
              'success',
            )
            if (wroteSuccessPath) {
              yield* recordSnapshot(replayMode, replayLog, {
                _tag: 'ResourceSnapshot',
                resourceId,
                fieldPath: wroteSuccessPath,
                keyHash,
                concurrency: mode,
                phase: 'success',
                snapshot: successSnapshot,
                timestamp: Date.now(),
                moduleId,
                instanceId,
              })
            }
          } else {
            const errorSnapshot = Snapshot.error({ keyHash, error: exit.cause })
            const wroteErrorPath = yield* writebackIfCurrentKeyHashForRow(
              rowId,
              keyHash,
              errorSnapshot,
              'source-refresh',
              `source:${fieldPath}:${rowId}:error`,
              'error',
            )
            if (wroteErrorPath) {
              yield* recordSnapshot(replayMode, replayLog, {
                _tag: 'ResourceSnapshot',
                resourceId,
                fieldPath: wroteErrorPath,
                keyHash,
                concurrency: mode,
                phase: 'error',
                snapshot: errorSnapshot,
                timestamp: Date.now(),
                moduleId,
                instanceId,
              })
            }
          }
        }).pipe(Effect.catchAllCause(() => Effect.void))

        // list.item: IO fibers must detach from the sync-transaction FiberRef; otherwise they'd be misclassified as "in txn window"
        // and block subsequent writeback entrypoints.
        const fiber = yield* Effect.forkScoped(Effect.locally(TaskRunner.inSyncTransactionFiber, false)(io))
        const myGen = (gen += 1)
        inFlight.set(rowId, { gen: myGen, fiber, keyHash })

        yield* Effect.forkScoped(
          Effect.locally(
            TaskRunner.inSyncTransactionFiber,
            false,
          )(
            Fiber.await(fiber).pipe(
              Effect.zipRight(
                Effect.sync(() => {
                  const current = inFlight.get(rowId)
                  if (current && current.gen === myGen) {
                    inFlight.delete(rowId)
                  }
                }),
              ),
              Effect.zipRight(
                mode === 'exhaust-trailing'
                  ? Effect.gen(function* () {
                      const next = trailing.get(rowId)
                      trailing.delete(rowId)
                      if (next) {
                        yield* startFetch(rowId, next.key, next.keyHash, replayMode, replayLog)
                      }
                    })
                  : Effect.void,
              ),
              Effect.catchAllCause(() => Effect.void),
            ),
          ),
        )
      })

    register(fieldPath, (state: any) =>
      Effect.gen(function* () {
        const { moduleId, instanceId } = getBoundScope(bound)
        const replayModeOpt = yield* Effect.serviceOption(ReplayModeConfigTag)
        const replayMode = Option.isSome(replayModeOpt) ? replayModeOpt.value.mode : 'live'
        const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog)
        const replayLog = Option.isSome(replayLogOpt) ? replayLogOpt.value : undefined
        const force = yield* FiberRef.get(TaskRunner.forceSourceRefresh)

        const listValue = RowId.getAtPath(state, listPath)
        const items: ReadonlyArray<unknown> = Array.isArray(listValue) ? listValue : []
        const ids = store.ensureList(listPath, items)

        // dev-mode: trace deps once for the first row (diagnostics only; does not affect execution semantics).
        const traceKey = `${instanceId ?? 'unknown'}::source::${fieldPath}`
        if (isDevEnv() && (yield* onceInRunSession(`deps_trace_settled:${traceKey}`))) {
          try {
            const sample = items[0]
            if (sample !== undefined) {
              const traced = DepsTrace.trace((s) => (entry.meta as any).key(s), sample as any)
              const prefixedReads = traced.reads.map((r) => (r ? `${listPath}[].${r}` : `${listPath}[]`))
              const diff = DepsTrace.diffDeps(((entry.meta as any).deps ?? []) as ReadonlyArray<string>, prefixedReads)
              if (diff) {
                yield* emitDepsMismatch({
                  moduleId,
                  instanceId,
                  kind: 'source',
                  fieldPath,
                  diff,
                })
              }
            }
          } catch {
            // tracing failure should never break refresh flow
          }
        }

        for (let index = 0; index < items.length; index++) {
          const rowId = ids[index]
          if (!rowId) continue

          const concretePath = RowId.toListItemValuePath(listPath, index, itemPath)
          const prevSnapshot = RowId.getAtPath(state, concretePath) as any

          let key: unknown
          try {
            key = (entry.meta as any).key(items[index])
          } catch {
            key = undefined
          }

          const current = inFlight.get(rowId)

          if (key === undefined) {
            trailing.delete(rowId)
            inFlight.delete(rowId)

            // If it's already clean idle, avoid redundant writeback (prevents meaningless patches and UI jitter).
            if (
              prevSnapshot &&
              typeof prevSnapshot === 'object' &&
              prevSnapshot.status === 'idle' &&
              prevSnapshot.data === undefined &&
              prevSnapshot.error === undefined
            ) {
              continue
            }

            const idleSnapshot = Snapshot.idle()
            const wroteIdlePath = yield* setSnapshotForRowInTxn(
              rowId,
              idleSnapshot,
              'source-refresh',
              `source:${fieldPath}:${rowId}:idle`,
            )
            if (wroteIdlePath) {
              const event: ReplayLog.ReplayLogEvent = {
                _tag: 'ResourceSnapshot',
                resourceId,
                fieldPath: wroteIdlePath,
                keyHash: undefined,
                concurrency: mode,
                phase: 'idle',
                snapshot: idleSnapshot,
                timestamp: Date.now(),
                moduleId,
                instanceId,
              }
              recordReplayEvent(bound, event)
              yield* recordSnapshot(replayMode, replayLog, event)
            }
            continue
          }

          const h = hashKey(key)

          // keyHash unchanged: avoid redundant refresh while keeping in-flight.
          if (!force && current && current.keyHash === h) {
            continue
          }

          // Not in-flight: if snapshot.keyHash already matches, treat it as already up-to-date (avoid full refresh and row jitter).
          const prevKeyHash =
            prevSnapshot && typeof prevSnapshot === 'object' ? (prevSnapshot as any).keyHash : undefined
          if (!force && !current && prevKeyHash === h) {
            continue
          }

          if (mode === 'exhaust-trailing' && current) {
            trailing.set(rowId, { key, keyHash: h })
            const loadingSnapshot = Snapshot.loading({ keyHash: h })
            const wroteLoadingPath = yield* setSnapshotForRowInTxn(
              rowId,
              loadingSnapshot,
              'source-refresh',
              `source:${fieldPath}:${rowId}:loading`,
            )
            if (wroteLoadingPath) {
              const event: ReplayLog.ReplayLogEvent = {
                _tag: 'ResourceSnapshot',
                resourceId,
                fieldPath: wroteLoadingPath,
                keyHash: h,
                concurrency: mode,
                phase: 'loading',
                snapshot: loadingSnapshot,
                timestamp: Date.now(),
                moduleId,
                instanceId,
              }
              recordReplayEvent(bound, event)
              yield* recordSnapshot(replayMode, replayLog, event)
            }
            continue
          }

          if (mode === 'switch' && current) {
            // Do not rely on cancellation correctness: stale writebacks are dropped by the keyHash gate.
            trailing.delete(rowId)
            inFlight.delete(rowId)
          }

          yield* startFetch(rowId, key, h, replayMode, replayLog)
        }
      }),
    )

    return Effect.void
  }

  // in-flight state (per field)
  let inFlight:
    | {
        readonly gen: number
        readonly fiber: Fiber.RuntimeFiber<void, never>
        readonly keyHash: string
      }
    | undefined
  let gen = 0
  let trailing: { readonly key: unknown; readonly keyHash: string } | undefined

  const concurrency = (entry.meta as any).concurrency as 'switch' | 'exhaust-trailing' | undefined
  const mode = concurrency ?? 'switch'

  const startFetch = (
    key: unknown,
    keyHash: string,
    replayMode: 'live' | 'replay',
    replayLog: ReplayLog.ReplayLogService | undefined,
  ): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      const { moduleId, instanceId } = getBoundScope(bound)

      // 1) pending: synchronously write a loading snapshot (within the current transaction window).
      let loadingSnapshot: unknown = Snapshot.loading({ keyHash })
      if (replayMode === 'replay' && replayLog) {
        const replayLoading = yield* replayLog.consumeNextResourceSnapshot({
          resourceId,
          fieldPath,
          keyHash,
          phase: 'loading',
        })
        if (replayLoading) {
          loadingSnapshot = replayLoading.snapshot
        }
      }
      const wroteLoading = yield* setSnapshotInTxn(
        bound,
        fieldPath,
        loadingSnapshot,
        'source-refresh',
        `source:${fieldPath}:loading`,
        step.debugInfo?.graphNodeId,
      )
      if (wroteLoading) {
        const event: ReplayLog.ReplayLogEvent = {
          _tag: 'ResourceSnapshot',
          resourceId,
          fieldPath,
          keyHash,
          concurrency: mode,
          phase: 'loading',
          snapshot: loadingSnapshot,
          timestamp: Date.now(),
          moduleId,
          instanceId,
        }
        recordReplayEvent(bound, event)
        yield* recordSnapshot(replayMode, replayLog, event)
      }

      // 2) IO: run in a background fiber (avoid blocking the current transaction).
      const io = Effect.gen(function* () {
        if (replayMode === 'replay' && replayLog) {
          // Let loading commit become visible first, then replay the settled phase (preserve the async-resource timeline shape).
          yield* Effect.yieldNow()
          const replayed = yield* replayLog.consumeNextResourceSnapshot({
            resourceId,
            fieldPath,
            keyHash,
          })
          if (!replayed) return yield* Effect.void

          if (replayed.phase === 'success') {
            const event: ReplayLog.ReplayLogEvent = {
              _tag: 'ResourceSnapshot',
              resourceId,
              fieldPath,
              keyHash,
              concurrency: mode,
              phase: 'success',
              snapshot: replayed.snapshot,
              timestamp: Date.now(),
              moduleId,
              instanceId,
            }
            yield* writebackIfCurrentKeyHash(
              bound,
              fieldPath,
              keyHash,
              replayed.snapshot,
              'source-refresh',
              `source:${fieldPath}:success`,
              step.debugInfo?.graphNodeId,
              event,
            )
          } else if (replayed.phase === 'error') {
            const event: ReplayLog.ReplayLogEvent = {
              _tag: 'ResourceSnapshot',
              resourceId,
              fieldPath,
              keyHash,
              concurrency: mode,
              phase: 'error',
              snapshot: replayed.snapshot,
              timestamp: Date.now(),
              moduleId,
              instanceId,
            }
            yield* writebackIfCurrentKeyHash(
              bound,
              fieldPath,
              keyHash,
              replayed.snapshot,
              'source-refresh',
              `source:${fieldPath}:error`,
              step.debugInfo?.graphNodeId,
              event,
            )
          }

          return yield* Effect.void
        }

        const stack = yield* getMiddlewareStack()

        const registryOpt = yield* Effect.serviceOption(ResourceInternal.ResourceRegistryTag)
        const registry = Option.isSome(registryOpt) ? registryOpt.value : undefined
        const spec = registry?.specs.get(resourceId)

        if (!spec) {
          return yield* Effect.void
        }

        const loadEffect = (spec.load as any)(key) as Effect.Effect<any, any, any>

        const meta: any = {
          moduleId,
          instanceId,
          fieldPath,
          resourceId,
          key,
          keyHash,
          traitNodeId: step.debugInfo?.graphNodeId,
          stepId: step.id,
        }

        if (!(typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq))) {
          const sessionOpt = yield* Effect.serviceOption(RunSessionTag)
          if (Option.isSome(sessionOpt)) {
            const seqKey = instanceId ?? 'global'
            meta.opSeq = sessionOpt.value.local.nextSeq('opSeq', seqKey)
          }
        }

        const op = EffectOp.make<any, any, any>({
          kind: 'trait-source',
          name: resourceId,
          effect: loadEffect,
          meta,
        })

        const exit = yield* Effect.exit(EffectOp.run(op, stack))

        // 3) writeback: use a keyHash gate to prevent stale results from writing back onto a new key.
        if (exit._tag === 'Success') {
          const successSnapshot = Snapshot.success({ keyHash, data: exit.value })
          const event: ReplayLog.ReplayLogEvent = {
            _tag: 'ResourceSnapshot',
            resourceId,
            fieldPath,
            keyHash,
            concurrency: mode,
            phase: 'success',
            snapshot: successSnapshot,
            timestamp: Date.now(),
            moduleId,
            instanceId,
          }
          const wroteSuccess = yield* writebackIfCurrentKeyHash(
            bound,
            fieldPath,
            keyHash,
            successSnapshot,
            'source-refresh',
            `source:${fieldPath}:success`,
            step.debugInfo?.graphNodeId,
            event,
          )
          if (wroteSuccess) {
            yield* recordSnapshot(replayMode, replayLog, event)
          }
        } else {
          const errorSnapshot = Snapshot.error({ keyHash, error: exit.cause })
          const event: ReplayLog.ReplayLogEvent = {
            _tag: 'ResourceSnapshot',
            resourceId,
            fieldPath,
            keyHash,
            concurrency: mode,
            phase: 'error',
            snapshot: errorSnapshot,
            timestamp: Date.now(),
            moduleId,
            instanceId,
          }
          const wroteError = yield* writebackIfCurrentKeyHash(
            bound,
            fieldPath,
            keyHash,
            errorSnapshot,
            'source-refresh',
            `source:${fieldPath}:error`,
            step.debugInfo?.graphNodeId,
            event,
          )
          if (wroteError) {
            yield* recordSnapshot(replayMode, replayLog, event)
          }
        }
      }).pipe(Effect.catchAllCause(() => Effect.void))

      // Do not wait for IO completion: forkScoped into the runtime scope so unmount will interrupt automatically.
      const fiber = yield* Effect.forkScoped(Effect.locally(TaskRunner.inSyncTransactionFiber, false)(io))
      const myGen = (gen += 1)
      inFlight = { gen: myGen, fiber, keyHash }

      // After in-flight completes, clean up; in exhaust-trailing mode, run one trailing fetch if present.
      yield* Effect.forkScoped(
        Effect.locally(
          TaskRunner.inSyncTransactionFiber,
          false,
        )(
          Fiber.await(fiber).pipe(
            Effect.zipRight(
              Effect.sync(() => {
                if (inFlight && inFlight.gen === myGen) {
                  inFlight = undefined
                }
              }),
            ),
            Effect.zipRight(
              mode === 'exhaust-trailing'
                ? Effect.gen(function* () {
                    const next = trailing
                    trailing = undefined
                    if (next) {
                      yield* startFetch(next.key, next.keyHash, replayMode, replayLog)
                    }
                  })
                : Effect.void,
            ),
            Effect.catchAllCause(() => Effect.void),
          ),
        ),
      )
    })

  register(fieldPath, (state: any) =>
    Effect.gen(function* () {
      const { moduleId, instanceId } = getBoundScope(bound)
      const replayModeOpt = yield* Effect.serviceOption(ReplayModeConfigTag)
      const replayMode = Option.isSome(replayModeOpt) ? replayModeOpt.value.mode : 'live'
      const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog)
      const replayLog = Option.isSome(replayLogOpt) ? replayLogOpt.value : undefined
      const force = yield* FiberRef.get(TaskRunner.forceSourceRefresh)

      let key: unknown
      try {
        key = (entry.meta as any).key(state)
      } catch {
        key = undefined
      }

      // dev-mode: detect mismatch between actual reads in keySelector and declared deps (diagnostics only; does not affect execution semantics).
      const traceKey = `${instanceId ?? 'unknown'}::source::${fieldPath}`
      if (isDevEnv() && (yield* onceInRunSession(`deps_trace_settled:${traceKey}`))) {
        try {
          const traced = DepsTrace.trace((s) => (entry.meta as any).key(s), state)
          const diff = DepsTrace.diffDeps(((entry.meta as any).deps ?? []) as ReadonlyArray<string>, traced.reads)
          if (diff) {
            yield* emitDepsMismatch({
              moduleId,
              instanceId,
              kind: 'source',
              fieldPath,
              diff,
            })
          }
        } catch {
          // tracing failure should never break refresh flow
        }
      }

      // Key becomes empty: synchronously clear to idle (and interrupt in-flight).
      if (key === undefined) {
        if (inFlight) {
          yield* Fiber.interruptFork(inFlight.fiber)
          inFlight = undefined
        }
        trailing = undefined

        const idleSnapshot = Snapshot.idle()
        const wroteIdle = yield* setSnapshotInTxn(
          bound,
          fieldPath,
          idleSnapshot,
          'source-refresh',
          `source:${fieldPath}:idle`,
          step.debugInfo?.graphNodeId,
        )
        if (wroteIdle) {
          const event: ReplayLog.ReplayLogEvent = {
            _tag: 'ResourceSnapshot',
            resourceId,
            fieldPath,
            keyHash: undefined,
            concurrency: mode,
            phase: 'idle',
            snapshot: idleSnapshot,
            timestamp: Date.now(),
            moduleId,
            instanceId,
          }
          recordReplayEvent(bound, event)
          yield* recordSnapshot(replayMode, replayLog, event)
        }
        return
      }

      const h = hashKey(key)

      // Default semantics: when a non-idle snapshot already exists for the same keyHash, refresh should be a no-op when possible
      // (avoid duplicate IO/writeback). Explicit refresh/invalidate can bypass via force.
      if (!force) {
        if (inFlight && inFlight.keyHash === h) {
          return
        }

        const currentSnapshot = RowId.getAtPath(state, fieldPath) as any
        const currentKeyHash =
          currentSnapshot && typeof currentSnapshot === 'object' ? (currentSnapshot as any).keyHash : undefined
        const currentStatus =
          currentSnapshot && typeof currentSnapshot === 'object' ? (currentSnapshot as any).status : undefined
        if (currentStatus && currentStatus !== 'idle' && currentKeyHash === h) {
          return
        }
      }

      if (mode === 'exhaust-trailing' && inFlight) {
        // Busy: record trailing and update loading immediately; stale in-flight writebacks will be blocked by the keyHash gate.
        trailing = { key, keyHash: h }
        const loadingSnapshot = Snapshot.loading({ keyHash: h })
        const wroteLoading = yield* setSnapshotInTxn(
          bound,
          fieldPath,
          loadingSnapshot,
          'source-refresh',
          `source:${fieldPath}:loading`,
          step.debugInfo?.graphNodeId,
        )
        if (wroteLoading) {
          const event: ReplayLog.ReplayLogEvent = {
            _tag: 'ResourceSnapshot',
            resourceId,
            fieldPath,
            keyHash: h,
            concurrency: mode,
            phase: 'loading',
            snapshot: loadingSnapshot,
            timestamp: Date.now(),
            moduleId,
            instanceId,
          }
          recordReplayEvent(bound, event)
          yield* recordSnapshot(replayMode, replayLog, event)
        }
        return
      }

      if (mode === 'switch' && inFlight) {
        yield* Fiber.interruptFork(inFlight.fiber)
        inFlight = undefined
        trailing = undefined
      }

      // start fetch (pending tx + fork IO)
      yield* startFetch(key, h, replayMode, replayLog)
    }),
  )

  return Effect.void
}
