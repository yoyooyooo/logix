import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import { renderHook, waitFor, act } from "@testing-library/react"
import { Logix } from "@logix/core"
import { Schema, ManagedRuntime } from "effect"
import { useSelector } from "../../src/hooks/useSelector.js"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"
import React from "react"

const Counter = Logix.Module("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

describe("useSelector", () => {
  it("should select state slice and update on change", async () => {
    const layer = Counter.live({ count: 10 },
      Counter.logic<never>((api) =>
        api.onAction("increment").run(() => api.state.update(s => ({ count: s.count + 1 })))
      )
    )
    const runtime = ManagedRuntime.make(
      layer as import("effect").Layer.Layer<
        import("@logix/core").Logix.ModuleRuntime<
          { readonly count: number },
          { readonly _tag: "increment"; readonly payload: void }
        >,
        never,
        never
      >
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    // Helper hook to trigger update
    const useTest = () => {
      const runtime = useModule(Counter)
      const count = useSelector(
        Counter,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )
      const dispatch = useDispatch(runtime)
      return { count, dispatch }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(10)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "increment", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.count).toBe(11)
    })
  })

  it("should invoke equalityFn when provided", async () => {
    const layer = Counter.live({ count: 0 },
      Counter.logic<never>((api) =>
        api.onAction("increment").run(() =>
          api.state.update((s) => ({ count: s.count + 1 })),
        ),
      ),
    )

    const runtime = ManagedRuntime.make(
      layer as import("effect").Layer.Layer<
        import("@logix/core").Logix.ModuleRuntime<
          { readonly count: number },
          { readonly _tag: "increment"; readonly payload: void }
        >,
        never,
        never
      >,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let equalityCallCount = 0

    const useTest = () => {
      const runtime = useModule(Counter)
      const count = useSelector(
        Counter,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
        (prev, next) => {
          equalityCallCount++
          return Object.is(prev, next)
        },
      )
      const dispatch = useDispatch(runtime)
      return { count, dispatch }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    const beforeCalls = equalityCallCount

    await act(async () => {
      result.current.dispatch({ _tag: "increment", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })

    // 自定义 equalityFn 至少会在一次更新过程中被调用
    expect(equalityCallCount).toBeGreaterThan(beforeCalls)
  })
})
