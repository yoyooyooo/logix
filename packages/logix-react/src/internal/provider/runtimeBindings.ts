import { useEffect, useRef, useState } from 'react'
import { Layer, ManagedRuntime, Exit, Context, Effect, Cause, Runtime, FiberRef, LogLevel, Scope } from 'effect'
import * as Logix from '@logix/core'
import type * as HashSet from 'effect/HashSet'
import type * as Logger from 'effect/Logger'
import { isDevEnv } from './env.js'
import type { RuntimeProviderProps } from './RuntimeProvider.js'

// Logger set type aligned with FiberRef.currentLoggers
type LoggerSet = HashSet.HashSet<Logger.Logger<unknown, any>>

const toErrorString = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error)

const debugScopeCloseFailure = (error: unknown): void => {
  if (!isDevEnv()) return
  // eslint-disable-next-line no-console
  console.debug('[RuntimeProvider] Scope.close failed', toErrorString(error))
}

interface LayerBinding {
  readonly context: Context.Context<any>
  readonly scope: Scope.CloseableScope
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly layer: Layer.Layer<any, any, never>
  readonly enabled: boolean
  readonly loggers: LoggerSet
  readonly logLevel: LogLevel.LogLevel
  readonly debugSinks: ReadonlyArray<Logix.Debug.Sink>
}

export const useLayerBinding = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  layer: Layer.Layer<any, any, never> | undefined,
  enabled: boolean,
  onError?: RuntimeProviderProps['onError'],
): { binding: LayerBinding | null; isLoading: boolean } => {
  const activeBindingRef = useRef<LayerBinding | null>(null)
  const [state, setState] = useState<{
    binding: LayerBinding | null
    isLoading: boolean
    runtime: ManagedRuntime.ManagedRuntime<any, any> | null
    layer: Layer.Layer<any, any, never> | undefined
    enabled: boolean
  }>(() => ({
    binding: null,
    isLoading: enabled && !!layer,
    runtime,
    layer,
    enabled,
  }))

  useEffect(() => {
    // Layer disabled or not provided: clear existing binding and reset state.
    if (!enabled || !layer) {
      const current = activeBindingRef.current
      if (current) {
        activeBindingRef.current = null
        void runtime.runPromise(Scope.close(current.scope, Exit.void)).catch(debugScopeCloseFailure)
      }
      setState((prev) => {
        // In the default path without a layer, avoid a meaningless setState that would cause an extra first render.
        if (prev.binding === null && prev.isLoading === false && prev.layer === undefined && prev.enabled === enabled) {
          return prev
        }

        return {
          binding: null,
          isLoading: false,
          runtime: prev.runtime,
          layer: undefined,
          enabled,
        }
      })
      return
    }

    const current = activeBindingRef.current

    // If a binding exists and deps haven't changed, reuse it to avoid rebuilding.
    if (current && current.runtime === runtime && current.layer === layer && current.enabled === enabled) {
      setState({
        binding: current,
        isLoading: false,
        runtime,
        layer,
        enabled,
      })
      return
    }

    const previousBinding = current ?? state.binding

    if (isDevEnv() && previousBinding && previousBinding.layer !== layer && enabled && layer) {
      // eslint-disable-next-line no-console
      console.warn(
        '[RuntimeProvider] Rebuilding layer due to a new layer reference. Memoize the Layer in the caller to avoid repeated rebuilds and resource churn.',
        )
    }

    // When deps change, close the old scope and rebuild.
    if (current) {
      activeBindingRef.current = null
      void runtime.runPromise(Scope.close(current.scope, Exit.void)).catch(debugScopeCloseFailure)
    }

    let cancelled = false
    // Mark as loading and snapshot current deps; must clear old binding.
    setState({
      binding: null,
      isLoading: true,
      runtime,
      layer,
      enabled,
    })

    // Create an independent Scope for this RuntimeProvider layer:
    // - Does not depend on Runtime Env.
    // - Uses the global default Runtime to create Scope, avoiding triggering AsyncFiberException via ManagedRuntime.runSync
    //   when Runtime.layer contains async Layers (e.g. Debug.layer/traceLayer).
    const newScope = Effect.runSync(Scope.make()) as Scope.CloseableScope
    const buildEffect = Effect.gen(function* () {
      const context = (yield* Layer.buildWithScope(layer, newScope)) as Context.Context<any>
      const applyEnv = <A, E>(effect: Effect.Effect<A, E, any>) =>
        Effect.mapInputContext(
          Scope.extend(effect, newScope) as Effect.Effect<A, E, any>,
          (parent: Context.Context<any>) => Context.merge(parent, context),
        )

      const loggers: LoggerSet = yield* applyEnv(FiberRef.get(FiberRef.currentLoggers))
      const logLevel: LogLevel.LogLevel = yield* applyEnv(FiberRef.get(FiberRef.currentLogLevel))
      const debugSinks: ReadonlyArray<Logix.Debug.Sink> = yield* applyEnv(
        FiberRef.get(Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>),
      )
      return { context, loggers, logLevel, debugSinks }
    })

    const assignBinding = (result: {
      context: Context.Context<any>
      loggers: LoggerSet
      logLevel: LogLevel.LogLevel
      debugSinks: ReadonlyArray<Logix.Debug.Sink>
    }) => {
      if (cancelled) {
        return runtime.runPromise(Scope.close(newScope, Exit.void)).catch(debugScopeCloseFailure)
      }

      const previous = activeBindingRef.current
      const newBinding: LayerBinding = {
        context: result.context,
        loggers: result.loggers,
        logLevel: result.logLevel,
        debugSinks: result.debugSinks,
        scope: newScope,
        runtime,
        layer,
        enabled,
      }
      activeBindingRef.current = newBinding

      setState({
        binding: newBinding,
        isLoading: false,
        runtime,
        layer,
        enabled,
      })

      if (previous) {
        return runtime.runPromise(Scope.close(previous.scope, Exit.void)).catch(debugScopeCloseFailure)
      }
      return Promise.resolve()
    }

    let builtSync = false
    try {
      const result = runtime.runSync(buildEffect)
      builtSync = true
      void assignBinding(result)
    } catch {
      // Fall back to async if sync build fails, avoiding direct blocking.
    }

    if (!builtSync) {
      void runtime
        .runPromise(buildEffect)
        .then(assignBinding)
        .catch((error) => {
          if (onError) {
            const cause = Cause.die(error)
            runtime.runFork(
              onError(cause, { source: 'provider', phase: 'provider.layer.build' }).pipe(
                Effect.catchAllCause(() => Effect.void),
              ),
            )
          }
          // Close the new scope and clear binding on build failure.
          void runtime.runPromise(Scope.close(newScope, Exit.void)).catch(debugScopeCloseFailure)
          if (!cancelled) {
            // eslint-disable-next-line no-console
            console.error('[RuntimeProvider] Failed to build layer', error)
            setState({
              binding: null,
              isLoading: false,
              runtime,
              layer,
              enabled,
            })
          }
        })
    }

    return () => {
      cancelled = true
      const current2 = activeBindingRef.current
      if (current2) {
        activeBindingRef.current = null
        void runtime.runPromise(Scope.close(current2.scope, Exit.void)).catch(debugScopeCloseFailure)
        return
      }
      // Clean up the pre-created scope when binding never succeeded.
      void runtime.runPromise(Scope.close(newScope, Exit.void)).catch(debugScopeCloseFailure)
    }
  }, [runtime, layer, enabled, onError])

  // Only expose binding when it still matches current props; otherwise treat as not ready to avoid exposing handles backed by closed Scope.
  const isCurrentBinding =
    state.binding !== null &&
    state.runtime === runtime &&
    state.layer === layer &&
    state.enabled === enabled &&
    enabled &&
    !!layer

  return {
    binding: isCurrentBinding ? state.binding : null,
    isLoading: isCurrentBinding ? state.isLoading : enabled && !!layer,
  }
}

export const createRuntimeAdapter = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  contexts: ReadonlyArray<Context.Context<any>>,
  scopes: ReadonlyArray<Scope.Scope>,
  loggerSets: ReadonlyArray<LoggerSet>,
  logLevels: ReadonlyArray<LogLevel.LogLevel>,
  debugSinks: ReadonlyArray<ReadonlyArray<Logix.Debug.Sink>>,
): ManagedRuntime.ManagedRuntime<any, any> => {
  if (
    contexts.length === 0 &&
    scopes.length === 0 &&
    loggerSets.length === 0 &&
    logLevels.length === 0 &&
    debugSinks.length === 0
  ) {
    return runtime
  }

  const applyContexts = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    // First inherit Provider scopes via scope.extend (preserving FiberRef/Logger changes),
    // then merge Context via mapInputContext (inner overrides outer).
    contexts.reduceRight(
      (acc, ctx) =>
        Effect.mapInputContext(
          acc as Effect.Effect<A, E, any>,
          (parent: Context.Context<any>) => Context.merge(parent, ctx) as Context.Context<any>,
        ),
      scopes.reduceRight(
        (acc, scope) => Scope.extend(acc as Effect.Effect<A, E, any>, scope),
        effect as Effect.Effect<A, E, any>,
      ) as Effect.Effect<A, E, any>,
    ) as Effect.Effect<A, E, R>

  const applyLoggers = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
    const last = loggerSets.length > 0 ? loggerSets[loggerSets.length - 1] : null
    const logLevel = logLevels.length > 0 ? logLevels[logLevels.length - 1] : null
    const sinks = debugSinks.length > 0 ? debugSinks[debugSinks.length - 1] : null

    let result: Effect.Effect<A, E, any> = effect as Effect.Effect<A, E, any>
    if (last) {
      result = Effect.locally(FiberRef.currentLoggers, last)(result)
    }
    if (logLevel) {
      result = Effect.locally(FiberRef.currentLogLevel, logLevel)(result)
    }
    // Only override DebugSink set when sinks is non-empty.
    // For Providers that only inject Env/Theme and don't care about Debug (sinks.length === 0),
    // keep the outer Runtime/Provider's DebugSink unchanged to avoid accidentally disabling Devtools observability.
    if (sinks && sinks.length > 0) {
      result = Effect.locally(
        Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>,
        sinks,
      )(result)
    }
    return result as Effect.Effect<A, E, R>
  }

  const adapted: ManagedRuntime.ManagedRuntime<any, any> = {
    ...runtime,
    runFork: <A, E>(effect: Effect.Effect<A, E, any>, options?: Parameters<typeof runtime.runFork>[1]) =>
      runtime.runFork(applyLoggers(applyContexts(effect)), options),
    runPromise: <A, E>(effect: Effect.Effect<A, E, any>, options?: Parameters<typeof runtime.runPromise>[1]) =>
      runtime.runPromise(applyLoggers(applyContexts(effect)), options),
    runPromiseExit: <A, E>(effect: Effect.Effect<A, E, any>, options?: Parameters<typeof runtime.runPromiseExit>[1]) =>
      runtime.runPromiseExit(applyLoggers(applyContexts(effect)), options),
    runSync: <A, E>(effect: Effect.Effect<A, E, any>) => runtime.runSync(applyLoggers(applyContexts(effect))),
    runSyncExit: <A, E>(effect: Effect.Effect<A, E, any>) => runtime.runSyncExit(applyLoggers(applyContexts(effect))),
    runCallback: <A, E>(effect: Effect.Effect<A, E, any>, options?: Runtime.RunCallbackOptions<A, any>) =>
      runtime.runCallback(applyLoggers(applyContexts(effect)), options),
  }

  return adapted
}
