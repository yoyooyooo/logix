import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as Logix from "../src/index.js"

describe("DevtoolsHub (core)", () => {
  it.effect("devtoolsHubLayer should append hub sink and collect events into snapshot", () =>
    Effect.gen(function* () {
      const collected: Logix.Debug.Event[] = []
      const userSink: Logix.Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            collected.push(event)
          }),
      }

      const layer = Logix.Debug.devtoolsHubLayer(
        Logix.Debug.replace([userSink]),
        { bufferSize: 10 },
      ) as Layer.Layer<any, never, never>

      // 记录几类不同事件
      yield* Logix.Debug.record({
        type: "module:init",
        moduleId: "A",
        runtimeId: "r-1",
        runtimeLabel: "R",
      }).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: "action:dispatch",
        moduleId: "A",
        action: { _tag: "inc", payload: undefined },
        runtimeId: "r-1",
        txnId: "t-1",
        runtimeLabel: "R",
      }).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: "state:update",
        moduleId: "A",
        state: { count: 1 },
        runtimeId: "r-1",
        txnId: "t-1",
        runtimeLabel: "R",
      }).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: "trace:foo",
        moduleId: "A",
        data: { x: 1 },
        runtimeId: "r-1",
        runtimeLabel: "R",
      }).pipe(Effect.provide(layer))

      // Hub snapshot 为全局单例，断言至少包含本次事件与派生视图。
      const snapshot = Logix.Debug.getDevtoolsSnapshot()
      expect(snapshot.events.length).toBeGreaterThanOrEqual(4)
      expect(snapshot.instances.get("R::A") ?? 0).toBeGreaterThanOrEqual(1)
      expect(snapshot.latestStates.get("R::A::r-1")).toEqual({ count: 1 })

      // appendSinks 不应覆盖调用方已有 sinks
      expect(collected).toHaveLength(4)
    }),
  )

  it.effect("clearDevtoolsEvents should only clear hub ring buffer", () =>
    Effect.gen(function* () {
      const layer = Logix.Debug.devtoolsHubLayer({ bufferSize: 5 }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: "trace:test",
        moduleId: "B",
        runtimeId: "r-2",
        runtimeLabel: "R",
      }).pipe(Effect.provide(layer))

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBeGreaterThan(0)

      Logix.Debug.clearDevtoolsEvents()

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
    }),
  )
})
