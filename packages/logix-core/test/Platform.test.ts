import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"

const TestModule = Logix.Module.make("PlatformTest", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

describe("Platform integration (public API)", () => {
  it("should execute lifecycle effects as no-ops when Platform service is missing", async () => {
    const calls: Array<string> = []

    const logic = TestModule.logic(($) =>
      Effect.gen(function* () {
        yield* $.lifecycle.onSuspend(
          Effect.sync(() => {
            calls.push("suspend")
          }),
        )
        yield* $.lifecycle.onResume(
          Effect.sync(() => {
            calls.push("resume")
          }),
        )
        yield* $.lifecycle.onReset(
          Effect.sync(() => {
            calls.push("reset")
          }),
        )
      }),
    )

    const layer = TestModule.live(
      { count: 0 },
      logic,
    ) as unknown as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const program = Effect.gen(function* () {
      // 触发 ModuleRuntime 初始化与逻辑注册
      yield* TestModule
      yield* Effect.sleep("10 millis")
    }).pipe(
      Effect.provide(layer),
    )

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )

    expect(calls).toEqual([])
  })

  it("should use NoopPlatformLayer and drop lifecycle effects", async () => {
    const calls: Array<string> = []

    const logic = TestModule.logic(($) =>
      Effect.gen(function* () {
        yield* $.lifecycle.onSuspend(
          Effect.sync(() => {
            calls.push("suspend")
          }),
        )
        yield* $.lifecycle.onResume(
          Effect.sync(() => {
            calls.push("resume")
          }),
        )
        yield* $.lifecycle.onReset(
          Effect.sync(() => {
            calls.push("reset")
          }),
        )
      }),
    )

    const baseLayer = TestModule.live(
      { count: 0 },
      logic,
    ) as unknown as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const layer = Layer.mergeAll(
      Logix.Platform.NoopPlatformLayer,
      baseLayer,
    ) as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const program = Effect.gen(function* () {
      yield* TestModule
      yield* Effect.sleep("10 millis")
    }).pipe(
      Effect.provide(layer),
    )

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )

    expect(calls).toEqual([])
  })

  it("should allow injecting custom Platform implementation via Platform.tag", async () => {
    const calls: Array<string> = []

    class TestPlatform implements Logix.Platform.Service {
      readonly lifecycle = {
        onSuspend: (eff: Effect.Effect<void, never, any>) =>
          eff.pipe(
            Effect.zipRight(
              Effect.sync(() => {
                calls.push("suspend")
              }),
            ),
          ),
        onResume: (eff: Effect.Effect<void, never, any>) =>
          eff.pipe(
            Effect.zipRight(
              Effect.sync(() => {
                calls.push("resume")
              }),
            ),
          ),
        onReset: (eff: Effect.Effect<void, never, any>) =>
          eff.pipe(
            Effect.zipRight(
              Effect.sync(() => {
                calls.push("reset")
              }),
            ),
          ),
      }
    }

    const logic = TestModule.logic(($) =>
      Effect.gen(function* () {
        yield* $.lifecycle.onSuspend(Effect.void)
        yield* $.lifecycle.onResume(Effect.void)
        yield* $.lifecycle.onReset(Effect.void)
      }),
    )

    const baseLayer = TestModule.live(
      { count: 0 },
      logic,
    ) as unknown as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const platformLayer = Layer.succeed(
      Logix.Platform.tag,
      new TestPlatform(),
    )

    const layer = baseLayer.pipe(
      Layer.provide(platformLayer),
    ) as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const program = Effect.gen(function* () {
      yield* TestModule
      yield* Effect.sleep("10 millis")
    }).pipe(
      Effect.provide(layer),
    )

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )

    expect(calls).toEqual(["suspend", "resume", "reset"])
  })

  it("should expose defaultLayer as alias of NoopPlatformLayer", () => {
    expect(Logix.Platform.defaultLayer).toBe(
      Logix.Platform.NoopPlatformLayer,
    )
  })
})
