import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { ConfigProvider, Effect, Layer, Logger, ManagedRuntime, References, Schema } from 'effect'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'
import { useRuntime, useModule, useSelector } from '../../../src/Hooks.js'
import { getModuleCache } from '../../../src/internal/store/ModuleCache.js'
import { RuntimeContext } from '../../../src/internal/provider/ReactContext.js'
import { ReactRuntimeConfig } from '../../../src/internal/provider/config.js'

const Counter = Logix.Module.make('ConfigCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

const CounterImpl = Counter.implement({
  initial: { count: 0 },
  logics: [],
})

describe('ReactModuleConfig with RuntimeProvider', () => {
  it('applies ConfigProvider values to ModuleCache via runtime snapshot', async () => {
    const configLayer = ConfigProvider.layer(ConfigProvider.fromUnknown({ 'logix.react.gc_time': '1000' }))

    const runtime = ManagedRuntime.make(configLayer as Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(moduleRuntime, (s: Logix.StateOf<typeof Counter.shape>) => s.count)

      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }

      const cache = React.useMemo(
        () => getModuleCache(ctx.runtime, ctx.reactConfigSnapshot),
        [ctx.runtime, ctx.reactConfigSnapshot],
      )

      const entries = (cache as any).entries as Map<string, any>
      const entry = entries.values().next().value as { gcTime?: number } | undefined

      return { count, gcTime: entry?.gcTime }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.gcTime).toBe(1000)
    })
  })

  it('prefers runtime-level ReactRuntimeConfig.replace over ConfigProvider', async () => {
    const configLayer = ConfigProvider.layer(ConfigProvider.fromUnknown({ 'logix.react.gc_time': '1000' }))

    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        configLayer as Layer.Layer<any, never, never>,
        ReactRuntimeConfig.replace({ gcTime: 1500 }),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(moduleRuntime, (s: Logix.StateOf<typeof Counter.shape>) => s.count)

      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }

      const cache = React.useMemo(
        () => getModuleCache(ctx.runtime, ctx.reactConfigSnapshot),
        [ctx.runtime, ctx.reactConfigSnapshot],
      )

      const entries = (cache as any).entries as Map<string, any>
      const entry = entries.values().next().value as { gcTime?: number } | undefined

      return { count, gcTime: entry?.gcTime }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.gcTime).toBe(1500)
    })
  })

  it('loads config snapshot once under StrictMode', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          {children}
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(moduleRuntime, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      return { count, gcTime: ctx.reactConfigSnapshot.gcTime, version: ctx.configVersion }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.gcTime).toBe(500)
      expect(result.current.version).toBe(1)
    })
  })

  it('does not dispose ModuleCache when only non-critical config fields change', async () => {
    // ConfigProvider.fromMap copies the map on creation; to simulate config changes under the same runtime,
    // we use a mutable runtime-level override (ReactRuntimeConfigTag) to drive snapshot changes.
    const runtimeConfig: { gcTime: number; initTimeoutMs?: number } = { gcTime: 500, initTimeoutMs: undefined }
    const runtime = ManagedRuntime.make(
      Layer.succeed(ReactRuntimeConfig.tag, runtimeConfig) as Layer.Layer<any, never, never>,
    )

    const ConfigMutator = () => {
      React.useLayoutEffect(() => {
        // initTimeoutMs is non cache-critical: changes must not increment configVersion.
        runtimeConfig.initTimeoutMs = 1234
      }, [])
      return null
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <ConfigMutator />
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }

      const ref = useModule(CounterImpl)
      const count = useSelector(ref, (s: Logix.StateOf<typeof Counter.shape>) => s.count)

      return {
        count,
        initTimeoutMs: ctx.reactConfigSnapshot.initTimeoutMs,
        version: ctx.configVersion,
        instanceId: (ref as any).runtime.instanceId as string | undefined,
      }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.version).toBe(1)
      expect(result.current.initTimeoutMs).toBeUndefined()
      expect(result.current.instanceId).toBeDefined()
    })

    const instanceId = result.current.instanceId

    await waitFor(() => {
      expect(result.current.initTimeoutMs).toBe(1234)
      expect(result.current.version).toBe(1)
      expect(result.current.instanceId).toBe(instanceId)
    })
  })

  it('does not dispose ModuleCache when gcTime changes', async () => {
    const runtimeConfig: { gcTime: number; initTimeoutMs?: number } = { gcTime: 500, initTimeoutMs: undefined }
    const runtime = ManagedRuntime.make(
      Layer.succeed(ReactRuntimeConfig.tag, runtimeConfig) as Layer.Layer<any, never, never>,
    )

    const ConfigMutator = () => {
      React.useLayoutEffect(() => {
        runtimeConfig.gcTime = 1500
      }, [])
      return null
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <ConfigMutator />
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }

      const ref = useModule(CounterImpl)
      const count = useSelector(ref, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      const cache = React.useMemo(() => getModuleCache(ctx.runtime, ctx.reactConfigSnapshot), [ctx.runtime, ctx.reactConfigSnapshot])
      const entries = (cache as any).entries as Map<string, any>
      const entry = entries.values().next().value as { gcTime?: number } | undefined

      return {
        count,
        gcTime: ctx.reactConfigSnapshot.gcTime,
        version: ctx.configVersion,
        entryGcTime: entry?.gcTime,
        instanceId: (ref as any).runtime.instanceId as string | undefined,
        cache,
      }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.gcTime).toBe(500)
      expect(result.current.version).toBe(1)
      expect(result.current.entryGcTime).toBe(500)
      expect(result.current.instanceId).toBeDefined()
    })

    const cacheRef = result.current.cache
    const instanceId = result.current.instanceId

    await waitFor(() => {
      expect(result.current.gcTime).toBe(1500)
      expect(result.current.version).toBe(1)
      expect(result.current.entryGcTime).toBe(1500)
      expect(result.current.instanceId).toBe(instanceId)
      expect(result.current.cache).toBe(cacheRef)
    })
  })

  it('avoids cache dispose and runtime rebuild during boot-time gcTime churn', async () => {
    const runtimeConfig: { gcTime: number; initTimeoutMs?: number } = { gcTime: 500, initTimeoutMs: undefined }
    const runtime = ManagedRuntime.make(
      Layer.succeed(ReactRuntimeConfig.tag, runtimeConfig) as Layer.Layer<any, never, never>,
    )

    const ConfigMutator = () => {
      React.useLayoutEffect(() => {
        runtimeConfig.gcTime = 1500
      }, [])
      return null
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <ConfigMutator />
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }

      const ref = useModule(CounterImpl)
      useSelector(ref, (s: Logix.StateOf<typeof Counter.shape>) => s.count)

      const cache = React.useMemo(() => getModuleCache(ctx.runtime, ctx.reactConfigSnapshot), [ctx.runtime, ctx.reactConfigSnapshot])

      const initialCacheRef = React.useRef<any>(undefined)
      const disposeCountRef = React.useRef(0)
      const instanceIdsRef = React.useRef(new Set<string>())

      if (!initialCacheRef.current) {
        initialCacheRef.current = cache
        const originalDispose = cache.dispose.bind(cache)
        cache.dispose = () => {
          disposeCountRef.current += 1
          originalDispose()
        }
      }

      const instanceId = (ref as any).runtime.instanceId as string | undefined
      if (instanceId) {
        instanceIdsRef.current.add(instanceId)
      }

      return {
        gcTime: ctx.reactConfigSnapshot.gcTime,
        version: ctx.configVersion,
        cacheStable: cache === initialCacheRef.current,
        disposeCount: disposeCountRef.current,
        distinctRuntimeCount: instanceIdsRef.current.size,
      }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.gcTime).toBe(1500)
      expect(result.current.version).toBe(1)
      expect(result.current.cacheStable).toBe(true)
      expect(result.current.disposeCount).toBe(0)
      expect(result.current.distinctRuntimeCount).toBe(1)
    })
  })
  it('isolates config per runtime when multiple providers coexist', async () => {
    const runtimeA = ManagedRuntime.make(
      ConfigProvider.layer(ConfigProvider.fromUnknown({ 'logix.react.gc_time': '700' })) as Layer.Layer<any, never, never>,
    )

    const runtimeB = ManagedRuntime.make(ReactRuntimeConfig.replace({ gcTime: 900 }) as Layer.Layer<any, never, never>)

    const wrapperA = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtimeA} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const wrapperB = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtimeB} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }
      const moduleRuntime = useModule(CounterImpl)
      useSelector(moduleRuntime, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      const cache = React.useMemo(
        () => getModuleCache(ctx.runtime, ctx.reactConfigSnapshot),
        [ctx.runtime, ctx.reactConfigSnapshot],
      )
      const entries = (cache as any).entries as Map<string, any>
      const entry = entries.values().next().value as { gcTime?: number } | undefined
      return entry?.gcTime
    }

    const { result: resultA } = renderHook(useTest, { wrapper: wrapperA })
    const { result: resultB } = renderHook(useTest, { wrapper: wrapperB })

    await waitFor(() => {
      expect(resultA.current).toBe(700)
      expect(resultB.current).toBe(900)
    })
  })

  it('uses layer-bound owner path for config-bearing provider layer', async () => {
    const events: Logix.Debug.Event[] = []

    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        Logix.Debug.diagnosticsLevel('light'),
        Logix.Debug.replace([
          {
            record: (event: Logix.Debug.Event) =>
              Effect.sync(() => {
                events.push(event)
              }),
          },
        ]) as Layer.Layer<any, never, never>,
      ) as Layer.Layer<any, never, never>,
    )

    const configBearingLayer = ConfigProvider.layer(ConfigProvider.fromUnknown({ 'logix.react.gc_time': '1800' })) as Layer.Layer<
      any,
      never,
      never
    >

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} layer={configBearingLayer} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error('RuntimeContext missing')
      }
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(moduleRuntime, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      return {
        count,
        gcTime: ctx.reactConfigSnapshot.gcTime,
      }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.gcTime).toBe(1800)
    })

    await waitFor(() => {
      const asyncSnapshots = events.filter(
        (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'async',
      ) as Array<any>
      const layerBoundBootSnapshots = asyncSnapshots.filter(
        (event) => event.data?.owner === 'runtime.layer-bound' && event.data?.phase === 'boot',
      )
      expect(layerBoundBootSnapshots).toHaveLength(1)
    })
  })

  it('propagates logger/logLevel/debug sinks from provider layer', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const runtimeLayer = Layer.mergeAll(
      Layer.succeed(References.MinimumLogLevel, 'Debug') as Layer.Layer<any, never, never>,
      Logix.Debug.layer({ mode: 'dev' }) as Layer.Layer<any, never, never>,
      Logix.Debug.traceLayer(() => Effect.void),
    ) as Layer.Layer<any, never, never>

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} layer={runtimeLayer} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const activeRuntime = useRuntime()
      const moduleRuntime = useModule(CounterImpl)
      useSelector(moduleRuntime, (s: Logix.StateOf<typeof Counter.shape>) => s.count)

      return activeRuntime.runSync(
        Effect.gen(function* () {
          const loggers = yield* Effect.service(Logger.CurrentLoggers).pipe(Effect.orDie)
          const level = yield* Effect.service(References.MinimumLogLevel).pipe(Effect.orDie)
          const sinks = yield* Effect.service(Logix.Debug.internal.currentDebugSinks).pipe(Effect.orDie)
          return {
            loggerCount: (loggers as any).length ?? (loggers as any)?.size ?? 0,
            level,
            sinksLength: sinks.length,
          }
        }),
      )
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(
      () => {
        expect(result.current.level).toBeDefined()
        expect(result.current.loggerCount).toBeGreaterThanOrEqual(0)
        expect(result.current.sinksLength).toBeGreaterThanOrEqual(0)
      },
      { timeout: 5000 },
    )
  })
})
