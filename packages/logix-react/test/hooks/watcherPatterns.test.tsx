import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react"
import { Schema, ManagedRuntime, Effect, Layer } from "effect"
import { Logix } from "@logix/core"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"

const Counter = Logix.Module("Counter", {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
})

// ModuleImpl：用于验证在 React 场景下，Impl + runFork 的行为与 Tag 模式一致
const CounterImpl = Counter.make({
  initial: { value: 0 },
  logics: [],
})

// Error logging Logic：帮助在测试中看清逻辑错误原因
const CounterErrorLogic = Counter.logic(($) =>
  $.lifecycle.onError((cause, context) =>
    Effect.logError("Counter logic error", cause, context),
  ),
)

// Logic 1: 使用 runFork 在单个 Logic 内挂两条 watcher
const CounterRunForkLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").runFork(
      $.state.update((s) => ({ ...s, value: s.value + 1 })),
    )

    yield* $.onAction("dec").runFork(
      $.state.update((s) => ({ ...s, value: s.value - 1 })),
    )
  }),
)

// Logic 2: 使用 Effect.all + run 挂两条 watcher
const CounterAllLogic = Counter.logic(($) =>
  Effect.all(
    [
      $.onAction("inc").run(
        $.state.update((s) => ({ ...s, value: s.value + 1 })),
      ),
      $.onAction("dec").run(
        $.state.update((s) => ({ ...s, value: s.value - 1 })),
      ),
    ],
    { concurrency: "unbounded" },
  ),
)

// Logic 3: 手写 Effect.forkScoped($.onAction().run(...)) 挂两条 watcher（对 runFork 的等价性校验）
const CounterManualForkLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.forkScoped(
      $.onAction("inc").run(
        $.state.update((s) => ({ ...s, value: s.value + 1 })),
      ),
    )

    yield* Effect.forkScoped(
      $.onAction("dec").run(
        $.state.update((s) => ({ ...s, value: s.value - 1 })),
      ),
    )
  }),
)

describe("React watcher patterns integration", () => {
  it("runFork-based watcher should update state via React hooks", async () => {
    const layer = Counter.live(
      { value: 0 },
      CounterRunForkLogic,
      CounterErrorLogic,
    )

    const runtime = ManagedRuntime.make(
      layer as import("effect").Layer.Layer<
        import("@logix/core").Logix.ModuleRuntime<
          { readonly value: number },
          import("@logix/core").Logix.ActionOf<typeof Counter.shape>
        >,
        never,
        never
      >,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const moduleRuntime = useModule(Counter)
      const value = useSelector(
        Counter,
        (s) => (s as { value: number }).value,
      )
      const dispatch = useDispatch(moduleRuntime)
      return { value, dispatch }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "inc", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "dec", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })
  })

  it("Effect.all + run style watcher should update state via React hooks", async () => {
    const layer = Counter.live(
      { value: 0 },
      CounterAllLogic,
      CounterErrorLogic,
    )

    const runtime = ManagedRuntime.make(
      layer as import("effect").Layer.Layer<
        import("@logix/core").Logix.ModuleRuntime<
          { readonly value: number },
          import("@logix/core").Logix.ActionOf<typeof Counter.shape>
        >,
        never,
        never
      >,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const moduleRuntime = useModule(Counter)
      const value = useSelector(
        Counter,
        (s) => (s as { value: number }).value,
      )
      const dispatch = useDispatch(moduleRuntime)
      return { value, dispatch }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "inc", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "dec", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })
  })

  it("manual Effect.fork($.onAction().run(...)) watcher should behave like runFork", async () => {
    const layer = Counter.live(
      { value: 0 },
      CounterManualForkLogic,
      CounterErrorLogic,
    )

    const runtime = ManagedRuntime.make(
      layer as import("effect").Layer.Layer<
        import("@logix/core").Logix.ModuleRuntime<
          { readonly value: number },
          import("@logix/core").Logix.ActionOf<typeof Counter.shape>
        >,
        never,
        never
      >,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const moduleRuntime = useModule(Counter)
      const value = useSelector(
        Counter,
        (s) => (s as { value: number }).value,
      )
      const dispatch = useDispatch(moduleRuntime)
      return { value, dispatch }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "inc", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "dec", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })
  })

  it("runFork-based watcher should also work with ModuleImpl + useModule(Impl)", async () => {
    // 基于 CounterImpl 构造局部 Module 实现（逻辑与 Tag 模式保持一致）
    const CounterImplRunFork = Counter.make({
      initial: { value: 0 },
      logics: [CounterRunForkLogic, CounterErrorLogic],
    })

    // Impl 模式下，App 级 Runtime 可以是“空 Layer”——真正的 ModuleRuntime 由 useModule(Impl) 在组件内构造
    const runtime = ManagedRuntime.make(
      Layer.empty as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      // 这里直接消费 ModuleImpl：useModule 会在组件 Scope 内构造 ModuleRuntime
      const moduleRuntime = useModule(CounterImplRunFork)
      const value = useSelector(
        moduleRuntime,
        (s) => (s as { value: number }).value,
      )
      const dispatch = useDispatch(moduleRuntime)
      return { value, dispatch }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "inc", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "dec", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })
  })
})
