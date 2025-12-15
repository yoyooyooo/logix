import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import { renderHook, waitFor, act } from "@testing-library/react"
import * as Logix from "@logix/core"
import { Schema, ManagedRuntime, Effect } from "effect"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import React from "react"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

describe("useSelector", () => {
  it("should select state slice and update on change", async () => {
    const layer = Counter.live(
      { count: 10 },
      Counter.logic<never>((api) =>
        Effect.gen(function* () {
          yield* api.onAction("increment").run(() =>
            api.state.update((s) => ({ count: s.count + 1 })),
          )
        }),
      ),
    )
    const runtime = ManagedRuntime.make(layer as import("effect").Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    // Helper hook to trigger update
    const useTest = () => {
      const counter = useModule(Counter)
      const count = useModule(Counter, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      return { counter, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(10)
    })

    await act(async () => {
      result.current.counter.actions.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(11)
    })
  })

  it("should invoke equalityFn when provided", async () => {
    const layer = Counter.live(
      { count: 0 },
      Counter.logic<never>((api) =>
        Effect.gen(function* () {
          yield* api.onAction("increment").run(() =>
            api.state.update((s) => ({ count: s.count + 1 })),
          )
        }),
      ),
    )

    const runtime = ManagedRuntime.make(layer as import("effect").Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let equalityCallCount = 0

    const useTest = () => {
      const counter = useModule(Counter)
      const count = useModule(
        Counter,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
        (prev, next) => {
          equalityCallCount++
          return Object.is(prev, next)
        },
      )
      return { counter, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    const beforeCalls = equalityCallCount

    await act(async () => {
      result.current.counter.actions.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })

    // 自定义 equalityFn 至少会在一次更新过程中被调用
    expect(equalityCallCount).toBeGreaterThan(beforeCalls)
  })
})
