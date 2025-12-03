import { describe, it, expect, afterEach } from "vitest"
// @vitest-environment happy-dom
import React from "react"
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { Schema, ManagedRuntime, Layer } from "effect"
import { Logix } from "@logix/core"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"
import { useSelector } from "../../src/hooks/useSelector.js"
import { useDispatch } from "../../src/hooks/useDispatch.js"

const Counter = Logix.Module("CounterMulti", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

const CounterLogic = Counter.logic(($) =>
  $.onAction("increment").run(
    $.state.update((s) => ({ count: s.count + 1 })),
  ),
)

const CounterImpl = Counter.make({
  initial: { count: 0 },
  logics: [CounterLogic],
})

describe("useModule multi-instance behavior", () => {
  afterEach(() => {
    cleanup()
  })
  const makeTagRuntime = () =>
    ManagedRuntime.make(
      Counter.live({ count: 0 }, CounterLogic) as Layer.Layer<
        Logix.ModuleRuntime<
          { readonly count: number },
          Logix.ActionOf<typeof Counter.shape>
        >,
        never,
        never
      >,
    )

  const makeImplRuntime = () =>
    ManagedRuntime.make(
      Layer.empty as unknown as Layer.Layer<any, never, never>,
    )

  it("Tag mode should share module instance across components", async () => {
    const runtime = makeTagRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const UseCounter = () => {
      const moduleRuntime = useModule(Counter)
      const count = useSelector(
        Counter,
        (s) => (s as { count: number }).count,
      )
      const dispatch = useDispatch(moduleRuntime)
      return { count, dispatch }
    }

    const View = () => {
      const a = UseCounter()
      const b = UseCounter()
      return (
        <>
          <button
            type="button"
            onClick={() =>
              a.dispatch({ _tag: "increment", payload: undefined })
            }
          >
            inc-a
          </button>
          <span data-testid="a">{a.count}</span>
          <span data-testid="b">{b.count}</span>
        </>
      )
    }

    const { getByTestId, getByText } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId("a").textContent).toBe("0")
      expect(getByTestId("b").textContent).toBe("0")
    })

    fireEvent.click(getByText("inc-a"))

    await waitFor(() => {
      // Tag 模式下，两处使用同一 Module，都看到同一个值
      expect(getByTestId("a").textContent).toBe("1")
      expect(getByTestId("b").textContent).toBe("1")
    })

    await runtime.dispose()
  })

  it("ModuleImpl mode should isolate state per component", async () => {
    const runtime = makeImplRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    )

    const UseLocalCounter = () => {
      const moduleRuntime = useModule(CounterImpl)
      const count = useSelector(
        moduleRuntime,
        (s) => (s as { count: number }).count,
      )
      const dispatch = useDispatch(moduleRuntime)
      return { count, dispatch }
    }

    const View = () => {
      const a = UseLocalCounter()
      const b = UseLocalCounter()
      return (
        <>
          <button
            type="button"
            onClick={() =>
              a.dispatch({ _tag: "increment", payload: undefined })
            }
          >
            inc-a
          </button>
          <button
            type="button"
            onClick={() =>
              b.dispatch({ _tag: "increment", payload: undefined })
            }
          >
            inc-b
          </button>
          <span data-testid="a">{a.count}</span>
          <span data-testid="b">{b.count}</span>
        </>
      )
    }

    const { getByTestId, getByText } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId("a").textContent).toBe("0")
      expect(getByTestId("b").textContent).toBe("0")
    })

    // 只点 A，期待 B 不受影响
    fireEvent.click(getByText("inc-a"))

    await waitFor(() => {
      expect(getByTestId("a").textContent).toBe("1")
      expect(getByTestId("b").textContent).toBe("0")
    })

    // 再点 B，期待两个实例各自维护状态
    fireEvent.click(getByText("inc-b"))

    await waitFor(() => {
      expect(getByTestId("a").textContent).toBe("1")
      expect(getByTestId("b").textContent).toBe("1")
    })

    await runtime.dispose()
  })
})
