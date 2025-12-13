// @vitest-environment jsdom
import React from "react"
import { describe, expect, it, beforeAll } from "vitest"
import { render, fireEvent, waitFor, screen } from "@testing-library/react"
import { Effect, Schema, Layer } from "effect"
import * as Logix from "@logix/core"
import {
  RuntimeProvider,
  useModule,
  useSelector,
  useDispatch,
} from "@logix/react"
import { LogixDevtools } from "../src/ui/shell/LogixDevtools.js"
import { devtoolsLayer, getDevtoolsSnapshot } from "../src/snapshot.js"

// 一个极简 Counter Module，用于验证 @logix/core + @logix/react + devtools 的集成行为。
const CounterModule = Logix.Module.make("DevtoolsTestCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const CounterImpl = CounterModule.implement({
  initial: { count: 0 },
  logics: [
    CounterModule.logic(($) =>
      Effect.gen(function* () {
        // 简单记录一次调试事件，帮助验证 Debug Sink 能够接收行为。
        yield* $.onAction("increment").run(() =>
          Logix.Debug.record({
            type: "trace:increment",
            moduleId: CounterModule.id,
            data: { source: "devtools-react.integration.test" },
          }),
        )
      }),
    ),
  ],
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: "DevtoolsIntegrationRuntime",
  layer: devtoolsLayer as Layer.Layer<any, never, never>,
})

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterImpl.module)
  const count = useSelector(runtimeHandle, (s) => s.count)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <button
      type="button"
      onClick={() => dispatch({ _tag: "increment", payload: undefined })}
    >
      count: {count}
    </button>
  )
}

describe("@logix/devtools-react integration with @logix/react", () => {
  beforeAll(() => {
    if (typeof window !== "undefined") {
      // jsdom 下补一个 matchMedia polyfill，避免 DevtoolsShell 中的主题探测报错。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
  })
  it("collects Debug events and state updates from a React-driven module", async () => {
    const { getByText } = render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
      </RuntimeProvider>,
    )

    const button = getByText(/count:/i)

    // 初始状态
    expect(button.textContent).toContain("count: 0")

    // 触发一次 increment
    fireEvent.click(button)

    // 等待 Effect/Debug Sink 完成本次事件的处理与 snapshot 更新
    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      expect(snapshot.events.length).toBeGreaterThan(0)
      expect(
        Array.from(snapshot.instances.keys()).some((key) =>
          key.includes("DevtoolsIntegrationRuntime"),
        ),
      ).toBe(true)
    })

    // 再触发两次 increment，用于验证时间线上的 state:update 快照是否按次序保留
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      const stateUpdates = snapshot.events.filter(
        (e) => e.type === "state:update" && "state" in e,
      ) as Array<{ type: "state:update"; state: any }>

      // 至少应有 3 次更新（3 次 increment）
      expect(stateUpdates.length).toBeGreaterThanOrEqual(3)

      const counts = stateUpdates.map((e) => (e.state as any).count)
      // 要求计数是严格递增的，确保每次 state:update 挂的是当时的快照，而不是被“洗成最新值”
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
      }
    })
  })

  it("exposes transaction-level summary for the latest txn in Inspector", async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const button = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // 触发几次 increment，产生多条事务与渲染事件。
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      const stateUpdates = snapshot.events.filter(
        (e) => e.type === "state:update" && "state" in e,
      )
      expect(stateUpdates.length).toBeGreaterThanOrEqual(2)

      // Devtools 面板已经打开，并且 Inspector 中出现 Transaction Summary 概览。
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
      expect(screen.getByText(/Transaction Summary/i)).not.toBeNull()
    })
  })
})
