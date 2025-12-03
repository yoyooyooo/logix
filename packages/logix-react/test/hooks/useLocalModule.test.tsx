import { describe, it, expect, beforeEach, afterEach } from "vitest"
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from "@testing-library/react"
import { Logix, ModuleRuntime } from "@logix/core"
import { Schema, ManagedRuntime, Layer } from "effect"
import React from "react"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useLocalModule } from "../../src/hooks/useLocalModule.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"

const Counter = Logix.Module("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void
  }
})

const incrementLogic = Counter.logic(($) =>
  $.onAction("increment").run(() => $.state.update((s) => ({ count: s.count + 1 })))
)

describe("useLocalModule", () => {
  let rootRuntime: ManagedRuntime.ManagedRuntime<any, any>

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RuntimeProvider runtime={rootRuntime}>{children}</RuntimeProvider>
  )

  beforeEach(() => {
    rootRuntime = ManagedRuntime.make(
      Layer.empty as unknown as Layer.Layer<any, any, never>
    )
  })

  afterEach(async () => {
    await rootRuntime.dispose()
  })

  it("should create local runtime from module options", async () => {
    const useTest = () => {
      const runtime = useLocalModule(Counter, {
        initial: { count: 0 },
        logics: [incrementLogic],
      })
      const count = useSelector(
        runtime,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )
      const dispatch = useDispatch(runtime)
      return { count, dispatch }
    }

    const { result } = renderHook(useTest, { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "increment", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })

  it("should re-create runtime when deps change", async () => {
    const useTest = (userId: string) => {
      const runtime = useLocalModule(
        () =>
          ModuleRuntime.make(
            { count: Number(userId) },
            {
              tag: Counter,
              logics: [incrementLogic],
            }
          ),
        [userId]
      )
      const count = useSelector(
        runtime,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )
      return count
    }

    const { result, rerender } = renderHook(({ id }) => useTest(id), {
      initialProps: { id: "1" },
      wrapper
    })

    await waitFor(() => {
      expect(result.current).toBe(1)
    })

    rerender({ id: "5" })

    await waitFor(() => {
      expect(result.current).toBe(5)
    })
  })
})
