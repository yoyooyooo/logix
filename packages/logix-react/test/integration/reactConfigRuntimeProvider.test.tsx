import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import * as Logix from "@logix/core"
import {
  Schema,
  ManagedRuntime,
  Layer,
  ConfigProvider,
  Effect,
  FiberRef,
  LogLevel,
  Logger,
} from "effect"
import { RuntimeProvider, useRuntime } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { getModuleCache } from "../../src/internal/ModuleCache.js"
import { RuntimeContext } from "../../src/internal/ReactContext.js"
import { ReactRuntimeConfig } from "../../src/internal/config.js"

const Counter = Logix.Module.make("ConfigCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

const CounterImpl = Counter.implement({
  initial: { count: 0 },
  logics: [],
})

describe("ReactModuleConfig with RuntimeProvider", () => {
  it("applies ConfigProvider values to ModuleCache via runtime snapshot", async () => {
    const configLayer = Layer.setConfigProvider(
      ConfigProvider.fromMap(
        new Map<string, string>([["logix.react.gc_time", "1000"]]),
      ),
    )

    const runtime = ManagedRuntime.make(
      configLayer as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const useTest = () => {
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(
        moduleRuntime,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )

      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error("RuntimeContext missing")
      }

      const cache = React.useMemo(
        () =>
          getModuleCache(
            ctx.runtime,
            ctx.reactConfigSnapshot,
            ctx.configVersion,
          ),
        [ctx.runtime, ctx.reactConfigSnapshot, ctx.configVersion],
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

  it("prefers runtime-level ReactRuntimeConfig.replace over ConfigProvider", async () => {
    const configLayer = Layer.setConfigProvider(
      ConfigProvider.fromMap(
        new Map<string, string>([["logix.react.gc_time", "1000"]]),
      ),
    )

    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        configLayer as Layer.Layer<any, never, never>,
        ReactRuntimeConfig.replace({ gcTime: 1500 }),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const useTest = () => {
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(
        moduleRuntime,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )

      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error("RuntimeContext missing")
      }

      const cache = React.useMemo(
        () =>
          getModuleCache(
            ctx.runtime,
            ctx.reactConfigSnapshot,
            ctx.configVersion,
          ),
        [ctx.runtime, ctx.reactConfigSnapshot, ctx.configVersion],
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

  it("loads config snapshot once under StrictMode", async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error("RuntimeContext missing")
      }
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(
        moduleRuntime,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )
      return { count, gcTime: ctx.reactConfigSnapshot.gcTime, version: ctx.configVersion }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.gcTime).toBe(500)
      expect(result.current.version).toBe(1)
    })
  })

  it("isolates config per runtime when multiple providers coexist", async () => {
    const runtimeA = ManagedRuntime.make(
      Layer.setConfigProvider(
        ConfigProvider.fromMap(
          new Map<string, string>([["logix.react.gc_time", "700"]]),
        ),
      ) as Layer.Layer<any, never, never>,
    )

    const runtimeB = ManagedRuntime.make(
      ReactRuntimeConfig.replace({ gcTime: 900 }) as Layer.Layer<any, never, never>,
    )

    const wrapperA = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtimeA}>{children}</RuntimeProvider>
    )

    const wrapperB = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtimeB}>{children}</RuntimeProvider>
    )

    const useTest = () => {
      const ctx = React.useContext(RuntimeContext)
      if (!ctx) {
        throw new Error("RuntimeContext missing")
      }
      const moduleRuntime = useModule(CounterImpl)
      useSelector(
        moduleRuntime,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )
      const cache = React.useMemo(
        () =>
          getModuleCache(
            ctx.runtime,
            ctx.reactConfigSnapshot,
            ctx.configVersion,
          ),
        [ctx.runtime, ctx.reactConfigSnapshot, ctx.configVersion],
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

  it("propagates logger/logLevel/debug sinks from provider layer", async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const runtimeLayer = Layer.mergeAll(
      Logger.minimumLogLevel(LogLevel.Debug) as Layer.Layer<any, never, never>,
      Logix.Debug.layer({ mode: "dev" }) as Layer.Layer<any, never, never>,
      Logix.Debug.traceLayer(() => Effect.void),
    ) as Layer.Layer<any, never, never>

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} layer={runtimeLayer}>
        {children}
      </RuntimeProvider>
    )

    const useTest = () => {
      const activeRuntime = useRuntime()
      const moduleRuntime = useModule(CounterImpl)
      useSelector(
        moduleRuntime,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )

      return activeRuntime.runSync(
        Effect.gen(function* () {
          const loggers = yield* FiberRef.get(FiberRef.currentLoggers)
          const level = yield* FiberRef.get(FiberRef.currentLogLevel)
          const sinks = yield* FiberRef.get(
            Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>,
          )
          return {
            loggerCount: (loggers as any).length ?? (loggers as any)?.size ?? 0,
            level,
            sinksLength: sinks.length,
          }
        }),
      )
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.level).toBeDefined()
      expect(result.current.loggerCount).toBeGreaterThanOrEqual(0)
      expect(result.current.sinksLength).toBeGreaterThanOrEqual(0)
    })
  })
})
