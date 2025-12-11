import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from "@testing-library/react"
import * as Logix from "@logix/core"
import { Schema, ManagedRuntime, Layer, Effect } from "effect"
import React from "react"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useLocalModule } from "../../src/hooks/useLocalModule.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void
  }
})

const incrementLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("increment").run(() =>
      $.state.update((s) => ({ count: s.count + 1 })),
    )
  }),
)

describe("useLocalModule", () => {
  let rootRuntime: ManagedRuntime.ManagedRuntime<any, any>
  // Vitest 的类型推断对 spy 实例的泛型约束较严格，这里使用宽松的 any，避免干扰用例本身。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useIdSpy: any

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <React.StrictMode>
      <RuntimeProvider runtime={rootRuntime}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    </React.StrictMode>
  )

  beforeEach(() => {
    rootRuntime = ManagedRuntime.make(
      Layer.empty as unknown as Layer.Layer<any, any, never>
    )
    // 在测试环境中，React.useId 的行为与生产略有差异，这里固定返回值，
    // 避免将测试 runner 的实现细节投射到生产代码的 key 设计上。
    useIdSpy = vi.spyOn(React, "useId").mockImplementation(() => "test-local-id")
  })

  afterEach(async () => {
    await rootRuntime.dispose()
    useIdSpy?.mockRestore()
    useIdSpy = undefined
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
      expect(result.current?.count).toBe(0)
    })

    await act(async () => {
      result.current.dispatch({ _tag: "increment", payload: undefined })
    })

    await waitFor(() => {
      expect(result.current?.count).toBe(1)
    })
  })

  it("should re-create runtime when deps change", async () => {
    const useTest = (userId: string) => {
      const runtime = useLocalModule(Counter, {
        initial: { count: Number(userId) },
        logics: [incrementLogic],
        deps: [userId],
      })
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
