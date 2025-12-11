import { describe, it, expect } from "vitest"
import { Effect, Layer, ManagedRuntime, Schema } from "effect"
import * as Logix from "@logix/core"
import { ReactPlatformLayer } from "../../src/platform/ReactPlatformLayer.js"

describe("ReactPlatformLayer lifecycle integration", () => {
  const LifecycleModule = Logix.Module.make("LifecycleModule", {
    state: Schema.Struct({
      suspendCount: Schema.Number,
      resumeCount: Schema.Number,
    }),
    actions: {},
  })

  it("should trigger $.lifecycle.onSuspend/onResume via ReactPlatformLayer emit* helpers", async () => {
    const moduleLayer = LifecycleModule.live(
      { suspendCount: 0, resumeCount: 0 },
      // 生命周期逻辑在测试用例中通过 Bound API 显式注册，避免对 Layer 构建顺序产生依赖
      Effect.void,
    )

    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        ReactPlatformLayer as Layer.Layer<any, never, never>,
        moduleLayer as Layer.Layer<any, never, never>,
      ),
    )

    // 先确保 ModuleRuntime 与 Logic 已经启动并完成 lifecycle hook 注册，
    // 再通过 ReactPlatformLayer 的 emit* 触发平台级生命周期。
    const program = Effect.gen(function* () {
      const module = yield* LifecycleModule

      // 使用 Bound API 在 Platform 已经就绪的环境中注册生命周期回调
      const $ = Logix.Bound.make(LifecycleModule.shape, module)

      yield* $.lifecycle.onSuspend(
        $.state.update((s) => ({
          ...s,
          suspendCount: s.suspendCount + 1,
        })),
      )

      yield* $.lifecycle.onResume(
        $.state.update((s) => ({
          ...s,
          resumeCount: s.resumeCount + 1,
        })),
      )

      // 等待一小段时间让 forkScoped 的逻辑跑到 $.lifecycle 注册。
      yield* Effect.sleep("10 millis")

      const platform = yield* Logix.Platform.tag
      // emitSuspend/emitResume 是 ReactPlatformImpl 的扩展方法，不在正式接口中暴露，
      // 这里只在测试中以 any 形式调用，验证链路打通。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const impl = platform as any
      if (typeof impl.emitSuspend === "function") {
        yield* impl.emitSuspend()
      }
      if (typeof impl.emitResume === "function") {
        yield* impl.emitResume()
      }
    })

    await runtime.runPromise(
      program as Effect.Effect<
        void,
        unknown,
        Logix.ModuleRuntime<
          { readonly suspendCount: number; readonly resumeCount: number },
          never
        > | Logix.Logic.Platform
      >,
    )

    const finalState = await runtime.runPromise(
      Effect.gen(function* () {
        const module = yield* LifecycleModule
        return yield* module.getState
      }),
    )

    expect(finalState.suspendCount).toBe(1)
    expect(finalState.resumeCount).toBe(1)
  })
})
