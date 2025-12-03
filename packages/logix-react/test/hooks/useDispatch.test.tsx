import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from "@testing-library/react"
import { Logix } from "@logix/core"
import { Schema, ManagedRuntime } from "effect"
import { useDispatch } from "../../src/hooks/useDispatch.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { useModule } from "../../src/hooks/useModule.js"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import React from "react"

const Counter = Logix.Module("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

describe("useDispatch", () => {
  it("should dispatch actions and update state", async () => {
    const layer = Counter.live({ count: 0 },
      Counter.logic<never>((api) =>
        api.onAction("increment").run(() => api.state.update(s => ({ count: s.count + 1 })))
      )
    )
    // 测试环境下 Layer 的环境依赖已在 Counter.live 中闭合，这里用类型断言收敛 RIn。
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

    const useTest = () => {
      const runtime = useModule(Counter)
      const dispatch = useDispatch(runtime)
      const count = useSelector(
        Counter,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
      )
      return { dispatch, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

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
})
