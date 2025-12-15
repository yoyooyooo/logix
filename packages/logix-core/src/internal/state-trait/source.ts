import { Effect, Fiber, Option } from "effect"
import { create } from "mutative"
import * as EffectOp from "../../effectop.js"
import { Snapshot, internal as ResourceInternal, keyHash as hashKey } from "../../Resource.js"
import * as EffectOpCore from "../runtime/EffectOpCore.js"
import * as Debug from "../runtime/core/DebugSink.js"
import { isDevEnv, ReplayModeConfigTag } from "../runtime/core/env.js"
import * as ReplayLog from "../runtime/core/ReplayLog.js"
import type { PatchReason, StatePatch } from "../runtime/core/StateTransaction.js"
import type { BoundApi } from "../runtime/core/module.js"
import * as DepsTrace from "./deps-trace.js"
import * as RowId from "./rowid.js"
import type {
  StateTraitEntry,
  StateTraitPlanStep,
  StateTraitProgram,
} from "./model.js"

export interface SourceSyncContext<S> {
  readonly moduleId?: string
  readonly runtimeId?: string
  readonly getDraft: () => S
  readonly setDraft: (next: S) => void
  readonly recordPatch: (patch: StatePatch) => void
}

const makePatch = (
  path: string,
  from: unknown,
  to: unknown,
  reason: PatchReason,
  stepId: string,
): StatePatch => ({
  path,
  from,
  to,
  reason,
  stepId,
})

const depsTraceSettled = new Set<string>()
const depsMismatchEmitted = new Set<string>()

const formatList = (items: ReadonlyArray<string>, limit = 10): string => {
  if (items.length === 0) return ""
  if (items.length <= limit) return items.join(", ")
  return `${items.slice(0, limit).join(", ")}, …(+${items.length - limit})`
}

const emitDepsMismatch = (
  params: {
    readonly moduleId?: string
    readonly runtimeId?: string
    readonly kind: "computed" | "source"
    readonly fieldPath: string
    readonly diff: DepsTrace.DepsDiff
  },
): Effect.Effect<void, never, any> => {
  const key = `${params.runtimeId ?? "unknown"}::${params.kind}::${params.fieldPath}`
  if (depsMismatchEmitted.has(key)) return Effect.void
  depsMismatchEmitted.add(key)

  return Debug.record({
    type: "diagnostic",
    moduleId: params.moduleId,
    runtimeId: params.runtimeId,
    code: "state_trait::deps_mismatch",
    severity: "warning",
    message:
      `[deps] ${params.kind} "${params.fieldPath}" declared=[${formatList(params.diff.declared)}] ` +
      `reads=[${formatList(params.diff.reads)}] missing=[${formatList(params.diff.missing)}] ` +
      `unused=[${formatList(params.diff.unused)}]`,
    hint:
      "deps 是唯一依赖事实源：后续增量调度/反向闭包/性能优化都只认 deps。请将 deps 与实际读取保持一致；" +
      "若确实依赖整棵对象，可声明更粗粒度的 deps（例如 \"profile\"）以覆盖子字段读取。",
    kind: `deps_mismatch:${params.kind}`,
  })
}

const getMiddlewareStack = (): Effect.Effect<
  EffectOp.MiddlewareStack,
  never,
  any
> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) =>
      Option.isSome(maybe) ? maybe.value.stack : [],
    ),
  )

const recordTraitPatch = (
  bound: BoundApi<any, any>,
  patch: {
    readonly path: string
    readonly from?: unknown
    readonly to?: unknown
    readonly reason: PatchReason
    readonly traitNodeId?: string
    readonly stepId?: string
  },
): void => {
  const record =
    (bound as any).__recordStatePatch as
      | ((p: typeof patch) => void)
      | undefined
  if (record) {
    record(patch)
  }
}

const recordReplayEvent = (
  bound: BoundApi<any, any>,
  event: ReplayLog.ReplayLogEvent,
): void => {
  const record =
    (bound as any).__recordReplayEvent as
      | ((e: ReplayLog.ReplayLogEvent) => void)
      | undefined
  if (record) {
    record(event)
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
    yield* (bound.state.mutate((draft: any) => {
      const prev = RowId.getAtPath(draft, fieldPath)
      if (Object.is(prev, next)) return
      wrote = true
      RowId.setAtPathMutating(draft, fieldPath, next)
      recordTraitPatch(bound, {
        path: fieldPath,
        from: prev,
        to: next,
        reason,
        stepId,
        traitNodeId,
      })
    }) as Effect.Effect<void, never, any>)
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
    yield* (bound.state.mutate((draft: any) => {
      const current = RowId.getAtPath(draft, fieldPath)
      const currentKeyHash =
        current && typeof current === "object" ? (current as any).keyHash : undefined
      if (currentKeyHash !== keyHash) return

      const prev = current
      if (Object.is(prev, next)) return

      wrote = true
      RowId.setAtPathMutating(draft, fieldPath, next)
      if (replayEvent) {
        recordReplayEvent(bound, replayEvent)
      }
      recordTraitPatch(bound, {
        path: fieldPath,
        from: prev,
        to: next,
        reason,
        stepId,
        traitNodeId,
      })
    }) as Effect.Effect<void, never, any>)
    return wrote
  })

/**
 * syncIdleInTransaction：
 * - 在事务窗口内同步评估所有 source.key(state)；
 * - 若 key 变为空（undefined），则同步将对应字段重置为 idle snapshot（避免 tearing）。
 */
export const syncIdleInTransaction = <S extends object>(
  program: StateTraitProgram<S>,
  ctx: SourceSyncContext<S>,
): Effect.Effect<void, never, any> =>
  Effect.sync(() => {
    const draft = ctx.getDraft() as any
    const updates: Array<{ readonly fieldPath: string; readonly prev: unknown }> = []

    for (const entry of program.entries) {
      if (entry.kind !== "source") continue
      const fieldPath = entry.fieldPath
      const listItem = RowId.parseListItemFieldPath(fieldPath)

      if (listItem) {
        // list.item scope：按 index 逐行评估 key，并对未激活行同步写回 idle。
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

          const concretePath = RowId.toListItemValuePath(
            listItem.listPath,
            index,
            listItem.itemPath,
          )
          const prev = RowId.getAtPath(draft, concretePath)
          const prevStatus =
            prev && typeof prev === "object" ? (prev as any).status : undefined
          if (prevStatus === "idle") {
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
      const prevStatus =
        prev && typeof prev === "object" ? (prev as any).status : undefined
      if (prevStatus === "idle") {
        // 仍需确保 data/error 被清空
        const data = (prev as any)?.data
        const error = (prev as any)?.error
        if (data === undefined && error === undefined) {
          continue
        }
      }

      updates.push({ fieldPath, prev })
    }

    if (updates.length === 0) return

    const reason: PatchReason = "source:idle"

    const nextDraft = create(draft, (next: any) => {
      for (const u of updates) {
        RowId.setAtPathMutating(next, u.fieldPath, Snapshot.idle())
      }
    })

    ctx.setDraft(nextDraft as S)

    for (const u of updates) {
      ctx.recordPatch(
        makePatch(
          u.fieldPath,
          u.prev,
          Snapshot.idle(),
          reason,
          `source:${u.fieldPath}:idle`,
        ),
      )
    }
  })

/**
 * installSourceRefresh：
 * - 为单个 source 字段注册刷新实现（ResourceSnapshot + keyHash gate + concurrency）。
 */
export const installSourceRefresh = <S>(
  bound: BoundApi<any, any>,
  step: StateTraitPlanStep,
  entry: Extract<StateTraitEntry<S, string>, { readonly kind: "source" }>,
): Effect.Effect<void, never, any> => {
  if (!step.targetFieldPath) return Effect.void

  const fieldPath = step.targetFieldPath
  const resourceId = step.resourceId ?? entry.meta.resource
  const listItem = RowId.parseListItemFieldPath(fieldPath)

  const register = (bound as any)
    .__registerSourceRefresh as
    | ((
        field: string,
        handler: (state: any) => Effect.Effect<void, never, any>,
      ) => void)
    | undefined

  if (!register) {
    return Effect.void
  }

  const recordSnapshot = (
    replayMode: "live" | "replay",
    replayLog: ReplayLog.ReplayLogService | undefined,
    input:
      | ReplayLog.ReplayLogEvent
      | {
          readonly moduleId?: string
          readonly runtimeId?: string
          readonly fieldPath: string
          readonly keyHash?: string
          readonly phase: ReplayLog.ResourceSnapshotPhase
          readonly snapshot: unknown
        },
  ): Effect.Effect<void, never, any> => {
    if (!replayLog) return Effect.void
    if (replayMode !== "live") return Effect.void
    const event: ReplayLog.ReplayLogEvent =
      input && typeof input === "object" && (input as any)._tag === "ResourceSnapshot"
        ? (input as ReplayLog.ReplayLogEvent)
        : {
            _tag: "ResourceSnapshot",
            resourceId,
            fieldPath: (input as any).fieldPath,
            keyHash: (input as any).keyHash,
            phase: (input as any).phase,
            snapshot: (input as any).snapshot,
            timestamp: Date.now(),
            moduleId: (input as any).moduleId,
            runtimeId: (input as any).runtimeId,
          }
    return replayLog.record(event)
  }

  // list.item scope：按 RowID 做 in-flight 门控（避免 insert/remove/reorder 下写错行）。
  if (listItem) {
    const store = (bound as any).__rowIdStore as RowId.RowIdStore | undefined
    if (!store) {
      return Effect.void
    }

    const listPath = listItem.listPath
    const itemPath = listItem.itemPath
    if (!itemPath) {
      // 禁止把 snapshot 写回到整个 item（会覆盖业务 values）。
      return Effect.void
    }

    const concurrency = (entry.meta as any).concurrency as
      | "switch"
      | "exhaust-trailing"
      | undefined
    const mode = concurrency ?? "switch"

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

    // row 被移除：清理 trailing/inFlight 引用，避免后续错误归属或内存泄漏。
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
        yield* (bound.state.mutate((draft: any) => {
          const index = store.getIndex(listPath, rowId)
          if (index === undefined) return
          const concretePath = RowId.toListItemValuePath(listPath, index, itemPath)
          const prev = RowId.getAtPath(draft, concretePath)
          if (Object.is(prev, next)) return
          wrotePath = concretePath
          RowId.setAtPathMutating(draft, concretePath, next)
          recordTraitPatch(bound, {
            path: concretePath,
            from: prev,
            to: next,
            reason,
            stepId,
            traitNodeId: step.debugInfo?.graphNodeId,
          })
        }) as Effect.Effect<void, never, any>)
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
        yield* (bound.state.mutate((draft: any) => {
          const index = store.getIndex(listPath, rowId)
          if (index === undefined) return
          const concretePath = RowId.toListItemValuePath(listPath, index, itemPath)

          const current = RowId.getAtPath(draft, concretePath)
          const currentKeyHash =
            current && typeof current === "object" ? (current as any).keyHash : undefined
          if (currentKeyHash !== keyHash) return

          const prev = current
          if (Object.is(prev, next)) return

          wrotePath = concretePath
          RowId.setAtPathMutating(draft, concretePath, next)
          if (phase) {
            recordReplayEvent(bound, {
              _tag: "ResourceSnapshot",
              resourceId,
              fieldPath: concretePath,
              keyHash,
              phase,
              snapshot: next,
              timestamp: Date.now(),
              moduleId: (bound as any).__moduleId as string | undefined,
              runtimeId: (bound as any).__runtimeId as string | undefined,
            })
          }
          recordTraitPatch(bound, {
            path: concretePath,
            from: prev,
            to: next,
            reason,
            stepId,
            traitNodeId: step.debugInfo?.graphNodeId,
          })
        }) as Effect.Effect<void, never, any>)
        return wrotePath
      })

    const startFetch = (
      rowId: RowId.RowId,
      key: unknown,
      keyHash: string,
      replayMode: "live" | "replay",
      replayLog: ReplayLog.ReplayLogService | undefined,
    ): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const moduleId = (bound as any).__moduleId as string | undefined
        const runtimeId = (bound as any).__runtimeId as string | undefined

        const indexForLog = store.getIndex(listPath, rowId)
        const logFieldPath =
          indexForLog === undefined
            ? undefined
            : RowId.toListItemValuePath(listPath, indexForLog, itemPath)

        let loadingSnapshot: unknown = Snapshot.loading({ keyHash })
        if (replayMode === "replay" && replayLog && logFieldPath) {
          const replayLoading = yield* replayLog.consumeNextResourceSnapshot({
            resourceId,
            fieldPath: logFieldPath,
            keyHash,
            phase: "loading",
          })
          if (replayLoading) {
            loadingSnapshot = replayLoading.snapshot
          }
        }
        const wroteLoadingPath = yield* setSnapshotForRowInTxn(
          rowId,
          loadingSnapshot,
          "source:loading",
          `source:${fieldPath}:${rowId}:loading`,
        )
        if (wroteLoadingPath) {
          const event: ReplayLog.ReplayLogEvent = {
            _tag: "ResourceSnapshot",
            resourceId,
            fieldPath: wroteLoadingPath,
            keyHash,
            phase: "loading",
            snapshot: loadingSnapshot,
            timestamp: Date.now(),
            moduleId,
            runtimeId,
          }
          recordReplayEvent(bound, event)
          yield* recordSnapshot(replayMode, replayLog, event)
        }

        const io = Effect.gen(function* () {
          if (replayMode === "replay" && replayLog) {
            // 让 loading 提交先可见，再重赛终态（保持“异步资源”的时间线结构）。
            yield* Effect.yieldNow()
            const consumePath = wroteLoadingPath ?? logFieldPath
            if (!consumePath) return yield* Effect.void

            const replayed = yield* replayLog.consumeNextResourceSnapshot({
              resourceId,
              fieldPath: consumePath,
              keyHash,
            })
            if (!replayed) return yield* Effect.void

            if (replayed.phase === "success") {
              yield* writebackIfCurrentKeyHashForRow(
                rowId,
                keyHash,
                replayed.snapshot,
                "source:success",
                `source:${fieldPath}:${rowId}:success`,
                "success",
              )
            } else if (replayed.phase === "error") {
              yield* writebackIfCurrentKeyHashForRow(
                rowId,
                keyHash,
                replayed.snapshot,
                "source:error",
                `source:${fieldPath}:${rowId}:error`,
                "error",
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

          const op = EffectOp.make<any, any, any>({
            kind: "service",
            name: resourceId,
            effect: loadEffect,
            meta: {
              moduleId,
              runtimeId,
              fieldPath,
              resourceId,
              key,
              keyHash,
              rowId,
              traitNodeId: step.debugInfo?.graphNodeId,
              stepId: step.id,
            },
          })

          const exit = yield* Effect.exit(EffectOp.run(op, stack))

          if (exit._tag === "Success") {
            const successSnapshot = Snapshot.success({ keyHash, data: exit.value })
            const wroteSuccessPath = yield* writebackIfCurrentKeyHashForRow(
              rowId,
              keyHash,
              successSnapshot,
              "source:success",
              `source:${fieldPath}:${rowId}:success`,
              "success",
            )
            if (wroteSuccessPath) {
              yield* recordSnapshot(replayMode, replayLog, {
                _tag: "ResourceSnapshot",
                resourceId,
                fieldPath: wroteSuccessPath,
                keyHash,
                phase: "success",
                snapshot: successSnapshot,
                timestamp: Date.now(),
                moduleId,
                runtimeId,
              })
            }
          } else {
            const errorSnapshot = Snapshot.error({ keyHash, error: exit.cause })
            const wroteErrorPath = yield* writebackIfCurrentKeyHashForRow(
              rowId,
              keyHash,
              errorSnapshot,
              "source:error",
              `source:${fieldPath}:${rowId}:error`,
              "error",
            )
            if (wroteErrorPath) {
              yield* recordSnapshot(replayMode, replayLog, {
                _tag: "ResourceSnapshot",
                resourceId,
                fieldPath: wroteErrorPath,
                keyHash,
                phase: "error",
                snapshot: errorSnapshot,
                timestamp: Date.now(),
                moduleId,
                runtimeId,
              })
            }
          }
        }).pipe(Effect.catchAllCause(() => Effect.void))

        const fiber = yield* Effect.forkScoped(io)
        const myGen = (gen += 1)
        inFlight.set(rowId, { gen: myGen, fiber, keyHash })

        yield* Effect.forkScoped(
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
              mode === "exhaust-trailing" && trailing.has(rowId)
                ? Effect.gen(function* () {
                    const next = trailing.get(rowId)
                    trailing.delete(rowId)
                    if (next) {
                      yield* startFetch(
                        rowId,
                        next.key,
                        next.keyHash,
                        replayMode,
                        replayLog,
                      )
                    }
                  })
                : Effect.void,
            ),
            Effect.catchAllCause(() => Effect.void),
          ),
        )
      })

    register(fieldPath, (state: any) =>
      Effect.gen(function* () {
        const moduleId = (bound as any).__moduleId as string | undefined
        const runtimeId = (bound as any).__runtimeId as string | undefined
        const replayModeOpt = yield* Effect.serviceOption(ReplayModeConfigTag)
        const replayMode = Option.isSome(replayModeOpt) ? replayModeOpt.value.mode : "live"
        const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog)
        const replayLog = Option.isSome(replayLogOpt) ? replayLogOpt.value : undefined

        const listValue = RowId.getAtPath(state, listPath)
        const items: ReadonlyArray<unknown> = Array.isArray(listValue) ? listValue : []
        const ids = store.ensureList(listPath, items)

        // dev-mode：对首行做一次 deps trace（只做诊断，不影响执行语义）。
        const traceKey = `${runtimeId ?? "unknown"}::source::${fieldPath}`
        if (isDevEnv() && !depsTraceSettled.has(traceKey)) {
          depsTraceSettled.add(traceKey)
          try {
            const sample = items[0]
            if (sample !== undefined) {
              const traced = DepsTrace.trace((s) => (entry.meta as any).key(s), sample as any)
              const prefixedReads = traced.reads.map((r) =>
                r ? `${listPath}[].${r}` : `${listPath}[]`,
              )
              const diff = DepsTrace.diffDeps(
                ((entry.meta as any).deps ?? []) as ReadonlyArray<string>,
                prefixedReads,
              )
              if (diff) {
                yield* emitDepsMismatch({
                  moduleId,
                  runtimeId,
                  kind: "source",
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

            // 若已是 clean idle，则无需重复写回（避免无意义 patch 导致 UI 抖动）。
            if (
              prevSnapshot &&
              typeof prevSnapshot === "object" &&
              prevSnapshot.status === "idle" &&
              prevSnapshot.data === undefined &&
              prevSnapshot.error === undefined
            ) {
              continue
            }

            const idleSnapshot = Snapshot.idle()
            const wroteIdlePath = yield* setSnapshotForRowInTxn(
              rowId,
              idleSnapshot,
              "source:idle",
              `source:${fieldPath}:${rowId}:idle`,
            )
            if (wroteIdlePath) {
              const event: ReplayLog.ReplayLogEvent = {
                _tag: "ResourceSnapshot",
                resourceId,
                fieldPath: wroteIdlePath,
                keyHash: undefined,
                phase: "idle",
                snapshot: idleSnapshot,
                timestamp: Date.now(),
                moduleId,
                runtimeId,
              }
              recordReplayEvent(bound, event)
              yield* recordSnapshot(replayMode, replayLog, event)
            }
            continue
          }

          const h = hashKey(key)

          // keyHash 未变化：避免无意义重复刷新（同时保住 in-flight）。
          if (current && current.keyHash === h) {
            continue
          }

          // 非 in-flight：若当前 snapshot.keyHash 已匹配，则视为已是最新数据（避免全量 refresh 造成所有行抖动）。
          const prevKeyHash =
            prevSnapshot && typeof prevSnapshot === "object"
              ? (prevSnapshot as any).keyHash
              : undefined
          if (!current && prevKeyHash === h) {
            continue
          }

          if (mode === "exhaust-trailing" && current) {
            trailing.set(rowId, { key, keyHash: h })
            const loadingSnapshot = Snapshot.loading({ keyHash: h })
            const wroteLoadingPath = yield* setSnapshotForRowInTxn(
              rowId,
              loadingSnapshot,
              "source:loading",
              `source:${fieldPath}:${rowId}:loading`,
            )
            if (wroteLoadingPath) {
              const event: ReplayLog.ReplayLogEvent = {
                _tag: "ResourceSnapshot",
                resourceId,
                fieldPath: wroteLoadingPath,
                keyHash: h,
                phase: "loading",
                snapshot: loadingSnapshot,
                timestamp: Date.now(),
                moduleId,
                runtimeId,
              }
              recordReplayEvent(bound, event)
              yield* recordSnapshot(replayMode, replayLog, event)
            }
            continue
          }

          if (mode === "switch" && current) {
            // 不依赖取消正确性：旧结果写回会被 keyHash gate 丢弃。
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

  const concurrency = (entry.meta as any).concurrency as
    | "switch"
    | "exhaust-trailing"
    | undefined
  const mode = concurrency ?? "switch"

  const startFetch = (
    key: unknown,
    keyHash: string,
    replayMode: "live" | "replay",
    replayLog: ReplayLog.ReplayLogService | undefined,
  ): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      const moduleId = (bound as any).__moduleId as string | undefined
      const runtimeId = (bound as any).__runtimeId as string | undefined

      // 1) pending：同步写入 loading snapshot（落在当前事务窗口）。
      let loadingSnapshot: unknown = Snapshot.loading({ keyHash })
      if (replayMode === "replay" && replayLog) {
        const replayLoading = yield* replayLog.consumeNextResourceSnapshot({
          resourceId,
          fieldPath,
          keyHash,
          phase: "loading",
        })
        if (replayLoading) {
          loadingSnapshot = replayLoading.snapshot
        }
      }
      const wroteLoading = yield* setSnapshotInTxn(
        bound,
        fieldPath,
        loadingSnapshot,
        "source:loading",
        `source:${fieldPath}:loading`,
        step.debugInfo?.graphNodeId,
      )
      if (wroteLoading) {
        const event: ReplayLog.ReplayLogEvent = {
          _tag: "ResourceSnapshot",
          resourceId,
          fieldPath,
          keyHash,
          phase: "loading",
          snapshot: loadingSnapshot,
          timestamp: Date.now(),
          moduleId,
          runtimeId,
        }
        recordReplayEvent(bound, event)
        yield* recordSnapshot(replayMode, replayLog, event)
      }

      // 2) IO：在后台 fiber 中运行（避免阻塞当前事务）。
      const io = Effect.gen(function* () {
        if (replayMode === "replay" && replayLog) {
          // 让 loading 提交先可见，再重赛终态（保持“异步资源”的时间线结构）。
          yield* Effect.yieldNow()
          const replayed = yield* replayLog.consumeNextResourceSnapshot({
            resourceId,
            fieldPath,
            keyHash,
          })
          if (!replayed) return yield* Effect.void

          if (replayed.phase === "success") {
            const event: ReplayLog.ReplayLogEvent = {
              _tag: "ResourceSnapshot",
              resourceId,
              fieldPath,
              keyHash,
              phase: "success",
              snapshot: replayed.snapshot,
              timestamp: Date.now(),
              moduleId,
              runtimeId,
            }
            yield* writebackIfCurrentKeyHash(
              bound,
              fieldPath,
              keyHash,
              replayed.snapshot,
              "source:success",
              `source:${fieldPath}:success`,
              step.debugInfo?.graphNodeId,
              event,
            )
          } else if (replayed.phase === "error") {
            const event: ReplayLog.ReplayLogEvent = {
              _tag: "ResourceSnapshot",
              resourceId,
              fieldPath,
              keyHash,
              phase: "error",
              snapshot: replayed.snapshot,
              timestamp: Date.now(),
              moduleId,
              runtimeId,
            }
            yield* writebackIfCurrentKeyHash(
              bound,
              fieldPath,
              keyHash,
              replayed.snapshot,
              "source:error",
              `source:${fieldPath}:error`,
              step.debugInfo?.graphNodeId,
              event,
            )
          }

          return yield* Effect.void
        }

        const stack = yield* getMiddlewareStack()

        const registryOpt = yield* Effect.serviceOption(
          ResourceInternal.ResourceRegistryTag,
        )
        const registry = Option.isSome(registryOpt) ? registryOpt.value : undefined
        const spec = registry?.specs.get(resourceId)

        if (!spec) {
          return yield* Effect.void
        }

        const loadEffect = (spec.load as any)(key) as Effect.Effect<any, any, any>

        const op = EffectOp.make<any, any, any>({
          kind: "service",
          name: resourceId,
          effect: loadEffect,
          meta: {
            moduleId,
            runtimeId,
            fieldPath,
            resourceId,
            key,
            keyHash,
            traitNodeId: step.debugInfo?.graphNodeId,
            stepId: step.id,
          },
        })

        const exit = yield* Effect.exit(EffectOp.run(op, stack))

        // 3) writeback：以 keyHash gate 防止旧结果回写到新 key 上。
        if (exit._tag === "Success") {
          const successSnapshot = Snapshot.success({ keyHash, data: exit.value })
          const event: ReplayLog.ReplayLogEvent = {
            _tag: "ResourceSnapshot",
            resourceId,
            fieldPath,
            keyHash,
            phase: "success",
            snapshot: successSnapshot,
            timestamp: Date.now(),
            moduleId,
            runtimeId,
          }
          const wroteSuccess = yield* writebackIfCurrentKeyHash(
            bound,
            fieldPath,
            keyHash,
            successSnapshot,
            "source:success",
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
            _tag: "ResourceSnapshot",
            resourceId,
            fieldPath,
            keyHash,
            phase: "error",
            snapshot: errorSnapshot,
            timestamp: Date.now(),
            moduleId,
            runtimeId,
          }
          const wroteError = yield* writebackIfCurrentKeyHash(
            bound,
            fieldPath,
            keyHash,
            errorSnapshot,
            "source:error",
            `source:${fieldPath}:error`,
            step.debugInfo?.graphNodeId,
            event,
          )
          if (wroteError) {
            yield* recordSnapshot(replayMode, replayLog, event)
          }
        }
      }).pipe(
        Effect.catchAllCause(() => Effect.void),
      )

      // 不等待 IO 完成：forkScoped 挂到 runtime scope，保证卸载时自动 interrupt。
      const fiber = yield* Effect.forkScoped(io)
      const myGen = (gen += 1)
      inFlight = { gen: myGen, fiber, keyHash }

      // in-flight 结束后清理，并在 exhaust-trailing 模式下补跑一次 trailing。
      yield* Effect.forkScoped(
        Fiber.await(fiber).pipe(
          Effect.zipRight(
            Effect.sync(() => {
              if (inFlight && inFlight.gen === myGen) {
                inFlight = undefined
              }
            }),
          ),
          Effect.zipRight(
            mode === "exhaust-trailing" && trailing
              ? Effect.gen(function* () {
                  const next = trailing
                  trailing = undefined
                  if (next) {
                    yield* startFetch(
                      next.key,
                      next.keyHash,
                      replayMode,
                      replayLog,
                    )
                  }
                })
              : Effect.void,
          ),
          Effect.catchAllCause(() => Effect.void),
        ),
      )
    })

  register(fieldPath, (state: any) =>
    Effect.gen(function* () {
      const moduleId = (bound as any).__moduleId as string | undefined
      const runtimeId = (bound as any).__runtimeId as string | undefined
      const replayModeOpt = yield* Effect.serviceOption(ReplayModeConfigTag)
      const replayMode = Option.isSome(replayModeOpt) ? replayModeOpt.value.mode : "live"
      const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog)
      const replayLog = Option.isSome(replayLogOpt) ? replayLogOpt.value : undefined

      let key: unknown
      try {
        key = (entry.meta as any).key(state)
      } catch {
        key = undefined
      }

      // dev-mode：侦测 keySelector 的实际读取路径与声明 deps 的差异（仅做诊断，不影响执行语义）。
      const traceKey = `${runtimeId ?? "unknown"}::source::${fieldPath}`
      if (isDevEnv() && !depsTraceSettled.has(traceKey)) {
        depsTraceSettled.add(traceKey)
        try {
          const traced = DepsTrace.trace((s) => (entry.meta as any).key(s), state)
          const diff = DepsTrace.diffDeps(
            ((entry.meta as any).deps ?? []) as ReadonlyArray<string>,
            traced.reads,
          )
          if (diff) {
            yield* emitDepsMismatch({
              moduleId,
              runtimeId,
              kind: "source",
              fieldPath,
              diff,
            })
          }
        } catch {
          // tracing failure should never break refresh flow
        }
      }

      // key 变空：同步 idle 清空（并中断 in-flight）。
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
          "source:idle",
          `source:${fieldPath}:idle`,
          step.debugInfo?.graphNodeId,
        )
        if (wroteIdle) {
          const event: ReplayLog.ReplayLogEvent = {
            _tag: "ResourceSnapshot",
            resourceId,
            fieldPath,
            keyHash: undefined,
            phase: "idle",
            snapshot: idleSnapshot,
            timestamp: Date.now(),
            moduleId,
            runtimeId,
          }
          recordReplayEvent(bound, event)
          yield* recordSnapshot(replayMode, replayLog, event)
        }
        return
      }

      const h = hashKey(key)

      if (mode === "exhaust-trailing" && inFlight) {
        // 忙碌时：记录 trailing，并立即更新到最新 loading（旧 in-flight 写回会被 keyHash gate 拦住）。
        trailing = { key, keyHash: h }
        const loadingSnapshot = Snapshot.loading({ keyHash: h })
        const wroteLoading = yield* setSnapshotInTxn(
          bound,
          fieldPath,
          loadingSnapshot,
          "source:loading",
          `source:${fieldPath}:loading`,
          step.debugInfo?.graphNodeId,
        )
        if (wroteLoading) {
          const event: ReplayLog.ReplayLogEvent = {
            _tag: "ResourceSnapshot",
            resourceId,
            fieldPath,
            keyHash: h,
            phase: "loading",
            snapshot: loadingSnapshot,
            timestamp: Date.now(),
            moduleId,
            runtimeId,
          }
          recordReplayEvent(bound, event)
          yield* recordSnapshot(replayMode, replayLog, event)
        }
        return
      }

      if (mode === "switch" && inFlight) {
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
