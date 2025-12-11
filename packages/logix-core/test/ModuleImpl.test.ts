import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Context, Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"

/**
 * ModuleImpl / withLayer / provide(ModuleImpl) 行为验证：
 * - Module.implement(initial, logics) 返回的 ModuleImpl 应该能通过 withLayer 注入额外依赖；
 * - Logix.provide(ModuleImpl) 应等价于针对 module + layer 的显式 provide。
 */

const ServiceTag = Context.GenericTag<{ label: string }>(
  "@logix/test/Service",
)

const Consumer = Logix.Module.make("ModuleImplConsumer", {
  state: Schema.Struct({
    seen: Schema.String,
  }),
  actions: {
    read: Schema.Void,
  },
})

const consumerLogic = Consumer.logic<{ label: string }>(($) =>
  Effect.gen(function* () {
    const svc = yield* ServiceTag

    yield* $.onAction("read").run(() =>
      $.state.update((s) => ({
        ...s,
        seen: svc.label,
      })),
    )
  }),
)

describe("ModuleImpl (public API)", () => {
  it("withLayer should inject extra dependencies into ModuleImpl.layer", async () => {
    const impl = Consumer.implement({
      initial: { seen: "" },
      logics: [consumerLogic],
    })

    const implWithLayer = impl.withLayer(
      Layer.succeed(
        ServiceTag as unknown as Context.Tag<any, { label: string }>,
        {
          label: "hello",
        },
      ),
    )

    const events: Logix.Debug.Event[] = []
    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
            if (event.type === "lifecycle:error") {
              // 在测试输出中打印错误原因，便于调试
              // eslint-disable-next-line no-console
              console.error("[ModuleImpl lifecycle:error]", event.cause)
            }
          }),
      },
    ])

    const program = Effect.gen(function* () {
      const context = yield* implWithLayer.layer.pipe(Layer.build)
      const runtime = Context.get(context, Consumer)

      // 确认 Service 已经通过 withLayer 正确注入到 Context 中
      const svc = Context.get(
        context,
        ServiceTag as unknown as Context.Tag<any, { label: string }>,
      )
      expect(svc.label).toBe("hello")

      expect(yield* runtime.getState).toEqual({ seen: "" })

      yield* runtime.dispatch({ _tag: "read", payload: undefined })
      // 等待 watcher 消化 action
      yield* Effect.sleep(20)

      expect(yield* runtime.getState).toEqual({ seen: "hello" })
    })

    await Effect.runPromise(
      Effect.scoped(program).pipe(Effect.provide(debugLayer)) as Effect.Effect<
        void,
        never,
        never
      >,
    )

    // 确认逻辑执行过程中没有生命周期错误
    expect(events.find((e) => e.type === "lifecycle:error")).toBeUndefined()
  })

  it("Module.implement(imports) should inject service layers into ModuleImpl.layer", async () => {
    const impl = Consumer.implement({
      initial: { seen: "" },
      logics: [consumerLogic],
      imports: [
        Layer.succeed(
          ServiceTag as unknown as Context.Tag<any, { label: string }>,
          { label: "from-import" },
        ),
      ],
    })

    const program = Effect.gen(function* () {
      const context = yield* impl.layer.pipe(Layer.build)
      const runtime = Context.get(context, Consumer)

      // imports 提供的 ServiceTag 应该在 Context 中可见
      const svc = Context.get(
        context,
        ServiceTag as unknown as Context.Tag<any, { label: string }>,
      )
      expect(svc.label).toBe("from-import")

      expect(yield* runtime.getState).toEqual({ seen: "" })

      yield* runtime.dispatch({ _tag: "read", payload: undefined })
      yield* Effect.sleep(20)

      expect(yield* runtime.getState).toEqual({ seen: "from-import" })
    })

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )
  })

  it("Module.implement(imports) should allow importing other ModuleImpl layers", async () => {
    // 定义一个简单的依赖模块，用于验证 imports: [ModuleImpl] 行为
    const Dep = Logix.Module.make("DepModule", {
      state: Schema.Struct({ value: Schema.String }),
      actions: {},
    })

    const depImpl = Dep.implement({
      initial: { value: "dep-initial" },
      logics: [],
    })

    const impl = Consumer.implement({
      initial: { seen: "" },
      logics: [consumerLogic],
      imports: [depImpl],
    })

    const program = Effect.gen(function* () {
      const context = yield* impl.layer.pipe(Layer.build)
      const runtime = Context.get(context, Consumer)

      // Dep 的 ModuleRuntime 应该已经挂在 Context 上
      const depRuntime = Context.get(context, Dep)
      expect(yield* depRuntime.getState).toEqual({ value: "dep-initial" })

      // 同时 ServiceTag 仍然可以通过 withLayer/withLayers 等方式叠加，这里只是验证 imports 不破坏主模块行为
      expect(yield* runtime.getState).toEqual({ seen: "" })
    })

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )
  })
})
