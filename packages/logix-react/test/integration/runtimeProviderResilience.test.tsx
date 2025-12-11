import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react"
import { Context, Effect, Layer, ManagedRuntime } from "effect"
import { RuntimeProvider, useRuntime } from "../../src/components/RuntimeProvider.js"

class ServiceA extends Context.Tag("ServiceA")<ServiceA, { readonly value: string }>() {}
class ServiceB extends Context.Tag("ServiceB")<ServiceB, { readonly value: number }>() {}

const baseRuntime = ManagedRuntime.make(
  Layer.succeed(ServiceA, { value: "base" }) as Layer.Layer<any, never, never>
)

describe("RuntimeProvider resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should close scoped resources when layer build fails", async () => {
    let activeResources = 0

    const ResourceTag = Context.GenericTag<number>("@test/ResFail")
    const ResourceLayer = Layer.scoped(
      ResourceTag,
      Effect.acquireRelease(
        Effect.sync(() => {
          activeResources += 1
          return 1
        }),
        () =>
          Effect.sync(() => {
            activeResources -= 1
          })
      )
    )

    // 先成功获取资源，再故意失败，验证 Scope 被关闭并触发 release。
    const FailingLayer = Layer.merge(ResourceLayer, Layer.fail("boom"))

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} layer={FailingLayer}>
        {children}
      </RuntimeProvider>
    )

    renderHook(() => undefined, { wrapper })

    await waitFor(() => {
      expect(activeResources).toBe(0)
    })

    expect(consoleSpy).toHaveBeenCalled()
  })

  it("should not leak when parent unmounts during slow layer build", async () => {
    let activeResources = 0
    const SlowTag = Context.GenericTag<number>("@test/Slow")
    const SlowLayer = Layer.scoped(
      SlowTag,
      Effect.acquireRelease(
        Effect.gen(function* () {
          yield* Effect.sleep("20 millis")
          activeResources += 1
          return 1
        }),
        () =>
          Effect.sync(() => {
            activeResources -= 1
          })
      )
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} layer={SlowLayer}>
        {children}
      </RuntimeProvider>
    )

    const { unmount } = renderHook(() => undefined, { wrapper })

    unmount()

    await waitFor(() => {
      expect(activeResources).toBe(0)
    })
  })

  it("should remain balanced under React StrictMode double render", async () => {
    let activeResources = 0
    const StrictTag = Context.GenericTag<number>("@test/Strict")
    const StrictLayer = Layer.scoped(
      StrictTag,
      Effect.acquireRelease(
        Effect.sync(() => {
          activeResources += 1
          return 1
        }),
        () =>
          Effect.sync(() => {
            activeResources -= 1
          })
      )
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={baseRuntime} layer={StrictLayer}>
          {children}
        </RuntimeProvider>
      </React.StrictMode>
    )

    const { unmount } = renderHook(() => undefined, { wrapper })

    await waitFor(() => {
      expect(activeResources).toBe(1)
    })

    unmount()

    await waitFor(() => {
      expect(activeResources).toBe(0)
    })
  })

  it("should warn on frequent layer rebuilds due to unstable reference", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime}>{children}</RuntimeProvider>
    )

    const { rerender } = renderHook(
      ({ value }) => {
        const layer = React.useMemo(
          () => Layer.succeed(ServiceB, { value }) as Layer.Layer<any, never, never>,
          [value]
        )
        useRuntime({ layer })
      },
      { wrapper, initialProps: { value: 1 } }
    )

    await waitFor(() => {
      expect(warnSpy).not.toHaveBeenCalled()
    })

    rerender({ value: 2 })

    await waitFor(
      () => {
        expect(warnSpy).toHaveBeenCalled()
      },
      { timeout: 1500 }
    )
  })

  it("should reuse merged layer when layers array ref changes but elements are same", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const layer1 = Layer.succeed(ServiceA, { value: "L1" }) as Layer.Layer<any, never, never>
    const layer2 = Layer.succeed(ServiceA, { value: "L2" }) as Layer.Layer<any, never, never>

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime}>{children}</RuntimeProvider>
    )

    const { result, rerender } = renderHook(
      () => {
        // 每次 render 新建数组，但元素相同，应复用合并结果且不触发 warn
        const runtime = useRuntime({
          layers: [layer1, layer2],
        })

        return runtime.runSync(
          Effect.gen(function* () {
            const a = yield* ServiceA
            return a.value
          })
        )
      },
      { wrapper }
    )

    rerender()

    await waitFor(() => {
      expect(result.current).toBe("L2")
    })
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
