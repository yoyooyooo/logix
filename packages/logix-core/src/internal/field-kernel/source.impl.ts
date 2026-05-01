import { Effect, Fiber, Option } from 'effect'
import { create } from 'mutative'
import * as EffectOp from '../effect-op.js'
import { Snapshot, canonicalizeKey } from '../resource.js'
import { FieldSourceRegistryTag } from '../field-source-registry.js'
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
import { RunSessionTag } from '../verification/runSession.js'
import type { RunSession } from '../verification/runSession.js'
import * as DepsTrace from './deps-trace.js'
import * as RowId from './rowid.js'
import type { FieldEntry, FieldPlanStep, FieldProgram } from './model.js'
import type { ServiceMap } from 'effect'

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
    fieldNodeId?: string,
    stepId?: number,
  ) => void
}

const onceInRunSession = (key: string): Effect.Effect<boolean, never, any> =>
  Effect.serviceOption(RunSessionTag as unknown as ServiceMap.Key<any, RunSession>).pipe(
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
      code: 'field_kernel::deps_mismatch',
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

const emitSourceKeyRejected = (params: {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly fieldPath: string
  readonly resourceId: string
  readonly reason: string
  readonly keyPath: string
}): Effect.Effect<void, never, any> =>
  Debug.record({
    type: 'diagnostic',
    moduleId: params.moduleId,
    instanceId: params.instanceId,
    code: 'field_kernel::source_key_rejected',
    severity: 'error',
    message: `[source] "${params.fieldPath}" rejected non-canonical key for resource "${params.resourceId}" at ${params.keyPath}: ${params.reason}`,
    hint:
      'Return undefined to make the source idle, or return a canonical key made from null, boolean, string, finite number, arrays, and plain objects without undefined, cycles, sparse slots, symbols, functions, class instances, Date, Map, Set, RegExp, Promise, or typed arrays.',
    kind: 'source_key_rejected',
    trigger: {
      kind: 'field-source',
      name: params.fieldPath,
      details: {
        resourceId: params.resourceId,
        reason: params.reason,
        keyPath: params.keyPath,
      },
    },
  }).pipe(Effect.catchCause(() => Effect.void))

const getMiddlewareStack = (): Effect.Effect<EffectOpCore.EffectOpMiddlewareEnv['stack'], never, any> =>
  Effect.serviceOption(
    EffectOpCore.EffectOpMiddlewareTag as unknown as ServiceMap.Key<any, EffectOpCore.EffectOpMiddlewareEnv>,
  ).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
  )

const recordFieldPatch = (
  bound: BoundApi<any, any>,
  path: string,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  fieldNodeId?: string,
): void => {
  const normalized = normalizeFieldPath(path) ?? []
  try {
    const internals = getBoundInternals(bound as any)
    internals.txn.recordStatePatch(normalized, reason, from, to, fieldNodeId)
  } catch {
    // no-op for test-double or partially wired bound
  }
}

const recordReplayEvent = (bound: BoundApi<any, any>, event: ReplayLog.ReplayLogEvent): void => {
  try {
    const internals = getBoundInternals(bound as any)
    internals.txn.recordReplayEvent(event)
  } catch {
    // no-op for test-double or partially wired bound
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

const recordSourceSnapshotPhase = (params: {
  readonly bound: BoundApi<any, any>
  readonly replayMode: 'live' | 'replay' | 'record'
  readonly replayLog?: ReplayLog.ReplayLogService
  readonly event: ReplayLog.ReplayLogEvent
}): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    if (!params.replayLog) return
    if (params.replayMode !== 'live') return
    yield* params.replayLog.record(params.event)
  })

const setSnapshotInTxn = (
  bound: BoundApi<any, any>,
  fieldPath: string,
  next: unknown,
  reason: PatchReason,
  stepId: string,
  fieldNodeId?: string,
): Effect.Effect<boolean, never, any> =>
  Effect.gen(function* () {
    let wrote = false
    yield* bound.state.mutate((draft) => {
      const prev = RowId.getAtPath(draft, fieldPath)
      if (Object.is(prev, next)) return
      wrote = true
      RowId.setAtPathMutating(draft, fieldPath, next)
      recordFieldPatch(bound, fieldPath, reason, prev, next, fieldNodeId)
    })
    return wrote
  })

const writeSourceSnapshotIfCurrentKeyHash = (
  bound: BoundApi<any, any>,
  fieldPath: string,
  keyHash: string,
  taskGen: number,
  readCurrentGen: () => number,
  next: unknown,
  reason: PatchReason,
  stepId: string,
  fieldNodeId?: string,
  replayEvent?: ReplayLog.ReplayLogEvent,
): Effect.Effect<boolean, never, any> =>
  Effect.gen(function* () {
    let wrote = false
    yield* bound.state.mutate((draft) => {
      const current = RowId.getAtPath(draft, fieldPath)
      const currentKeyHash = current && typeof current === 'object' ? (current as any).keyHash : undefined
      if (currentKeyHash !== keyHash) return
      if (readCurrentGen() !== taskGen) return

      const prev = current
      if (Object.is(prev, next)) return

      wrote = true
      RowId.setAtPathMutating(draft, fieldPath, next)
      if (replayEvent) {
        recordReplayEvent(bound, replayEvent)
      }
      recordFieldPatch(bound, fieldPath, reason, prev, next, fieldNodeId)
    })
    return wrote
  })

/**
 * syncIdleInTransaction：
 * - Synchronously evaluate all source.key(state) within the transaction window.
 * - If a key becomes empty (undefined), synchronously reset the field to an idle snapshot (avoid tearing).
 */
export const syncIdleInTransaction = <S extends object>(
  program: FieldProgram<S>,
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
  step: FieldPlanStep,
  entry: Extract<FieldEntry<S, string>, { readonly kind: 'source' }>,
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

  const register = internals.fields.registerSourceRefresh

  // list.item scope: in-flight gating by RowID (avoid writing to the wrong row under insert/remove/reorder).
  if (listItem) {
    const store = internals.fields.rowIdStore as RowId.RowIdStore | undefined
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
        readonly fiber: Fiber.Fiber<void, never>
        readonly keyHash: string
      }
    >()
    const trailing = new Map<RowId.RowId, { readonly key: unknown; readonly keyHash: string }>()
    const activeGen = new Map<RowId.RowId, number>()
    let gen = 0

    // When a row is removed: clear trailing/inFlight references to avoid wrong attribution or memory leaks.
    store.onRemoved(listPath, (rowId) => {
      trailing.delete(rowId)
      inFlight.delete(rowId)
      activeGen.delete(rowId)
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
          recordFieldPatch(bound, concretePath, reason, prev, next, step.debugInfo?.graphNodeId)
        })
        return wrotePath
      })

    const writeSourceSnapshotIfCurrentKeyHashForRow = (
      rowId: RowId.RowId,
      keyHash: string,
      taskGen: number,
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
          if (activeGen.get(rowId) !== taskGen) return

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
          recordFieldPatch(bound, concretePath, reason, prev, next, step.debugInfo?.graphNodeId)
        })
        return wrotePath
      })

    const startFetch = (
      rowId: RowId.RowId,
      key: unknown,
      keyHash: string,
      replayMode: 'live' | 'replay' | 'record',
      replayLog: ReplayLog.ReplayLogService | undefined,
    ): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const { moduleId, instanceId } = getBoundScope(bound)
        const myGen = (gen += 1)
        activeGen.set(rowId, myGen)

        const indexForLog = store.getIndex(listPath, rowId)
        const logFieldPath =
          indexForLog === undefined ? undefined : RowId.toListItemValuePath(listPath, indexForLog, itemPath)

        let loadingSnapshot: unknown = Snapshot.loading({ keyHash, submitImpact: entry.meta?.submitImpact })
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
          yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
        }

        const io = Effect.gen(function* () {
          if (replayMode === 'replay' && replayLog) {
            // Let loading commit become visible first, then replay the settled phase (preserve the async-resource timeline shape).
            yield* Effect.yieldNow
            const consumePath = wroteLoadingPath ?? logFieldPath
            if (!consumePath) return yield* Effect.void

            const replayed = yield* replayLog.consumeNextResourceSnapshot({
              resourceId,
              fieldPath: consumePath,
              keyHash,
            })
            if (!replayed) return yield* Effect.void

            if (replayed.phase === 'success') {
              yield* writeSourceSnapshotIfCurrentKeyHashForRow(
                rowId,
                keyHash,
                myGen,
                replayed.snapshot,
                'source-refresh',
                `source:${fieldPath}:${rowId}:success`,
                'success',
              )
            } else if (replayed.phase === 'error') {
              yield* writeSourceSnapshotIfCurrentKeyHashForRow(
                rowId,
                keyHash,
                myGen,
                replayed.snapshot,
                'source-refresh',
                `source:${fieldPath}:${rowId}:error`,
                'error',
              )
            }

            return yield* Effect.void
          }

          const stack = yield* getMiddlewareStack()

          const registryOpt = yield* Effect.serviceOption(
            FieldSourceRegistryTag as unknown as ServiceMap.Key<any, { specs: Map<string, { load: (key: unknown) => Effect.Effect<any, any, any> }> }>,
          )
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
            fieldNodeId: step.debugInfo?.graphNodeId,
            stepId: step.id,
          }

          if (!(typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq))) {
            const sessionOpt = yield* Effect.serviceOption(RunSessionTag as unknown as ServiceMap.Key<any, RunSession>)
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
            const wroteSuccessPath = yield* writeSourceSnapshotIfCurrentKeyHashForRow(
              rowId,
              keyHash,
              myGen,
              successSnapshot,
              'source-refresh',
              `source:${fieldPath}:${rowId}:success`,
              'success',
            )
            if (wroteSuccessPath) {
              yield* recordSourceSnapshotPhase({
                bound,
                replayMode,
                replayLog,
                event: {
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
                },
              })
            }
          } else {
            const errorSnapshot = Snapshot.error({ keyHash, error: exit.cause })
            const wroteErrorPath = yield* writeSourceSnapshotIfCurrentKeyHashForRow(
              rowId,
              keyHash,
              myGen,
              errorSnapshot,
              'source-refresh',
              `source:${fieldPath}:${rowId}:error`,
              'error',
            )
            if (wroteErrorPath) {
              yield* recordSourceSnapshotPhase({
                bound,
                replayMode,
                replayLog,
                event: {
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
                },
              })
            }
          }
        }).pipe(Effect.catchCause(() => Effect.void))

        // list.item: IO fibers must detach from the sync-transaction FiberRef; otherwise they'd be misclassified as "in txn window"
        // and block subsequent writeback entrypoints.
        const fiber = yield* Effect.forkScoped(Effect.provideService(io, TaskRunner.inSyncTransactionFiber, false))
        inFlight.set(rowId, { gen: myGen, fiber, keyHash })

        yield* Effect.forkScoped(
          Effect.provideService(Fiber.await(fiber).pipe(
            Effect.flatMap(() => Effect.sync(() => {
              const current = inFlight.get(rowId)
              if (current && current.gen === myGen) {
                inFlight.delete(rowId)
              }
            })),
            Effect.flatMap(() => mode === 'exhaust-trailing'
              ? Effect.gen(function* () {
                  const next = trailing.get(rowId)
                  trailing.delete(rowId)
                  if (next) {
                    yield* startFetch(rowId, next.key, next.keyHash, replayMode, replayLog)
                  }
                })
              : Effect.void),
            Effect.catchCause(() => Effect.void),
          ), TaskRunner.inSyncTransactionFiber, false),
        )
      })

    register(fieldPath, (state: any) =>
      Effect.gen(function* () {
        const { moduleId, instanceId } = getBoundScope(bound)
        const replayModeOpt = yield* Effect.serviceOption(
          ReplayModeConfigTag as unknown as ServiceMap.Key<any, { mode: 'live' | 'record' | 'replay' }>,
        )
        const replayMode = Option.isSome(replayModeOpt) ? replayModeOpt.value.mode : 'live'
        const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog as unknown as ServiceMap.Key<any, ReplayLog.ReplayLogService>)
        const replayLog = Option.isSome(replayLogOpt) ? replayLogOpt.value : undefined
        const force = yield* Effect.service(TaskRunner.forceSourceRefresh).pipe(Effect.orDie)

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
            const idleGen = (gen += 1)
            activeGen.set(rowId, idleGen)

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
              yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
            }
            continue
          }

          const canonicalKey = canonicalizeKey(key)
          if (canonicalKey._tag === 'rejected') {
            trailing.delete(rowId)
            inFlight.delete(rowId)
            const rejectedGen = (gen += 1)
            activeGen.set(rowId, rejectedGen)
            yield* emitSourceKeyRejected({
              moduleId,
              instanceId,
              fieldPath: concretePath,
              resourceId,
              reason: canonicalKey.reason,
              keyPath: canonicalKey.path,
            })
            const idleSnapshot = Snapshot.idle()
            const wroteIdlePath = yield* setSnapshotForRowInTxn(
              rowId,
              idleSnapshot,
              'source-refresh',
              `source:${fieldPath}:${rowId}:rejected-key-idle`,
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
              yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
            }
            continue
          }
          if (canonicalKey._tag === 'idle') {
            continue
          }

          const h = canonicalKey.keyHash

          // keyHash unchanged: avoid redundant refresh while keeping in-flight.
          if (!force && current && current.keyHash === h) {
            continue
          }

          // Not in-flight: if snapshot.keyHash already matches, treat it as already up-to-date (avoid full refresh and row jitter).
          const prevKeyHash =
            prevSnapshot && typeof prevSnapshot === 'object' ? (prevSnapshot as any).keyHash : undefined
          const prevStatus =
            prevSnapshot && typeof prevSnapshot === 'object' ? (prevSnapshot as any).status : undefined
          if (!force && !current && prevKeyHash === h && prevStatus !== 'loading') {
            continue
          }

          if (mode === 'exhaust-trailing' && current) {
            trailing.set(rowId, { key, keyHash: h })
            const trailingGen = (gen += 1)
            activeGen.set(rowId, trailingGen)
            const loadingSnapshot = Snapshot.loading({ keyHash: h, submitImpact: entry.meta?.submitImpact })
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
              yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
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
        readonly fiber: Fiber.Fiber<void, never>
        readonly keyHash: string
      }
    | undefined
  let gen = 0
  let activeGen = 0
  let trailing: { readonly key: unknown; readonly keyHash: string } | undefined

  const concurrency = (entry.meta as any).concurrency as 'switch' | 'exhaust-trailing' | undefined
  const mode = concurrency ?? 'switch'

  const startFetch = (
    key: unknown,
    keyHash: string,
    replayMode: 'live' | 'replay' | 'record',
    replayLog: ReplayLog.ReplayLogService | undefined,
  ): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      const { moduleId, instanceId } = getBoundScope(bound)
      const myGen = (gen += 1)
      activeGen = myGen

      // 1) pending: synchronously write a loading snapshot (within the current transaction window).
      let loadingSnapshot: unknown = Snapshot.loading({ keyHash, submitImpact: entry.meta?.submitImpact })
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
        yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
      }

      // 2) IO: run in a background fiber (avoid blocking the current transaction).
      const io = Effect.gen(function* () {
        if (replayMode === 'replay' && replayLog) {
          // Let loading commit become visible first, then replay the settled phase (preserve the async-resource timeline shape).
          yield* Effect.yieldNow
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
            yield* writeSourceSnapshotIfCurrentKeyHash(
              bound,
              fieldPath,
              keyHash,
              myGen,
              () => activeGen,
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
            yield* writeSourceSnapshotIfCurrentKeyHash(
              bound,
              fieldPath,
              keyHash,
              myGen,
              () => activeGen,
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

        const registryOpt = yield* Effect.serviceOption(FieldSourceRegistryTag)
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
          fieldNodeId: step.debugInfo?.graphNodeId,
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
          kind: 'field-source',
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
          const wroteSuccess = yield* writeSourceSnapshotIfCurrentKeyHash(
            bound,
            fieldPath,
            keyHash,
            myGen,
            () => activeGen,
            successSnapshot,
            'source-refresh',
            `source:${fieldPath}:success`,
            step.debugInfo?.graphNodeId,
            event,
          )
          if (wroteSuccess) {
            yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
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
          const wroteError = yield* writeSourceSnapshotIfCurrentKeyHash(
            bound,
            fieldPath,
            keyHash,
            myGen,
            () => activeGen,
            errorSnapshot,
            'source-refresh',
            `source:${fieldPath}:error`,
            step.debugInfo?.graphNodeId,
            event,
          )
          if (wroteError) {
            yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
          }
        }
      }).pipe(Effect.catchCause(() => Effect.void))

      // Do not wait for IO completion: forkScoped into the runtime scope so unmount will interrupt automatically.
      const fiber = yield* Effect.forkScoped(Effect.provideService(io, TaskRunner.inSyncTransactionFiber, false))
      inFlight = { gen: myGen, fiber, keyHash }

      // After in-flight completes, clean up; in exhaust-trailing mode, run one trailing fetch if present.
      yield* Effect.forkScoped(
        Effect.provideService(Fiber.await(fiber).pipe(
          Effect.flatMap(() => Effect.sync(() => {
            if (inFlight && inFlight.gen === myGen) {
              inFlight = undefined
            }
          })),
          Effect.flatMap(() => mode === 'exhaust-trailing'
            ? Effect.gen(function* () {
                const next = trailing
                trailing = undefined
                if (next) {
                  yield* startFetch(next.key, next.keyHash, replayMode, replayLog)
                }
              })
            : Effect.void),
          Effect.catchCause(() => Effect.void),
        ), TaskRunner.inSyncTransactionFiber, false),
      )
    })

  register(fieldPath, (state: any) =>
    Effect.gen(function* () {
      const { moduleId, instanceId } = getBoundScope(bound)
        const replayModeOpt = yield* Effect.serviceOption(
          ReplayModeConfigTag as unknown as ServiceMap.Key<any, { mode: 'live' | 'record' | 'replay' }>,
        )
      const replayMode = Option.isSome(replayModeOpt) ? replayModeOpt.value.mode : 'live'
        const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog as unknown as ServiceMap.Key<any, ReplayLog.ReplayLogService>)
      const replayLog = Option.isSome(replayLogOpt) ? replayLogOpt.value : undefined
      const force = yield* Effect.service(TaskRunner.forceSourceRefresh).pipe(Effect.orDie)

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
          yield* Fiber.interrupt(inFlight.fiber)
          inFlight = undefined
        }
        trailing = undefined
        gen += 1
        activeGen = gen

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
          yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
        }
        return
      }

      const canonicalKey = canonicalizeKey(key)
      if (canonicalKey._tag === 'rejected') {
        if (inFlight) {
          yield* Fiber.interrupt(inFlight.fiber)
          inFlight = undefined
        }
        trailing = undefined
        gen += 1
        activeGen = gen
        yield* emitSourceKeyRejected({
          moduleId,
          instanceId,
          fieldPath,
          resourceId,
          reason: canonicalKey.reason,
          keyPath: canonicalKey.path,
        })
        const idleSnapshot = Snapshot.idle()
        const wroteIdle = yield* setSnapshotInTxn(
          bound,
          fieldPath,
          idleSnapshot,
          'source-refresh',
          `source:${fieldPath}:rejected-key-idle`,
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
          yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
        }
        return
      }
      if (canonicalKey._tag === 'idle') {
        return
      }

      const h = canonicalKey.keyHash

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
        if (currentStatus && currentStatus !== 'idle' && currentStatus !== 'loading' && currentKeyHash === h) {
          return
        }
      }

      if (mode === 'exhaust-trailing' && inFlight) {
        // Busy: record trailing and update loading immediately; stale in-flight writebacks will be blocked by the keyHash gate.
        trailing = { key, keyHash: h }
        activeGen = gen += 1
        const loadingSnapshot = Snapshot.loading({ keyHash: h, submitImpact: entry.meta?.submitImpact })
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
          yield* recordSourceSnapshotPhase({ bound, replayMode, replayLog, event })
        }
        return
      }

      if (mode === 'switch' && inFlight) {
        yield* Fiber.interrupt(inFlight.fiber)
        inFlight = undefined
        trailing = undefined
      }

      // start fetch (pending tx + fork IO)
      yield* startFetch(key, h, replayMode, replayLog)
    }),
  )

  return Effect.void
}
