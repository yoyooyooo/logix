import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from "../src/state.js"

describe("@logix/devtools-react · DevtoolsModule state", () => {
  it("toggleOpen action flips the `open` flag in DevtoolsState", async () => {
    const getState = () =>
      devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      )

    const before = getState()
    expect(before.open).toBe(false)

    await devtoolsRuntime.runPromise(
      devtoolsModuleRuntime.dispatch({ _tag: "toggleOpen", payload: undefined }) as Effect.Effect<
        unknown,
        unknown,
        any
      >,
    )

    const after = getState()
    expect(after.open).toBe(true)
  })
})

