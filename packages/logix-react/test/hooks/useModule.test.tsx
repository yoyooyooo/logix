import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from "@testing-library/react"
import * as Logix from "@logix/core"
import { Schema, Effect, ManagedRuntime, Layer } from "effect"
import { useModule } from "../../src/hooks/useModule.js"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import React from "react"

// Define a simple Counter module
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

describe("useModule", () => {
  it("should retrieve module from RuntimeProvider and update state", async () => {
    // Create a runtime with the Counter module
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

    // Wrapper component to provide runtime
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter)
        const count = useModule(Counter, (s) => (s as { readonly count: number }).count)
        return { counter, count }
      },
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(typeof result.current.counter.runtime.dispatch).toBe("function")
    })

    await act(async () => {
      result.current.counter.actions.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })

  it("should preserve StateTransaction instrumentation between Runtime.run* and RuntimeProvider + useModule", async () => {
    const InstrCounter = Logix.Module.make("InstrCounter", {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const InstrCounterImpl = InstrCounter.implement({
      initial: { value: 0 },
      logics: [],
    })

    // Runtime 级配置 instrumentation = "light"
    const runtime = Logix.Runtime.make(InstrCounterImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
      stateTransaction: { instrumentation: "light" },
    })

    // 直接通过 Runtime.runPromise 访问 ModuleRuntime，读取内部 instrumentation 标记
    const directInstr = await runtime.runPromise(
      Effect.gen(function* () {
        const rt = yield* InstrCounter
        return (rt as any).__stateTransactionInstrumentation as string
      }) as Effect.Effect<string, never, any>,
    )

    expect(directInstr).toBe("light")

    // 通过 RuntimeProvider + useModule 访问同一 ModuleRuntime，期望 instrumentation 一致
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const rt = useModule(InstrCounter)
        return (rt.runtime as any).__stateTransactionInstrumentation as string | undefined
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current).toBe("light")
    })

    expect(result.current).toBe(directInstr)
  })
})
