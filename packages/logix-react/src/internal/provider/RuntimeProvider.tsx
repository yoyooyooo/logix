import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Cause, Effect, Layer, ManagedRuntime, Scope, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { RuntimeContext, ReactRuntimeContextValue } from './ReactContext.js'
import { DEFAULT_CONFIG_SNAPSHOT, ReactRuntimeConfigSnapshot, type ReactConfigSnapshot } from './config.js'
import { isDevEnv } from './env.js'
import type { FallbackPhase } from './fallback.js'
import { FallbackDurationRecorder, resolveRuntimeProviderFallback } from './fallback.js'
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
  getProgramOwnerId,
  isProgramHandle,
} from './policy.js'
import { useRuntimeHotLifecycleProjectionCleanup } from './runtimeHotLifecycle.js'
import { bindInstalledDevLifecycleCarrier } from './runtimeDevLifecycleBridge.js'

const SYNC_CONFIG_OVER_BUDGET_BY_RUNTIME = new WeakMap<object, true>()
export interface RuntimeProviderProps {
  // The layer for the React integration must have a closed environment (R = never).
  // It should depend only on global env already provided by runtime, avoiding introducing unsatisfied deps inside the component tree.
  // Note: StateTransaction observation policy can only be configured via Logix.Runtime.make / Program.make.
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
  const devLifecycleBinding = useMemo(() => bindInstalledDevLifecycleCarrier(baseRuntime), [baseRuntime])
  useRuntimeHotLifecycleProjectionCleanup(baseRuntime)
  const providerStartedAtRef = React.useRef(performance.now())
  const providerReadyAtRef = React.useRef<number | undefined>(undefined)
  const didReportProviderGatingRef = React.useRef(false)
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
      RuntimeContracts.getRuntimeStore(baseRuntime)
      return true
    } catch {
      return false
    }
  }, [baseRuntime])

  const { binding: tickBinding } = useLayerBinding(
    baseRuntime,
    RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, never>,
    !hasTickServices,
    onErrorRef.current,
  )

  const effectiveLayer = useMemo(() => {
    const devLayer = devLifecycleBinding?.layer
    if (devLayer && layer) {
      return Layer.mergeAll(devLayer, layer) as Layer.Layer<any, any, never>
    }
    return (layer ?? devLayer) as Layer.Layer<any, any, never> | undefined
  }, [devLifecycleBinding?.layer, layer])

  const { binding: layerBinding } = useLayerBinding(baseRuntime, effectiveLayer, Boolean(effectiveLayer), onErrorRef.current)

  const onErrorSink = useMemo<CoreDebug.Sink | null>(() => {
    if (!onError) return null
    const sink: CoreDebug.Sink = {
      record: (event: CoreDebug.Event) => {
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
          }).pipe(Effect.catchCause(() => Effect.void))
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
          ).pipe(Effect.catchCause(() => Effect.void))
        }

        return Effect.void
      },
    }
    return sink
  }, [Boolean(onError)])

  const inheritedDebugSinks = useMemo<ReadonlyArray<CoreDebug.Sink>>(() => {
    if (!onErrorSink) {
      return []
    }
    if (layerBinding) {
      return layerBinding.debugSinks
    }
    try {
      return baseRuntime.runSync(Effect.service(CoreDebug.internal.currentDebugSinks).pipe(Effect.orDie))
    } catch {
      return []
    }
  }, [baseRuntime, layerBinding, onErrorSink])

  // Note: the same Provider subtree must share the same runtime adapter reference.
  // Otherwise ModuleCache (keyed by runtime WeakMap) degrades into "one cache per component",
  // causing `useModule(Program,{ key })` to lose cross-component instance reuse.
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
                ? ([onErrorSink, ...inheritedDebugSinks] as ReadonlyArray<CoreDebug.Sink>)
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
        CoreDebug.record({
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
            CoreDebug.record({
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
        console.debug('[ReactHostAdapter] Failed to load React runtime config snapshot, fallback to default.', error)
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
  const isLayerReady = !effectiveLayer || layerBinding !== null
  const isConfigReady = configState.loaded

  const resolveFallback = (phase: FallbackPhase): React.ReactNode => {
    return resolveRuntimeProviderFallback({ fallback, phase, policyMode: resolvedPolicy.mode })
  }

  const preloadCache = useMemo(
    () => getModuleCache(runtimeWithBindings, configState.snapshot, configState.version),
    [runtimeWithBindings, configState.snapshot, configState.version],
  )

  const syncWarmPreloadReady = useMemo(() => {
    if (resolvedPolicy.mode !== 'defer') return false
    if (!resolvedPolicy.preload) return true
    if (!isLayerReady || !isConfigReady) return false

    const handles = resolvedPolicy.preload.handles
    if (handles.length === 0) return true

    for (const handle of handles) {
      if (isProgramHandle(handle)) {
        const blueprint = RuntimeContracts.getProgramRuntimeBlueprint(handle)
        const ownerId = getProgramOwnerId(handle)
        const key = resolvedPolicy.preload.keysByModuleId.get(ownerId) ?? getPreloadKeyForModuleId(ownerId)
        const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
          Layer.buildWithScope(blueprint.layer, scope).pipe(
            Effect.map((context) => ServiceMap.get(context, blueprint.module) as any),
          )

        const value = preloadCache.warmSync(key, factory, configState.snapshot.gcTime, ownerId, {
          entrypoint: 'react.runtime.preload.sync-warm',
          policyMode: 'defer',
        })
        if (!value) return false
        continue
      }

      const tagId = (handle as any).id ?? 'ModuleTag'
      const key = resolvedPolicy.preload.keysByTagId.get(tagId) ?? getPreloadKeyForTagId(tagId)
      const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
        Scope.provide(scope)(Effect.service(handle as any).pipe(Effect.orDie)) as Effect.Effect<any, unknown, unknown>

      const value = preloadCache.warmSync(key, factory, configState.snapshot.gcTime, tagId, {
        entrypoint: 'react.runtime.preload.sync-warm',
        policyMode: 'defer',
      })
      if (!value) return false
    }

    return true
  }, [resolvedPolicy, isLayerReady, isConfigReady, preloadCache, configState.snapshot.gcTime])

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
    if (syncWarmPreloadReady) {
      setDeferReady(true)
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

    const cache = preloadCache

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

        if (isProgramHandle(handle)) {
          const blueprint = RuntimeContracts.getProgramRuntimeBlueprint(handle)
          const ownerId = getProgramOwnerId(handle)
          const key = resolvedPolicy.preload!.keysByModuleId.get(ownerId) ?? getPreloadKeyForModuleId(ownerId)

          const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
            Layer.buildWithScope(blueprint.layer, scope).pipe(
              Effect.map((context) => ServiceMap.get(context, blueprint.module) as any),
            )

          const op = cache.preload(key, factory, {
            ownerId,
            yield: resolvedPolicy.preload!.yield,
            entrypoint: 'react.runtime.preload',
            policyMode: 'defer',
            optimisticSyncBudgetMs: resolvedPolicy.syncBudgetMs,
          })
          allCancels.add(op.cancel)
          await op.promise

          const durationMs = performance.now() - startedAt
          void runtimeWithBindings
            .runPromise(
              CoreDebug.record({
                type: 'trace:react.module.preload',
                moduleId: blueprint.module.id ?? ownerId,
                data: {
                  mode: 'defer',
                  handleKind: 'Program',
                  key,
                  durationMs: Math.round(durationMs * 100) / 100,
                  concurrency,
                  yieldStrategy: resolvedPolicy.preload!.yield.strategy,
                  yieldOnlyWhenOverBudgetMs: resolvedPolicy.preload!.yield.onlyWhenOverBudgetMs,
                  ownerId,
                },
              }) as unknown as Effect.Effect<void, never, never>,
            )
            .catch(() => {})

          return
        }

        const tagId = (handle as any).id ?? 'ModuleTag'
        const key = resolvedPolicy.preload!.keysByTagId.get(tagId) ?? getPreloadKeyForTagId(tagId)
        const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
          Scope.provide(scope)(Effect.service(handle as any).pipe(Effect.orDie)) as Effect.Effect<any, unknown, unknown>

        const op = cache.preload(key, factory, {
          ownerId: tagId,
          yield: resolvedPolicy.preload!.yield,
          entrypoint: 'react.runtime.preload',
          policyMode: 'defer',
          optimisticSyncBudgetMs: resolvedPolicy.syncBudgetMs,
        })
        allCancels.add(op.cancel)
        await op.promise

        const durationMs = performance.now() - startedAt
        void runtimeWithBindings
          .runPromise(
            CoreDebug.record({
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
              .pipe(Effect.catchCause(() => Effect.void)),
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

  const isReady = isTickServicesReady && isLayerReady && isConfigReady && (resolvedPolicy.mode !== 'defer' || deferReady || syncWarmPreloadReady)
  if (isReady && providerReadyAtRef.current === undefined) {
    providerReadyAtRef.current = performance.now()
  }

  useEffect(() => {
    if (!isReady) {
      return
    }
    if (didReportProviderGatingRef.current) {
      return
    }
    let diagnosticsLevel: CoreDebug.DiagnosticsLevel = 'off'
    try {
      diagnosticsLevel = runtimeWithBindings.runSync(
        Effect.service(CoreDebug.internal.currentDiagnosticsLevel).pipe(Effect.orDie),
      )
    } catch {
      diagnosticsLevel = isDevEnv() ? 'light' : 'off'
    }
    if (diagnosticsLevel === 'off') {
      return
    }
    didReportProviderGatingRef.current = true

    const readyAt = providerReadyAtRef.current ?? performance.now()
    const durationMs = Math.round((readyAt - providerStartedAtRef.current) * 100) / 100
    const effectDelayMs = Math.round((performance.now() - readyAt) * 100) / 100

    void runtimeWithBindings
      .runPromise(
        CoreDebug.record({
          type: 'trace:react.provider.gating',
          data: {
            event: 'ready',
            policyMode: resolvedPolicy.mode,
            durationMs,
            effectDelayMs,
            configLoadMode: configState.loadMode,
            syncOverBudget: Boolean(configState.syncOverBudget),
            syncDurationMs:
              configState.syncDurationMs !== undefined ? Math.round(configState.syncDurationMs * 100) / 100 : undefined,
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})
  }, [configState.loadMode, configState.syncDurationMs, configState.syncOverBudget, isReady, resolvedPolicy.mode, runtimeWithBindings])

  if (!isReady) {
    const blockersList = [
      isTickServicesReady ? null : 'tick',
      isLayerReady ? null : 'layer',
      isConfigReady ? null : 'config',
      resolvedPolicy.mode !== 'defer' || deferReady || syncWarmPreloadReady ? null : 'preload',
    ].filter((x): x is string => x !== null)
    const blockers = blockersList.length > 0 ? blockersList.join('+') : undefined

    return (
      <FallbackDurationRecorder
        runtime={runtimeWithBindings}
        phase="provider.gating"
        policyMode={resolvedPolicy.mode}
        blockers={blockers}
      >
        {resolveFallback('provider.gating')}
      </FallbackDurationRecorder>
    )
  }

  const content =
    resolvedPolicy.mode === 'sync' ? (
      children
    ) : (
      <React.Suspense
        fallback={
          <FallbackDurationRecorder runtime={runtimeWithBindings} phase="react.suspense" policyMode={resolvedPolicy.mode}>
            {resolveFallback('react.suspense')}
          </FallbackDurationRecorder>
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
      '[ReactHostAdapter] Missing runtime for <RuntimeProvider>.\n' +
        '\n' +
        'Fix:\n' +
        '- Provide `runtime` prop: <RuntimeProvider runtime={runtime}>...\n' +
        '- Or nest under an ancestor React host adapter that provides `runtime`.\n',
    )
  }
  return baseRuntime
}
