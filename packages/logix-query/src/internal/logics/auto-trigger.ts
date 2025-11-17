import * as Logix from '@logix/core'
import { Duration, Effect, Fiber } from 'effect'
import type { QuerySourceConfig, QueryTrigger } from '../../Traits.js'
import { Engine } from '../../Engine.js'

const defaultTriggers = ['onMount', 'onValueChange'] as const

const getTriggers = (triggers: ReadonlyArray<QueryTrigger> | undefined): ReadonlyArray<QueryTrigger> =>
  triggers ?? defaultTriggers

const isManualOnly = (triggers: ReadonlyArray<QueryTrigger>): boolean =>
  triggers.length === 1 && triggers[0] === 'manual'

const getSnapshotKeyHash = (snapshot: unknown): string | undefined => {
  if (!snapshot || typeof snapshot !== 'object') return undefined
  const keyHash = (snapshot as any).keyHash
  return typeof keyHash === 'string' ? keyHash : undefined
}

const getSnapshotStatus = (snapshot: unknown): string | undefined => {
  if (!snapshot || typeof snapshot !== 'object') return undefined
  const status = (snapshot as any).status
  return typeof status === 'string' ? status : undefined
}

export interface AutoTriggerLogicConfig<TParams, TUI> {
  readonly queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI>>>
}

/**
 * Query auto-trigger logic:
 * - onMount: triggers once on initialization (if the key is valid and current snapshot does not match the same keyHash).
 * - onValueChange: triggers after params/ui state changes (can debounce; only when keyHash changes or current is idle).
 * - manual-only: when triggers=["manual"], disable onMount/onValueChange auto triggering.
 */
export const autoTrigger = <Sh extends Logix.AnyModuleShape, TParams, TUI>(
  module: Logix.ModuleTagType<any, Sh>,
  config: AutoTriggerLogicConfig<TParams, TUI>,
): Logix.ModuleLogic<Sh, any, never> =>
  module.logic(($) => {
    type QueryName = Extract<keyof typeof config.queries, string>

    const pending = new Map<string, Fiber.RuntimeFiber<void, any>>()
    const lastKeyHash = new Map<string, string | undefined>()

    const hydrateFromFreshCache = (
      name: string,
      q: QuerySourceConfig<TParams, TUI>,
      keyHash: string,
    ): Effect.Effect<boolean, never, any> =>
      Effect.gen(function* () {
        const engineOpt = yield* Effect.serviceOption(Engine)
        if (engineOpt._tag === 'None') return false

        const engine = engineOpt.value
        if (!engine.peekFresh) return false

        const dataOpt = yield* engine.peekFresh({
          resourceId: q.resource.id,
          keyHash,
        })
        if (dataOpt._tag === 'None') return false

        const snapshot = Logix.Resource.Snapshot.success({
          keyHash,
          data: dataOpt.value,
        })
        yield* $.state.mutate((draft: any) => {
          draft.queries[name] = snapshot
        }) as Effect.Effect<void, never, any>

        return true
      })

    const cancelPending = (name: string): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const prev = pending.get(name)
        if (!prev) return
        pending.delete(name)
        yield* Fiber.interruptFork(prev)
      })

    const sourcePathOf = (name: QueryName): string => `queries.${name}`

    const refresh = (name: QueryName, options?: { readonly force?: boolean }): Effect.Effect<void, never, any> =>
      $.traits.source.refresh(sourcePathOf(name) as any, options as any) as Effect.Effect<void, never, any>

    const scheduleDebounced = (name: QueryName, ms: number): Effect.Effect<void, never, any> =>
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

    const computeKeyHash = (state: any, q: QuerySourceConfig<TParams, TUI>): string | undefined => {
      try {
        const key = q.key({ params: state.params as any, ui: state.ui as any } as any)
        if (key === undefined) return undefined
        return Logix.Resource.keyHash(key)
      } catch {
        return undefined
      }
    }

    const maybeAutoRefresh = (
      phase: 'mount' | 'valueChange',
      stateOverride?: unknown,
    ): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const state = (stateOverride ?? (yield* $.state.read)) as any

        for (const [name, q] of Object.entries(config.queries)) {
          const queryName = name as QueryName
          const triggers = getTriggers(q.triggers)
          if (isManualOnly(triggers)) {
            continue
          }

          if (phase === 'mount' && !triggers.includes('onMount')) {
            continue
          }

          if (phase === 'valueChange' && !triggers.includes('onValueChange')) {
            continue
          }

          const keyHash = computeKeyHash(state, q)
          const snapshot = state?.queries?.[queryName]
          const snapshotKeyHash = getSnapshotKeyHash(snapshot)
          const snapshotStatus = getSnapshotStatus(snapshot)

          // Key is unavailable: do not refresh (idle reaping is guaranteed by kernel syncIdleInTransaction).
          if (keyHash === undefined) {
            lastKeyHash.set(queryName, undefined)
            continue
          }

          // keyHash unchanged and we already have a non-idle snapshot: avoid re-entering loading (reuse existing result).
          const last = lastKeyHash.get(queryName)
          if (snapshotStatus && snapshotStatus !== 'idle' && snapshotKeyHash === keyHash && last === keyHash) {
            continue
          }

          // If current snapshot is already success/error/loading with the same keyHash: update lastKeyHash and skip.
          if (snapshotStatus && snapshotStatus !== 'idle' && snapshotKeyHash === keyHash) {
            lastKeyHash.set(queryName, keyHash)
            continue
          }

          lastKeyHash.set(queryName, keyHash)

          // TanStack Query scenario: if we can hit the fresh cache, write a success snapshot directly,
          // skipping source.refresh (avoids UI jitter and extra transactions like "cache hit but still loading -> success").
          const hydrated = yield* hydrateFromFreshCache(queryName, q, keyHash)
          if (hydrated) {
            yield* cancelPending(queryName)
            continue
          }

          const debounceMs = q.debounceMs ?? 0
          if (phase === 'valueChange' && debounceMs > 0) {
            yield* scheduleDebounced(queryName, debounceMs)
          } else {
            // mount / no debounce: trigger immediately
            yield* cancelPending(queryName)
            yield* refresh(queryName)
          }
        }
      })

    const refreshAll = (options?: { readonly force?: boolean }): Effect.Effect<void, never, any> =>
      Effect.forEach(Object.keys(config.queries), (name) =>
        cancelPending(name).pipe(Effect.zipRight(refresh(name as QueryName, options))),
      ).pipe(Effect.asVoid)

    const setup = $.lifecycle.onStart(maybeAutoRefresh('mount'))

    const run = Effect.suspend(() =>
      Effect.all(
        [
          // params/ui changes: handled by Query's default logic, avoiding scattered UI-side useEffect triggers.
          $.onAction('setParams').runFork((action: any) =>
            Effect.gen(function* () {
              const state = (yield* $.state.read) as any
              const next = { ...state, params: action.payload }
              yield* maybeAutoRefresh('valueChange', next)
            }),
          ),
          $.onAction('setUi').runFork((action: any) =>
            Effect.gen(function* () {
              const state = (yield* $.state.read) as any
              const next = { ...state, ui: action.payload }
              yield* maybeAutoRefresh('valueChange', next)
            }),
          ),

          // Manual refresh: not restricted by triggers (manual-only still allows explicit refresh).
          $.onAction('refresh').runFork((action: any) =>
            Effect.gen(function* () {
              const target = action.payload as QueryName | undefined
              if (typeof target === 'string' && target.length > 0) {
                yield* cancelPending(target)
                yield* refresh(target, { force: true })
              } else {
                yield* refreshAll({ force: true })
              }
            }),
          ),
        ],
        { concurrency: 'unbounded' },
      ).pipe(Effect.asVoid),
    )

    return { setup, run }
  }) as Logix.ModuleLogic<Sh, any, never>
