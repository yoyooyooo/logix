// @vitest-environment jsdom
import React from "react"
import { describe, expect, it } from "vitest"
import { render, waitFor, screen, fireEvent } from "@testing-library/react"
import { FractalRuntimeLayout } from "../../../examples/logix-react/src/demos/FractalRuntimeLayout.js"
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from "../src/state.js"
import { getDevtoolsSnapshot, clearDevtoolsEvents } from "../src/snapshot.js"

describe("@logix/devtools-react · FractalRuntimeLayout integration", () => {
  it("collects events and exposes FractalRuntimeDemo runtime in Devtools", async () => {
    // 确保测试从干净窗口开始
    clearDevtoolsEvents()

    render(
      <FractalRuntimeLayout />,
    )

    // 刷新后（无用户交互）也应该能看到活跃的 Runtime / Module：
    // - ModuleRuntime.make 会在 module:init 之后立刻发送一条初始 state:update，
    // - DevtoolsSnapshot.latestStates / instances 中应出现 FractalRuntimeDemo / CounterModule。
    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      expect(snapshot.instances.size).toBeGreaterThan(0)
      expect(
        Array.from(snapshot.instances.keys()).some((key) =>
          key.startsWith("FractalRuntimeDemo::CounterModule"),
        ),
      ).toBe(true)
    })

    // 触发一次 +1，确保至少有一次 state:update 与 module:init 被记录
    const incrementButtons = screen.getAllByText("+1")
    fireEvent.click(incrementButtons[0]!)

    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()

      expect(snapshot.events.length).toBeGreaterThan(0)
    })

    // DevtoolsState 中应出现 FractalRuntimeDemo 这一条 Runtime，且包含 CounterModule
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any,
      ) as DevtoolsState

      expect(
        state.runtimes.some(
          (r: DevtoolsState["runtimes"][number]) =>
            r.runtimeLabel === "FractalRuntimeDemo",
        ),
      ).toBe(true)

      const fractalRuntime = state.runtimes.find(
        (r: DevtoolsState["runtimes"][number]) =>
          r.runtimeLabel === "FractalRuntimeDemo",
      )

      expect(
        fractalRuntime?.modules.some(
          (m: DevtoolsState["runtimes"][number]["modules"][number]) =>
            m.moduleId === "CounterModule",
        ),
      ).toBe(true)
    })
  })
})
