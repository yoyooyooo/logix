import * as Logix from "@logix/core"
import { Duration, Effect, Fiber } from "effect"
import { QueryClientTag } from "../query-client.js"
import type { QuerySourceConfig, QueryTrigger } from "../traits.js"

const defaultTriggers = ["onMount", "onValueChange"] as const

const getTriggers = (
  triggers: ReadonlyArray<QueryTrigger> | undefined,
): ReadonlyArray<QueryTrigger> => triggers ?? defaultTriggers

const isManualOnly = (triggers: ReadonlyArray<QueryTrigger>): boolean =>
  triggers.length === 1 && triggers[0] === "manual"

const getSnapshotKeyHash = (snapshot: unknown): string | undefined => {
  if (!snapshot || typeof snapshot !== "object") return undefined
  const keyHash = (snapshot as any).keyHash
  return typeof keyHash === "string" ? keyHash : undefined
}

const getSnapshotStatus = (snapshot: unknown): string | undefined => {
  if (!snapshot || typeof snapshot !== "object") return undefined
  const status = (snapshot as any).status
  return typeof status === "string" ? status : undefined
}

export interface AutoTriggerLogicConfig<TParams, TUI> {
  readonly queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI>>>
}

/**
 * Query 自动触发逻辑：
 * - onMount：初始化时尝试触发一次（若 key 有效且当前快照未命中同 keyHash）。
 * - onValueChange：参数/交互态变化后触发（可 debounce；仅当 keyHash 变化或当前为 idle）。
 * - manual 独占：当 triggers=["manual"] 时，不启用 onMount/onValueChange 自动触发。
 */
export const autoTrigger = <Sh extends Logix.AnyModuleShape, TParams, TUI>(
  module: Logix.ModuleInstance<any, Sh>,
  config: AutoTriggerLogicConfig<TParams, TUI>,
): Logix.ModuleLogic<Sh, any, never> =>
  module.logic(($) =>
    Effect.gen(function* () {
      const pending = new Map<string, Fiber.RuntimeFiber<void, any>>()
      const lastKeyHash = new Map<string, string | undefined>()

      const hydrateFromFreshCache = (
        name: string,
        q: QuerySourceConfig<TParams, TUI>,
        keyHash: string,
      ): Effect.Effect<boolean, never, any> =>
        Effect.gen(function* () {
          const queryClientOpt = yield* Effect.serviceOption(QueryClientTag)
          if (queryClientOpt._tag === "None") return false
          const queryClient: any = queryClientOpt.value

          const queryKey = [q.resource.id, keyHash] as const
          const cache = queryClient.getQueryCache?.()
          const query = cache?.find?.({ queryKey })

          if (!query || typeof query !== "object") return false
          if (typeof query.isStale === "function" && query.isStale()) {
            return false
          }

          const state: any = query.state
          if (!state || state.status !== "success") return false

          const data = queryClient.getQueryData?.(queryKey)
          if (data === undefined) return false

          const snapshot = Logix.Resource.Snapshot.success({ keyHash, data })
          yield* ($.state.mutate((draft: any) => {
            draft[name] = snapshot
          }) as Effect.Effect<void, never, any>)

          return true
        })

      const cancelPending = (name: string): Effect.Effect<void, never, any> =>
        Effect.gen(function* () {
          const prev = pending.get(name)
          if (!prev) return
          pending.delete(name)
          yield* Fiber.interruptFork(prev)
        })

      const refresh = (name: string): Effect.Effect<void, never, any> =>
        $.traits.source.refresh(name) as Effect.Effect<void, never, any>

      const scheduleDebounced = (
        name: string,
        ms: number,
      ): Effect.Effect<void, never, any> =>
        Effect.gen(function* () {
          yield* cancelPending(name)
          const fiber = yield* Effect.forkScoped(
            Effect.sleep(Duration.millis(ms)).pipe(
              Effect.zipRight(refresh(name)),
              Effect.ensuring(Effect.sync(() => pending.delete(name))),
              Effect.catchAllCause(() => Effect.void),
            ),
          )
          pending.set(name, fiber)
        })

      const computeKeyHash = (
        state: any,
        q: QuerySourceConfig<TParams, TUI>,
      ): string | undefined => {
        try {
          const key = q.key(state.params as any, state.ui as any)
          if (key === undefined) return undefined
          return Logix.Resource.keyHash(key)
        } catch {
          return undefined
        }
      }

      const maybeAutoRefresh = (
        phase: "mount" | "valueChange",
      ): Effect.Effect<void, never, any> =>
        Effect.gen(function* () {
          const state = (yield* $.state.read) as any

          for (const [name, q] of Object.entries(config.queries)) {
            const triggers = getTriggers(q.triggers)
            if (isManualOnly(triggers)) {
              continue
            }

            if (phase === "mount" && !triggers.includes("onMount")) {
              continue
            }

            if (phase === "valueChange" && !triggers.includes("onValueChange")) {
              continue
            }

            const keyHash = computeKeyHash(state, q)
            const snapshot = state?.[name]
            const snapshotKeyHash = getSnapshotKeyHash(snapshot)
            const snapshotStatus = getSnapshotStatus(snapshot)

            // key 不可用：不触发刷新（idle 回收由 kernel syncIdleInTransaction 保证）。
            if (keyHash === undefined) {
              lastKeyHash.set(name, undefined)
              continue
            }

            // keyHash 未变化且已有非 idle 快照：避免重复进入 loading（复用既有结果）。
            const last = lastKeyHash.get(name)
            if (
              snapshotStatus &&
              snapshotStatus !== "idle" &&
              snapshotKeyHash === keyHash &&
              last === keyHash
            ) {
              continue
            }

            // 若当前快照已是同 keyHash 的 success/error/loading：同步标记 lastKeyHash 并跳过。
            if (
              snapshotStatus &&
              snapshotStatus !== "idle" &&
              snapshotKeyHash === keyHash
            ) {
              lastKeyHash.set(name, keyHash)
              continue
            }

            lastKeyHash.set(name, keyHash)

            // TanStack Query 场景：若能命中 fresh cache，则直接写入 success snapshot，
            // 跳过 source.refresh（避免“缓存命中仍进入 loading → success”的 UI 抖动与额外事务）。
            const hydrated = yield* hydrateFromFreshCache(name, q, keyHash)
            if (hydrated) {
              yield* cancelPending(name)
              continue
            }

            const debounceMs = q.debounceMs ?? 0
            if (phase === "valueChange" && debounceMs > 0) {
              yield* scheduleDebounced(name, debounceMs)
            } else {
              // mount / no debounce：立即触发
              yield* cancelPending(name)
              yield* refresh(name)
            }
          }
        })

      const refreshAll = (): Effect.Effect<void, never, any> =>
        Effect.forEach(Object.keys(config.queries), (name) =>
          cancelPending(name).pipe(Effect.zipRight(refresh(name))),
        ).pipe(Effect.asVoid)

      yield* Effect.all(
        [
          $.lifecycle.onInit(maybeAutoRefresh("mount")),

          // params/ui 变化：交由 Query 的默认逻辑统一触发，不散落到 UI useEffect。
          $.onAction("setParams").runFork(() => maybeAutoRefresh("valueChange")),
          $.onAction("setUi").runFork(() => maybeAutoRefresh("valueChange")),

          // 手动刷新：不受 triggers 限制（manual-only 也允许显式 refresh）。
          $.onAction("refresh").runFork((action: any) =>
            Effect.gen(function* () {
              const target = action.payload as string | undefined
              if (typeof target === "string" && target.length > 0) {
                yield* cancelPending(target)
                yield* refresh(target)
              } else {
                yield* refreshAll()
              }
            }),
          ),
        ],
        { concurrency: "unbounded" },
      )
    }),
  ) as Logix.ModuleLogic<Sh, any, never>
