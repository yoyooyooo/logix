import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from "@testing-library/react"
import * as Logix from "@logix/core"
import { Effect, Schema, ManagedRuntime } from "effect"
import { useModule } from "../../src/hooks/useModule.js"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import React from "react"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

describe("useDispatch", () => {
  it("should dispatch actions and update state", async () => {
    const CounterLogic = Counter.logic<never>((api) =>
      Effect.gen(function* () {
        // 在 run 段挂载 watcher，避免 setup 阶段触发 Phase Guard
        yield* api.onAction("increment").run(() =>
          api.state.update((s) => ({ count: s.count + 1 })),
        )
      }),
    )

    const layer = Counter.live({ count: 0 }, CounterLogic)
    // 测试环境下 Layer 的环境依赖已在 Counter.live 中闭合，这里用类型断言收敛 RIn。
    const runtime = ManagedRuntime.make(layer as import("effect").Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const useTest = () => {
      const counter = useModule(Counter)
      const count = useModule(Counter, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      return { counter, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    await act(async () => {
      result.current.counter.actions.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })
})
