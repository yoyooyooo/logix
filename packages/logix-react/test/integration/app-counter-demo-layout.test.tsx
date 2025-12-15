// @vitest-environment happy-dom

import React from "react"
import { describe, it, expect } from "vitest"
import { render, fireEvent, waitFor } from "@testing-library/react"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"

describe("App-like counter demo layout (AppDemoLayout-style)", () => {
  const CounterModule = Logix.Module.make("AppDemoCounter", {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {
      increment: Schema.Void,
      decrement: Schema.Void,
    },
    reducers: {
      increment: (s) => ({ ...s, count: s.count + 1 }),
      decrement: (s) => ({ ...s, count: s.count - 1 }),
    },
  })

  const CounterLogic = CounterModule.logic(($) =>
    Effect.gen(function* () {
      // 正常业务日志
      yield* Effect.log("AppDemoCounter logic setup")

      // 挂载 lifecycle.onError，方便调试
      yield* $.lifecycle.onError((cause) =>
        Effect.logError("AppDemoCounter logic error", cause),
      )

      // 普通 watcher：打印一条日志，证明 dispatch 生效
      yield* $.onAction("increment").run(() =>
        Effect.log("increment dispatched from AppDemoCounter"),
      )

      // trace watcher：每次 increment 发送 trace:* Debug 事件
      yield* $.onAction("increment").run(() =>
        Logix.Debug.record({
          type: "trace:increment",
          moduleId: CounterModule.id,
          data: { source: "app-counter-demo-layout.test" },
        }),
      )
    }),
  )

  const CounterImpl = CounterModule.implement({
    initial: { count: 0 },
    logics: [CounterLogic],
  })

  const CounterView: React.FC = () => {
    const counter = useModule(CounterImpl)
    const count = useModule(counter, (s) => (s as { count: number }).count)

    return (
      <div>
        <span data-testid="count">{count}</span>
        <button
          type="button"
          onClick={() => counter.actions.decrement()}
        >
          dec
        </button>
        <button
          type="button"
          onClick={() => counter.actions.increment()}
        >
          inc
        </button>
      </div>
    )
  }

  it("should update count via Runtime.make + RuntimeProvider + hooks chain", async () => {
    const appRuntime = Logix.Runtime.make(
      CounterImpl,
      {
        // 这里不额外注入 DebugSink，只验证 Runtime → Provider → hooks 的链路正常工作；
        // Debug.trace 能力由专门的 runtime-debug-trace-integration.test.tsx 覆盖。
        layer: Layer.empty as Layer.Layer<any, never, never>,
      },
    )

    const { getByTestId, getByText } = render(
      <RuntimeProvider runtime={appRuntime}>
        <CounterView />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("count").textContent).toBe("0")
    })

    fireEvent.click(getByText("inc"))

    await waitFor(() => {
      expect(getByTestId("count").textContent).toBe("1")
    })

    fireEvent.click(getByText("dec"))

    await waitFor(() => {
      expect(getByTestId("count").textContent).toBe("0")
    })
  })
})
