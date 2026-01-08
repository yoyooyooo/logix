import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Layer, ManagedRuntime, Effect, Cause, FiberRef, Context, Scope } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeContext, ReactRuntimeContextValue } from './ReactContext.js'
import { DEFAULT_CONFIG_SNAPSHOT, ReactRuntimeConfigSnapshot, type ReactConfigSnapshot } from './config.js'
import { isDevEnv } from './env.js'
import type { FallbackPhase } from './fallback.js'
import { FallbackProbe, resolveRuntimeProviderFallback } from './fallback.js'
import { createRuntimeAdapter, useLayerBinding } from './runtimeBindings.js'
import { getModuleCache, type ModuleCacheFactory } from '../store/ModuleCache.js'
import {
  resolveRuntimeProviderPolicy,
  type ModuleHandle,
  type RuntimeProviderPolicy,
  type RuntimeProviderPolicyMode,
  DEFAULT_PRELOAD_CONCURRENCY,
  getPreloadKeyForModuleId,
  getPreloadKeyForTagId,
} from './policy.js'

const SYNC_CONFIG_OVER_BUDGET_BY_RUNTIME = new WeakMap<object, true>()

export interface RuntimeProviderProps {
  // The layer for the React integration must have a closed environment (R = never).
  // It should depend only on global env already provided by runtime, avoiding introducing unsatisfied deps inside the component tree.
  // Note: StateTransaction observation policy can only be configured via Logix.Runtime.make / Module.implement.
  // RuntimeProvider does not expose any stateTransaction-related props to avoid introducing a second transaction mode at the React layer.
  readonly layer?: Layer.Layer<any, any, never>
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
  readonly policy?: RuntimeProviderPolicy
  readonly onError?: (cause: Cause.Cause<unknown>, context: RuntimeProviderErrorContext) => Effect.Effect<void>
}

export type RuntimeProviderErrorContext =
  | {
      readonly source: 'provider'
      readonly phase: 'provider.layer.build'
    }
  | {
      readonly source: 'provider'
      readonly phase: 'debug.lifecycle_error'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
    }
  | {
      readonly source: 'provider'
      readonly phase: 'debug.diagnostic_error'
      readonly code: string
      readonly message: string
      readonly hint?: string
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
    }

export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({
  layer,
  runtime,
  children,
  fallback,
  policy,
  onError,
}) => {
  const parent = useContext(RuntimeContext)
  const baseRuntime = useRuntimeResolution(runtime, parent)
  const resolvedPolicy = useMemo(
    () =>
      resolveRuntimeProviderPolicy({
        policy,
        parentPolicy: parent?.policy ?? null,
      }),
    [policy, parent?.policy],
  )

  const onErrorRef = React.useRef(onError)
  onErrorRef.current = onError

  const hasTickServices = useMemo(() => {
    try {
      Logix.InternalContracts.getRuntimeStore(baseRuntime)
      return true
    } catch {
      return false
    }
  }, [baseRuntime])

  const { binding: tickBinding } = useLayerBinding(
    baseRuntime,
    Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, never>,
    !hasTickServices,
    onErrorRef.current,
  )

  const { binding: layerBinding } = useLayerBinding(baseRuntime, layer, Boolean(layer), onErrorRef.current)

  const onErrorSink = useMemo<Logix.Debug.Sink | null>(() => {
    if (!onError) return null
    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) => {
        const handler = onErrorRef.current
        if (!handler) {
          return Effect.void
        }

        if (event.type === 'lifecycle:error') {
          return handler(event.cause as Cause.Cause<unknown>, {
            source: 'provider',
            phase: 'debug.lifecycle_error',
            moduleId: event.moduleId,
            instanceId: event.instanceId,
            runtimeLabel: event.runtimeLabel,
          }).pipe(Effect.catchAllCause(() => Effect.void))
        }

        if (event.type === 'diagnostic' && event.severity === 'error') {
          return handler(
            Cause.fail({
              code: event.code,
              message: event.message,
              hint: event.hint,
            }),
            {
              source: 'provider',
              phase: 'debug.diagnostic_error',
              code: event.code,
              message: event.message,
              hint: event.hint,
              moduleId: event.moduleId,
              instanceId: event.instanceId,
              runtimeLabel: event.runtimeLabel,
            },
          ).pipe(Effect.catchAllCause(() => Effect.void))
        }

        return Effect.void
      },
    }
    return sink
  }, [Boolean(onError)])

  const inheritedDebugSinks = useMemo<ReadonlyArray<Logix.Debug.Sink>>(() => {
    if (!onErrorSink) {
      return []
    }
    if (layerBinding) {
      return layerBinding.debugSinks
    }
    try {
      return baseRuntime.runSync(
        FiberRef.get(Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>),
      )
    } catch {
      return []
    }
  }, [baseRuntime, layerBinding, onErrorSink])

  // Note: the same Provider subtree must share the same runtime adapter reference.
  // Otherwise ModuleCache (keyed by runtime WeakMap) degrades into "one cache per component",
  // causing `useModule(Impl,{ key })` to lose cross-component instance reuse.
  const runtimeWithBindings = useMemo(
    () =>
      tickBinding || layerBinding || onErrorSink
        ? createRuntimeAdapter(
            baseRuntime,
            [...(tickBinding ? [tickBinding.context] : []), ...(layerBinding ? [layerBinding.context] : [])],
            [...(tickBinding ? [tickBinding.scope] : []), ...(layerBinding ? [layerBinding.scope] : [])],
            layerBinding ? [layerBinding.loggers] : tickBinding ? [tickBinding.loggers] : [],
            layerBinding ? [layerBinding.logLevel] : tickBinding ? [tickBinding.logLevel] : [],
            [
              onErrorSink
                ? ([onErrorSink, ...inheritedDebugSinks] as ReadonlyArray<Logix.Debug.Sink>)
                : layerBinding
                  ? layerBinding.debugSinks
                  : [],
            ],
          )
        : baseRuntime,
    [baseRuntime, inheritedDebugSinks, layerBinding, onErrorSink, tickBinding],
  )

  const didReportSyncConfigSnapshotRef = React.useRef(false)

  const [configState, setConfigState] = useState<{
    snapshot: ReactConfigSnapshot
    version: number
    loaded: boolean
    loadMode: 'none' | 'sync' | 'async'
    syncDurationMs?: number
    syncOverBudget?: boolean
  }>(() => {
    const budgetMs = resolvedPolicy.syncBudgetMs
    if (budgetMs <= 0) {
      // Explicitly disable sync attempt: fall back to async (no render-phase sync work).
      return { snapshot: DEFAULT_CONFIG_SNAPSHOT, version: 1, loaded: false, loadMode: 'none' }
    }

    if (SYNC_CONFIG_OVER_BUDGET_BY_RUNTIME.has(baseRuntime as unknown as object)) {
      // overBudget observed: avoid repeated render-phase blocking during subsequent remount/HMR.
      return { snapshot: DEFAULT_CONFIG_SNAPSHOT, version: 1, loaded: false, loadMode: 'none' }
    }

    const startedAt = performance.now()
    try {
      const snapshot = runtimeWithBindings.runSync(
        ReactRuntimeConfigSnapshot.load as Effect.Effect<ReactConfigSnapshot, any, any>,
      )
      const durationMs = performance.now() - startedAt
      const overBudget = durationMs > budgetMs
      if (overBudget) {
        SYNC_CONFIG_OVER_BUDGET_BY_RUNTIME.set(baseRuntime as unknown as object, true)
      }

      // overBudget: fall back to async gating to avoid stacking more sync work in the same commit.
      return {
        snapshot,
        version: 1,
        loaded: !overBudget,
        loadMode: 'sync',
        syncDurationMs: durationMs,
        syncOverBudget: overBudget,
      }
    } catch {
      return { snapshot: DEFAULT_CONFIG_SNAPSHOT, version: 1, loaded: false, loadMode: 'none' }
    }
  })

  useEffect(() => {
    if (configState.loadMode !== 'sync') {
      return
    }
    if (didReportSyncConfigSnapshotRef.current) {
      return
    }
    didReportSyncConfigSnapshotRef.current = true

    void runtimeWithBindings
      .runPromise(
        Logix.Debug.record({
          type: 'trace:react.runtime.config.snapshot',
          data: {
            source: configState.snapshot.source,
            mode: 'sync',
            durationMs:
              configState.syncDurationMs !== undefined ? Math.round(configState.syncDurationMs * 100) / 100 : undefined,
            syncBudgetMs: resolvedPolicy.syncBudgetMs,
            overBudget: Boolean(configState.syncOverBudget),
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})
  }, [configState, resolvedPolicy.syncBudgetMs, runtimeWithBindings])

  useEffect(() => {
    let cancelled = false

    runtimeWithBindings
      .runPromise(ReactRuntimeConfigSnapshot.load as Effect.Effect<ReactConfigSnapshot, any, any>)
      .then((snapshot: ReactConfigSnapshot) => {
        if (cancelled) return
        setConfigState((prev) => {
          const sameSnapshot =
            prev.snapshot.gcTime === snapshot.gcTime &&
            prev.snapshot.initTimeoutMs === snapshot.initTimeoutMs &&
            prev.snapshot.lowPriorityDelayMs === snapshot.lowPriorityDelayMs &&
            prev.snapshot.lowPriorityMaxDelayMs === snapshot.lowPriorityMaxDelayMs &&
            prev.snapshot.source === snapshot.source

          if (sameSnapshot && prev.loaded) {
            return prev
          }

          const cacheCriticalChanged = prev.snapshot.gcTime !== snapshot.gcTime

          return {
            snapshot,
            version: cacheCriticalChanged ? prev.version + 1 : prev.version,
            loaded: true,
            loadMode: 'async',
          }
        })

        void runtimeWithBindings
          .runPromise(
            Logix.Debug.record({
              type: 'trace:react.runtime.config.snapshot',
              data: {
                source: snapshot.source,
                mode: 'async',
              },
            }) as unknown as Effect.Effect<void, never, never>,
          )
          .catch(() => {})
      })
      .catch((error) => {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.debug('[RuntimeProvider] Failed to load React runtime config snapshot, fallback to default.', error)
        setConfigState((prev) => ({
          snapshot: DEFAULT_CONFIG_SNAPSHOT,
          version: prev.version,
          loaded: true,
          loadMode: 'async',
        }))
      })

    return () => {
      cancelled = true
    }
  }, [runtimeWithBindings])

  const contextValue = useMemo<ReactRuntimeContextValue>(
    () => ({
      runtime: runtimeWithBindings,
      reactConfigSnapshot: configState.snapshot,
      configVersion: configState.version,
      policy: resolvedPolicy,
    }),
    [runtimeWithBindings, configState, resolvedPolicy],
  )

  const isTickServicesReady = hasTickServices || tickBinding !== null
  const isLayerReady = !layer || layerBinding !== null
  const isConfigReady = configState.loaded

  const resolveFallback = (phase: FallbackPhase): React.ReactNode => {
    return resolveRuntimeProviderFallback({ fallback, phase, policyMode: resolvedPolicy.mode })
  }

  const [deferReady, setDeferReady] = useState(false)
  useEffect(() => {
    if (resolvedPolicy.mode !== 'defer') {
      setDeferReady(false)
      return
    }
    setDeferReady(false)
  }, [resolvedPolicy.mode])

  const preloadCancelsRef = React.useRef<Set<() => void> | null>(null)

  useEffect(() => {
    if (resolvedPolicy.mode !== 'defer') {
      return
    }
    setDeferReady(false)
    if (!resolvedPolicy.preload) {
      setDeferReady(true)
      return
    }
    if (!isLayerReady || !isConfigReady) {
      return
    }

    let cancelled = false

    const cache = getModuleCache(runtimeWithBindings, configState.snapshot, configState.version)

    const preloadHandles = resolvedPolicy.preload.handles
    if (preloadHandles.length === 0) {
      setDeferReady(true)
      return
    }

    const concurrency = Math.max(1, resolvedPolicy.preload.concurrency ?? DEFAULT_PRELOAD_CONCURRENCY)
    const allCancels = new Set<() => void>()
    preloadCancelsRef.current = allCancels

    const run = async () => {
      const queue = preloadHandles.slice()

      const runOne = async (handle: ModuleHandle) => {
        if (cancelled) return

        const startedAt = performance.now()

        if ((handle as any)?._tag === 'ModuleImpl') {
          const moduleId = (handle as any).module?.id ?? 'ModuleImpl'
          const key = resolvedPolicy.preload!.keysByModuleId.get(moduleId) ?? getPreloadKeyForModuleId(moduleId)

          const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
            Layer.buildWithScope((handle as any).layer, scope).pipe(
              Effect.map((context) => Context.get(context, (handle as any).module) as any),
            )

          const op = cache.preload(key, factory, {
            ownerId: moduleId,
            yield: resolvedPolicy.preload!.yield,
            entrypoint: 'react.runtime.preload',
            policyMode: 'defer',
          })
          allCancels.add(op.cancel)
          await op.promise

          const durationMs = performance.now() - startedAt
          void runtimeWithBindings
            .runPromise(
              Logix.Debug.record({
                type: 'trace:react.module.preload',
                moduleId,
                data: {
                  mode: 'defer',
                  handleKind: 'ModuleImpl',
                  key,
                  durationMs: Math.round(durationMs * 100) / 100,
                  concurrency,
                  yieldStrategy: resolvedPolicy.preload!.yield.strategy,
                  yieldOnlyWhenOverBudgetMs: resolvedPolicy.preload!.yield.onlyWhenOverBudgetMs,
                },
              }) as unknown as Effect.Effect<void, never, never>,
            )
            .catch(() => {})

          return
        }

        const tagId = (handle as any).id ?? 'ModuleTag'
        const key = resolvedPolicy.preload!.keysByTagId.get(tagId) ?? getPreloadKeyForTagId(tagId)
        const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
          (handle as unknown as Effect.Effect<{ readonly instanceId?: string }, unknown, unknown>).pipe(
            Scope.extend(scope),
          )

        const op = cache.preload(key, factory, {
          ownerId: tagId,
          yield: resolvedPolicy.preload!.yield,
          entrypoint: 'react.runtime.preload',
          policyMode: 'defer',
        })
        allCancels.add(op.cancel)
        await op.promise

        const durationMs = performance.now() - startedAt
        void runtimeWithBindings
          .runPromise(
            Logix.Debug.record({
              type: 'trace:react.module.preload',
              data: {
                mode: 'defer',
                handleKind: 'ModuleTag',
                tokenId: tagId,
                key,
                durationMs: Math.round(durationMs * 100) / 100,
                concurrency,
                yieldStrategy: resolvedPolicy.preload!.yield.strategy,
                yieldOnlyWhenOverBudgetMs: resolvedPolicy.preload!.yield.onlyWhenOverBudgetMs,
              },
            }) as unknown as Effect.Effect<void, never, never>,
          )
          .catch(() => {})
      }

      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (!cancelled) {
          const next = queue.shift()
          if (!next) return
          await runOne(next)
        }
      })

      await Promise.all(workers)
    }

    run()
      .then(() => {
        if (cancelled) return
        setDeferReady(true)
      })
      .catch((error) => {
        if (cancelled) return
        if (onErrorRef.current) {
          runtimeWithBindings.runFork(
            onErrorRef
              .current(Cause.die(error), { source: 'provider', phase: 'provider.layer.build' })
              .pipe(Effect.catchAllCause(() => Effect.void)),
          )
        }
        setDeferReady(true)
      })

    return () => {
      cancelled = true
      preloadCancelsRef.current = null
      for (const cancel of allCancels) cancel()
    }
  }, [resolvedPolicy, isLayerReady, isConfigReady, runtimeWithBindings, configState, onErrorRef])

  // defer+preload: release preload holders after the subtree's first commit, avoiding permanently pinning preloaded handles.
  useEffect(() => {
    if (resolvedPolicy.mode !== 'defer' || !deferReady) {
      return
    }

    const cancels = preloadCancelsRef.current
    if (!cancels || cancels.size === 0) {
      return
    }
    preloadCancelsRef.current = null

    const list = Array.from(cancels)
    let released = false
    const release = () => {
      if (released) return
      released = true
      for (const cancel of list) cancel()
    }

    const timeout = setTimeout(release, 0)
    return () => {
      clearTimeout(timeout)
      release()
    }
  }, [resolvedPolicy.mode, deferReady])

  const isReady = isTickServicesReady && isLayerReady && isConfigReady && (resolvedPolicy.mode !== 'defer' || deferReady)

  if (!isReady) {
    const blockersList = [
      isTickServicesReady ? null : 'tick',
      isLayerReady ? null : 'layer',
      isConfigReady ? null : 'config',
      resolvedPolicy.mode !== 'defer' || deferReady ? null : 'preload',
    ].filter((x): x is string => x !== null)
    const blockers = blockersList.length > 0 ? blockersList.join('+') : undefined

    return (
      <FallbackProbe
        runtime={runtimeWithBindings}
        phase="provider.gating"
        policyMode={resolvedPolicy.mode}
        blockers={blockers}
      >
        {resolveFallback('provider.gating')}
      </FallbackProbe>
    )
  }

  const content =
    resolvedPolicy.mode === 'sync' ? (
      children
    ) : (
      <React.Suspense
        fallback={
          <FallbackProbe runtime={runtimeWithBindings} phase="react.suspense" policyMode={resolvedPolicy.mode}>
            {resolveFallback('react.suspense')}
          </FallbackProbe>
        }
      >
        {children}
      </React.Suspense>
    )

  return React.createElement(RuntimeContext.Provider, { value: contextValue }, content)
}

const useRuntimeResolution = (
  runtimeProp: ManagedRuntime.ManagedRuntime<any, any> | undefined,
  parent: ReactRuntimeContextValue | null,
) => {
  const baseRuntime = runtimeProp ?? parent?.runtime
  if (!baseRuntime) {
    throw new Error(
      '[RuntimeProvider] Missing runtime.\n' +
        '\n' +
        'Fix:\n' +
        '- Provide `runtime` prop: <RuntimeProvider runtime={runtime}>...\n' +
        '- Or nest under an ancestor RuntimeProvider that provides `runtime`.\n',
    )
  }
  return baseRuntime
}
