import { describe, it, expect } from "vitest"
// @vitest-environment happy-dom
import React, { Suspense } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { Effect, Layer, ManagedRuntime, Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"

// 复刻 examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx 中的核心逻辑，
// 用于在测试环境下验证 suspend:true + 本地 ModuleImpl 的行为。

const AsyncCounterModule = Logix.Module.make("AsyncLocalCounter:test", {
  state: Schema.Struct({ count: Schema.Number, ready: Schema.Boolean }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const AsyncCounterLogic = AsyncCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.sleep("10 millis")

    yield* $.state.update((s) => ({
      ...s,
      ready: true,
    }))

    yield* $.onAction("increment").runParallelFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )

    yield* $.onAction("decrement").runParallelFork(
      $.state.mutate((s) => {
        s.count -= 1
      }),
    )
  }),
)

const AsyncCounterImpl = AsyncCounterModule.implement({
  initial: { count: 0, ready: false },
  logics: [AsyncCounterLogic],
})

const asyncLocalRuntime = ManagedRuntime.make(
  Layer.empty as Layer.Layer<never, never, never>,
) as unknown as ManagedRuntime.ManagedRuntime<any, any>

const AsyncLocalCounterView: React.FC = () => {
  const moduleRuntime = useModule(AsyncCounterImpl, {
    suspend: true,
    key: "AsyncLocalCounter:test-instance",
  })
  const state = useSelector(
    moduleRuntime,
    (s) => s as { count: number; ready: boolean },
  )
  const dispatch = useDispatch(moduleRuntime)

  if (!state.ready) {
    return <div>Initializing…</div>
  }

  return (
    <div>
      <span data-testid="value">{state.count}</span>
      <button
        type="button"
        onClick={() =>
          dispatch({ _tag: "increment", payload: undefined })
        }
      >
        inc
      </button>
    </div>
  )
}

describe("AsyncLocalModule with suspend:true and local runtime", () => {
  it("should resolve Suspense and render counter after async init", async () => {
    render(
      <RuntimeProvider runtime={asyncLocalRuntime}>
        <Suspense fallback={<div data-testid="fallback">fallback</div>}>
          <AsyncLocalCounterView />
        </Suspense>
      </RuntimeProvider>,
    )

    // 初始应展示 Suspense fallback
    expect(screen.getByTestId("fallback")).toBeTruthy()

    // 等待异步初始化完成并渲染实际视图
    await waitFor(() => {
      expect(screen.queryByTestId("fallback")).toBeNull()
      expect(screen.getByTestId("value").textContent).toBe("0")
    })
  })
})
