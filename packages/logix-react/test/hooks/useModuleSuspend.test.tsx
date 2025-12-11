import { describe, it, expect, vi } from "vitest"
// @vitest-environment happy-dom
import React, { Suspense } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { Schema, Effect, Layer, ManagedRuntime } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"

const Counter = Logix.Module.make("SuspendCounter", {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").run(
      $.state.update((s) => ({ ...s, value: s.value + 1 })),
    )
  }),
)

// 模拟一个“异步构建”的 ModuleImpl（这里用 Effect.delay 代替真实 IO）
const AsyncCounterImpl = Counter.implement({
  initial: { value: 0 },
  logics: [
    Effect.gen(function* () {
      // 模拟异步初始化逻辑
      yield* Effect.sleep("10 millis")
      // 延迟后再挂载已有的 CounterLogic（注意这里只需要返回 Logic 本身，不需要在这里执行它）
      return CounterLogic as any
    }),
  ] as any,
})

describe("useModule(Impl) suspend mode", () => {
  it("should support suspend:true with explicit key (baseline)", async () => {
    const runtime = ManagedRuntime.make(
      Layer.empty as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>
          <Suspense fallback={null}>{children}</Suspense>
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const moduleRuntime = useModule(AsyncCounterImpl, {
        suspend: true,
        key: "AsyncCounter:test",
      })
      const value = useSelector(
        moduleRuntime,
        (s) => (s as { value: number }).value,
      )
      const dispatch = useDispatch(moduleRuntime)
      return { value, dispatch }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })

    result.current?.dispatch({ _tag: "inc", payload: undefined })

    await waitFor(() => {
      expect(result.current?.value).toBe(1)
    })
  })

  it("should throw helpful error when suspend:true is used without key in dev", async () => {
    const runtime = ManagedRuntime.make(
      Layer.empty as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>
          <Suspense fallback={null}>{children}</Suspense>
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      // 故意省略 key，验证 useModule 在 dev/test 环境下会抛出可读错误，
      // 防止调用方误用 suspend:true 而没有显式资源标识。
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error suspend:true 模式必须显式提供 key
      useModule(AsyncCounterImpl, {
        suspend: true,
      })
      return null
    }

    expect(() =>
      renderHook(() => useTest(), { wrapper }),
    ).toThrowError(/suspend:true 模式必须显式提供 options\.key/)
  })
})
