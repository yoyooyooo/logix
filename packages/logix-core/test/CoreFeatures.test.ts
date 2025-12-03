import { describe, it, expect } from "vitest"
import { Effect, Schema, Stream, Context, Layer } from "effect"
import * as Logix from "../src/api/Logix.js"
import * as Logic from "../src/api/Logic.js"
import * as Root from "../src/index.js"

describe("Module Core Features", () => {
  const makeCounter = () => {
    const CounterState = Schema.Struct({ count: Schema.Number })
    const CounterActions = {
      increment: Schema.Void,
      decrement: Schema.Void,
      add: Schema.Number,
      reset: Schema.Void,
    }
    return Logix.Module("Counter", {
      state: CounterState,
      actions: CounterActions,
    })
  }

  it("should handle state updates and mutations", async () => {
    const Counter = makeCounter()
    const logic = Counter.logic((api) =>
      Effect.gen(function* (_) {
        yield* Effect.all([
          // Test update
          api.onAction.increment.update((state, _) => ({
            ...state,
            count: state.count + 1,
          })),

          // Test mutate (if supported by runtime, otherwise falls back to update logic)
          api.onAction.decrement.mutate((draft: any) => {
            draft.count -= 1
          })
        ], { concurrency: "unbounded" })

      })
    )

    const originalLive = Counter.live
    const module = Object.assign(Counter, {
      live: (initial: any) => originalLive(initial, logic),
    })

    const program = Effect.gen(function* (_) {
      const context = yield* Counter.live({ count: 0 }, logic).pipe(Layer.build)
      const runtime = Context.get(context, Counter)
      const api = {
        state: runtime.getState,
        dispatch: runtime.dispatch
      }

      // Wait for logic to subscribe
      yield* Effect.sleep(50)

      // Initial
      expect(yield* api.state).toEqual({ count: 0 })

      // Increment (update)
      yield* api.dispatch({ _tag: "increment", payload: undefined })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 1 })

      // Decrement (mutate)
      yield* api.dispatch({ _tag: "decrement", payload: undefined })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 0 })
    })

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )
  })

  it("should handle action dispatching and payloads", async () => {
    const Counter = makeCounter()
    const logic = Counter.logic((api) =>
      Effect.gen(function* (_) {
        yield* Effect.all([
          api.onAction.add.map(a => a.payload).update((state, amount) => ({
            ...state,
            count: state.count + amount,
          })),

          api.onAction.reset.update((state, _) => ({
            ...state,
            count: 0,
          }))
        ], { concurrency: "unbounded" })
      })
    )

    const originalLive = Counter.live
    const program = Effect.gen(function* (_) {
      const context = yield* Counter.live({ count: 0 }, logic).pipe(Layer.build)
      const runtime = Context.get(context, Counter)
      const api = {
        state: runtime.getState,
        dispatch: runtime.dispatch
      }

      // Wait for logic to subscribe
      yield* Effect.sleep(50)

      // Add 10
      yield* api.dispatch({ _tag: "add", payload: 10 })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 10 })

      // Add 5
      yield* api.dispatch({ _tag: "add", payload: 5 })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 15 })

      // Reset
      yield* api.dispatch({ _tag: "reset", payload: undefined })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 0 })
    })

  })

  it("should handle flow operators", async () => {
    // This test verifies that flow operators can be defined,
    // though testing timing-based operators like debounce in unit tests
    // might require TestClock (which we can add later).
    // For now, we test basic filtering and mapping.

    const Counter = makeCounter()
    const logic = Counter.logic((api) =>
      Effect.gen(function* (_) {
        // Filter: only add if amount > 10
        yield* api.flow.fromAction(
            (a): a is { _tag: "add", payload: number } => a._tag === "add"
          )
          .pipe(
            api.flow.filter((a) => a.payload >= 10),
            api.flow.run((a: { _tag: "add", payload: number }) =>
              Logic.secure(
                api.state.update((s) => ({
                  ...s,
                  count: s.count + a.payload,
                })),
                { name: "add" }
              )
            )
          )
      })
    )

    const originalLive = Counter.live
    const module = Object.assign(Counter, {
      live: (initial: any) => originalLive(initial, logic),
    })

    const program = Effect.gen(function* (_) {
      const context = yield* Counter.live({ count: 0 }, logic).pipe(Layer.build)
      const runtime = Context.get(context, Counter)
      const api = {
        state: runtime.getState,
        dispatch: runtime.dispatch
      }

      // Wait for logic to subscribe
      yield* Effect.sleep(50)

      // Add 10 (pass filter)
      yield* api.dispatch({ _tag: "add", payload: 10 })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 10 })

      // Add 20 (pass filter)
      yield* api.dispatch({ _tag: "add", payload: 20 })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 30 })

      // Add 5 (filtered out)
      yield* api.dispatch({ _tag: "add", payload: 5 })
      yield* Effect.sleep(10)
      expect(yield* api.state).toEqual({ count: 30 })
    })

  })
})

describe("Link Composition", () => {
  const ModuleA = Logix.Module("ModuleA", {
    state: Schema.Struct({ val: Schema.String }),
    actions: { update: Schema.String },
  })

  const ModuleB = Logix.Module("ModuleB", {
    state: Schema.Struct({ count: Schema.Number }),
    actions: { inc: Schema.Void },
  })

  it("should allow cross-module communication via Link", async () => {
    // Logic for ModuleA
    const logicA = ModuleA.logic((api) =>
      api.onAction.update.map(a => a.payload).update((s, val) => ({ ...s, val }))
    )

    // Logic for ModuleB
    const logicB = ModuleB.logic((api) =>
      api.onAction.inc.update((s, _) => ({ ...s, count: s.count + 1 }))
    )

    // Link Logic: When ModuleA updates to "increment", trigger ModuleB.inc
    const linkLogic = Root.Link.make(
      {
        modules: [ModuleA, ModuleB] as const,
      },
      ($) =>
        Effect.gen(function* (_) {
          const a = $[ModuleA.id]
          const b = $[ModuleB.id]

          // Listen to actions stream
          yield* a.actions$.pipe(
            Stream.filter(
              (action): action is { _tag: "update"; payload: string } =>
                action._tag === "update",
            ),
            Stream.filter((action) => action.payload === "trigger_b"),
            Stream.runForEach(() =>
              b.dispatch({ _tag: "inc", payload: undefined }),
            ),
          )
        }),
    )

    // Construct App Layer
    // Note: Scenario currently supports single module.
    // For multi-module, we need to construct the runtime manually or extend Scenario.
    // Here we manually verify using Effect.runPromise

    const program = Effect.gen(function* (_) {
      const contextA = yield* ModuleA.live({ val: "init" }, logicA).pipe(Layer.build)
      const runtimeA = Context.get(contextA, ModuleA)

      const contextB = yield* ModuleB.live({ count: 0 }, logicB).pipe(Layer.build)
      const runtimeB = Context.get(contextB, ModuleB)

      // Provide link logic
      yield* linkLogic.pipe(
        Effect.provideService(ModuleA, runtimeA),
        Effect.provideService(ModuleB, runtimeB),
      ).pipe(Effect.fork)

      // Wait for logic to subscribe
      yield* Effect.sleep(50)

      // Verify initial state
      expect(yield* runtimeA.getState).toEqual({ val: "init" })
      expect(yield* runtimeB.getState).toEqual({ count: 0 })

      // Trigger A
      yield* runtimeA.dispatch({ _tag: "update", payload: "trigger_b" })

      // Wait a bit for async stream processing (Link logic)
      yield* Effect.sleep(100)

      // Verify B updated
      expect(yield* runtimeB.getState).toEqual({ count: 1 })
    })

  })
})

describe("RemoteBound useRemote", () => {
  it("should allow using $.useRemote().onState to react to other module state", async () => {
    const Source = Logix.Module("Source", {
      state: Schema.Struct({ lastCount: Schema.Number }),
      actions: {},
    })

    const Target = Logix.Module("TargetRemoteState", {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const targetLogic = Target.logic(($) =>
      $.onAction("inc").update((s, _) => ({ ...s, count: s.count + 1 })),
    )

    const sourceLogic = Source.logic(($) =>
      Effect.gen(function* () {
        const TargetRemote = yield* $.useRemote(Target)

        yield* TargetRemote.onState((s) => s.count).run((count) =>
          $.state.update((prev) => ({ ...prev, lastCount: count })),
        )
      }),
    )

    const program = Effect.gen(function* () {
      const sourceRuntime = yield* Source
      const targetRuntime = yield* Target

      // 等待逻辑订阅完成
      yield* Effect.sleep(50)

      expect(yield* sourceRuntime.getState).toEqual({ lastCount: 0 })
      expect(yield* targetRuntime.getState).toEqual({ count: 0 })

      // 触发 Target 的 inc
      yield* targetRuntime.dispatch({ _tag: "inc", payload: undefined })

      // 等待 cross-module 传播
      yield* Effect.sleep(150)

      expect(yield* targetRuntime.getState).toEqual({ count: 1 })
      expect(yield* sourceRuntime.getState).toEqual({ lastCount: 1 })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Target.live({ count: 0 }, targetLogic),
          // 注意：Target 需要先于 Source 挂载，
          // 以保证 $.useRemote(Target) 在 Logic 启动时可以拿到 Runtime。
          Source.live({ lastCount: 0 }, sourceLogic),
        ),
      ),
    )

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )
  })

  it("should allow using $.useRemote().onAction to react to other module actions", async () => {
    const Logger = Logix.Module("Logger", {
      state: Schema.Struct({ logs: Schema.Array(Schema.String) }),
      actions: {},
    })

    const Counter = Logix.Module("RemoteCounter", {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const counterLogic = Counter.logic(($) =>
      $.onAction("inc").update((s, _) => ({ ...s, count: s.count + 1 })),
    )

    const loggerLogic = Logger.logic(($) =>
      Effect.gen(function* () {
        const RemoteCounter = yield* $.useRemote(Counter)

        yield* RemoteCounter.onAction("inc").run(() =>
          $.state.update((s) => ({
            ...s,
            logs: [...s.logs, "counter/inc"],
          })),
        )
      }),
    )

    const program = Effect.gen(function* () {
      const loggerRuntime = yield* Logger
      const counterRuntime = yield* Counter

      // 等待逻辑订阅完成
      yield* Effect.sleep(50)

      expect(yield* loggerRuntime.getState).toEqual({ logs: [] })
      expect(yield* counterRuntime.getState).toEqual({ count: 0 })

      // 触发 Counter 的 inc
      yield* counterRuntime.dispatch({ _tag: "inc", payload: undefined })

      // 等待 cross-module 传播
      yield* Effect.sleep(150)

      expect(yield* counterRuntime.getState).toEqual({ count: 1 })
      expect(yield* loggerRuntime.getState).toEqual({
        logs: ["counter/inc"],
      })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Counter.live({ count: 0 }, counterLogic),
          // 同上：先挂载 Counter，保证 Logger.useRemote(Counter) 可用。
          Logger.live({ logs: [] }, loggerLogic),
        ),
      ),
    )

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )
  })

  it("should support Flow operators on $.useRemote() streams", async () => {
    const Source = Logix.Module("FlowSource", {
      state: Schema.Struct({ sum: Schema.Number }),
      actions: {},
    })

    const Target = Logix.Module("FlowTarget", {
      state: Schema.Struct({}),
      actions: { add: Schema.Number },
    })

    const targetLogic = Target.logic(($) =>
      $.onAction("add").run(
        () =>
          Logic.secure(
            Effect.void as Logic.Of<typeof Target["shape"], never, void, never>,
            { name: "noop" },
          ),
      ),
    )

    const sourceLogic = Source.logic(($) =>
      Effect.gen(function* () {
        const TargetRemote = yield* $.useRemote(Target)

        yield* TargetRemote.onAction("add")
          .filter((a) => a.payload > 0)
          .run((a) =>
            $.state.update((s) => ({
              ...s,
              sum: s.sum + a.payload,
            })),
          )
      }),
    )

    const program = Effect.gen(function* () {
      const sourceRuntime = yield* Source
      const targetRuntime = yield* Target

      // 等待逻辑订阅完成
      yield* Effect.sleep(50)
      expect(yield* sourceRuntime.getState).toEqual({ sum: 0 })

      // add 正数：应累加
      yield* targetRuntime.dispatch({ _tag: "add", payload: 3 })
      // add 负数：应被 filter 掉
      yield* targetRuntime.dispatch({ _tag: "add", payload: -5 })

      // 等待 cross-module 传播
      yield* Effect.sleep(150)

      expect(yield* sourceRuntime.getState).toEqual({ sum: 3 })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Target.live({}, targetLogic),
          // 先挂 Target，再挂 Source，保证 $.useRemote(Target) 能拿到 Runtime。
          Source.live({ sum: 0 }, sourceLogic),
        ),
      ),
    )

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, never, never>,
    )
  })
})

describe("$.use + ModuleHandle (low-level cross-module access)", () => {
  /**
   * 说明：
   * - 这是基于底层 ModuleHandle 的跨模块访问示例；
   * - 业务代码推荐使用 $.useRemote(Module) + RemoteBoundApi，$.use 主要保留给内核 / Pattern 使用。
   */

  // 1. Define Source Module
  const SourceModule = Logix.Module("Source", {
    state: Schema.Struct({
      value: Schema.Number,
    }),
    actions: {
      update: Schema.Number,
    },
  })

  const SourceLogic = SourceModule.logic(($) =>
    Effect.gen(function* () {
      yield* $.onAction(
        (a): a is { _tag: "update"; payload: number } => a._tag === "update",
      ).update((s, { payload }) => ({ ...s, value: payload }))
    }),
  )

  // 2. Define Consumer Module
  const ConsumerModule = Logix.Module("Consumer", {
    state: Schema.Struct({
      received: Schema.Number,
    }),
    actions: {},
  })

  const ConsumerLogic = ConsumerModule.logic(($) =>
    Effect.gen(function* () {
      // 使用底层 $.use 拿到底层 ModuleHandle
      const $Source = yield* $.use(SourceModule)

      // 直接用 ModuleHandle.changes 作为源流，交给当前模块的 $ 来消费
      yield* $.on($Source.changes((s) => s.value)).update((s, value) => ({
        ...s,
        received: value,
      }))
    }),
  )

  it("should allow one module to listen to another via $.use + ModuleHandle", async () => {
    const program = Effect.gen(function* () {
      const source = yield* SourceModule
      const consumer = yield* ConsumerModule

      // 初始状态
      expect((yield* consumer.getState).received).toBe(0)

      // 等待逻辑启动
      yield* Effect.sleep(50)

      // 更新 source
      yield* source.dispatch({ _tag: "update", payload: 42 })

      // 等待跨模块传播
      yield* Effect.sleep(100)

      // 先验证 Source 更新
      expect((yield* source.getState).value).toBe(42)

      // 再验证 Consumer 已收到更新
      expect((yield* consumer.getState).received).toBe(42)
    })

    const SourceLive = SourceModule.live({ value: 0 }, SourceLogic)
    const ConsumerLive = ConsumerModule.live({ received: 0 }, ConsumerLogic)

    // Compose layers
    const MainLayer = Layer.mergeAll(SourceLive, ConsumerLive)

    await Effect.runPromise(
      program.pipe(
        Effect.provide(MainLayer),
      ) as unknown as Effect.Effect<void, never, never>,
    )
  })
})
