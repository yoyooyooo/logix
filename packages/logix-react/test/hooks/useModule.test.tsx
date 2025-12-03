import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from "@testing-library/react"
import { Logix } from "@logix/core"
import { Schema, Effect, ManagedRuntime, Layer } from "effect"
import { useModule } from "../../src/hooks/useModule.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import React from "react"

// Define a simple Counter module
const Counter = Logix.Module("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

describe("useModule", () => {
  it("should retrieve module from RuntimeProvider and update state", async () => {
    // Create a runtime with the Counter module
    const layer = Counter.live({ count: 0 },
      Counter.logic<never>((api) =>
        api.onAction("increment").run(() => api.state.update(s => ({ count: s.count + 1 })))
      )
    )
    const runtime = ManagedRuntime.make(
      layer as import("effect").Layer.Layer<
        import("@logix/core").Logix.ModuleRuntime<
          { readonly count: number },
          import("@logix/core").Logix.ActionOf<typeof Counter.shape>
        >,
        never,
        never
      >
    )

    // Wrapper component to provide runtime
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const runtime = useModule(Counter)
        const count = useModule(Counter, (s) => (s as { readonly count: number }).count)
        const dispatch = useDispatch(runtime)
        return { runtime, count, dispatch }
      },
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(typeof result.current.runtime.dispatch).toBe("function")
    })

    await act(async () => {
      result.current.dispatch({ _tag: "increment", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })
})
