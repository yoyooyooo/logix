import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Effect, Schema, Layer } from "effect"
import * as Logix from "../src/index.js"

const State = Schema.Struct({ n: Schema.Number })
const Actions = { bump: Schema.Void }

const Mod = Logix.Module.make("RuntimeDevtoolsRoot", {
  state: State,
  actions: Actions,
  reducers: {
    bump: Logix.Module.Reducer.mutate((draft: any) => {
      draft.n += 1
    }),
  },
})

const Impl = Mod.implement({
  initial: { n: 0 },
})

describe("Runtime.make · devtools option", () => {
  it.scoped("should enable DevtoolsHub + DebugObserver even when isDevEnv() = false", () =>
    Effect.gen(function* () {
      const prevEnv = process.env.NODE_ENV
      process.env.NODE_ENV = "production"

      try {
        // 清理 ring buffer，避免受其他测试干扰
        Logix.Debug.clearDevtoolsEvents()

        const runtimeLabel = "ProdDevtoolsRuntime"

        const runtime = Logix.Runtime.make(Impl, {
          label: runtimeLabel,
          devtools: true,
        })

        const program = Effect.gen(function* () {
          const rt = yield* Mod
          yield* rt.dispatch({ _tag: "bump", payload: undefined })
          yield* Effect.sleep("10 millis")
        })

        yield* Effect.promise(() =>
          runtime.runPromise(program as Effect.Effect<void, never, any>),
        )

        const snapshot = Logix.Debug.getDevtoolsSnapshot()

        const byLabel = snapshot.events.filter(
          (e) => (e as any).runtimeLabel === runtimeLabel,
        )

        expect(byLabel.length).toBeGreaterThan(0)
        expect(
          byLabel.some((e) => typeof e.type === "string" && e.type === "trace:effectop"),
        ).toBe(true)
      } finally {
        process.env.NODE_ENV = prevEnv
      }
    }),
  )

  it.effect("devtools option should not override existing Debug sinks", () =>
    Effect.gen(function* () {
      const received: Logix.Debug.Event[] = []
      const userSink: Logix.Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            received.push(event)
          }),
      }

      const userLayer = Logix.Debug.replace([userSink]) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(Impl, {
        layer: userLayer,
        devtools: true,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Mod
        yield* rt.dispatch({ _tag: "bump", payload: undefined })
        yield* Effect.sleep("10 millis")
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )

      // 用户 sinks 应仍能收到事件（append 语义）。
      expect(received.length).toBeGreaterThan(0)
      // Hub 仍然在全局 side 记录事件窗口。
      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBeGreaterThan(0)
    }),
  )
})

