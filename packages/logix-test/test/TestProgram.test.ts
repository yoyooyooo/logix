import { describe, it, expect } from "vitest"
import { Effect, Layer, Schema, Stream } from "effect"
import * as Logix from "@logix/core"
import { TestProgram, Execution, runTest } from "../src/index.js"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const CounterLogic = Counter.logic((api) =>
  Effect.gen(function* () {
    yield* api.onAction("increment").run(() =>
      api.state.update((s) => ({ ...s, count: s.count + 1 })),
    )
  }),
)

describe("TestProgram", () => {
  it("should run single-module scenario", async () => {
    const scenario = TestProgram.make({
      main: {
        module: Counter,
        initial: { count: 0 },
        logics: [CounterLogic],
      },
    })

    const program = scenario.run((api) =>
      Effect.gen(function* () {
        yield* api.dispatch({ _tag: "increment", payload: undefined })
        // 使用带 options 的自动重试断言，验证类型与选项透传
        yield* api.assert.state((s) => s.count === 1, { maxAttempts: 5 })
        // 使用 signal 断言，验证动作信号收集逻辑
        yield* api.assert.signal("increment")
      }),
    )

    const result = await runTest(program)
    expect(result.state).toEqual({ count: 1 })
    Execution.expectActionTag(result, "increment")
    Execution.expectNoError(result)
  })

  it("should support forked onAction watchers inside a single Logic", async () => {
    const ForkCounterLogic = Counter.logic(($) =>
      Effect.gen(function* () {
        // fork 增加监听
        yield* Effect.fork(
          $.onAction("increment").run(() =>
            $.state.update((s) => ({ ...s, count: s.count + 1 })),
          ),
        )

        // fork 减少监听
        yield* Effect.fork(
          $.onAction("decrement").run(() =>
            $.state.update((s) => ({ ...s, count: s.count - 1 })),
          ),
        )
      }),
    )

    const scenario = TestProgram.make({
      main: {
        module: Counter,
        initial: { count: 0 },
        logics: [ForkCounterLogic],
      },
    })

    const program = scenario.run((api) =>
      Effect.gen(function* () {
        yield* api.dispatch({ _tag: "increment", payload: undefined })
        yield* api.dispatch({ _tag: "decrement", payload: undefined })
        yield* api.assert.state((s) => s.count === 0)
      }),
    )

    const result = await runTest(program)
    expect(result.state.count).toBe(0)
  })

  it("should support runFork watchers on a single Logic", async () => {
    const RunForkCounterLogic = Counter.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction("increment").runParallelFork(
          $.state.update((s) => ({ ...s, count: s.count + 1 })),
        )

        yield* $.onAction("decrement").runParallelFork(
          $.state.update((s) => ({ ...s, count: s.count - 1 })),
        )
      }),
    )

    const scenario = TestProgram.make({
      main: {
        module: Counter,
        initial: { count: 0 },
        logics: [RunForkCounterLogic],
      },
    })

    const program = scenario.run((api) =>
      Effect.gen(function* () {
        yield* api.dispatch({ _tag: "increment", payload: undefined })
        yield* api.dispatch({ _tag: "decrement", payload: undefined })
        yield* api.assert.state((s) => s.count === 0)
      }),
    )

    const result = await runTest(program)
    expect(result.state.count).toBe(0)
  })

  it("should run multi-module link scenario", async () => {
    const User = Logix.Module.make("User", {
      state: Schema.Struct({ name: Schema.String }),
      actions: {
        updateName: Schema.String,
      },
    })

    const UserLogic = User.logic((api) =>
      Effect.gen(function* () {
        yield* api.onAction("updateName").update((s, a) => ({
          ...s,
          name: a.payload,
        }))
      }),
    )

    const Auth = Logix.Module.make("Auth", {
      state: Schema.Struct({ loggedIn: Schema.Boolean }),
      actions: {
        login: Schema.Void,
        logout: Schema.Void,
      },
    })

    const AuthLogic = Auth.logic((api) =>
      Effect.gen(function* () {
        yield* Effect.all(
          [
            api.onAction("login").update((s) => ({ ...s, loggedIn: true })),
            api.onAction("logout").update((s) => ({ ...s, loggedIn: false })),
          ],
          { concurrency: "unbounded" },
        )
      }),
    )

    const LinkLogic = Logix.Link.make(
      {
        modules: [User, Auth] as const,
      },
      ($) =>
        Effect.gen(function* () {
          const userHandle = $[User.id]
          const authHandle = $[Auth.id]

          // 当 User 名称为 "clear" 时，触发 Auth 登录/登出，再将 User 名称置空
          yield* userHandle.actions$.pipe(
            Stream.runForEach((action) =>
              Effect.gen(function* () {
                if (action._tag === "updateName" && action.payload === "clear") {
                  yield* authHandle.dispatch({
                    _tag: "login",
                    payload: undefined,
                  })
                  yield* authHandle.dispatch({
                    _tag: "logout",
                    payload: undefined,
                  })
                }
              }),
            ),
            Effect.forkScoped,
          )

          yield* authHandle.actions$.pipe(
            Stream.runForEach((action) =>
              Effect.gen(function* () {
                if (action._tag === "logout") {
                  yield* userHandle.dispatch({
                    _tag: "updateName",
                    payload: "",
                  })
                }
              }),
            ),
            Effect.forkScoped,
          )
        }),
    )

    const linkLayer: Layer.Layer<any, any, any> = Layer.scopedDiscard(LinkLogic) as unknown as Layer.Layer<
      any,
      any,
      any
    >

    const scenario = TestProgram.make({
      main: {
        module: User,
        initial: { name: "Alice" },
        logics: [UserLogic],
      },
      modules: [
        {
          module: Auth,
          initial: { loggedIn: true },
          logics: [AuthLogic],
        },
      ],
      layers: [linkLayer],
    })

    const program = scenario.run((api) =>
      Effect.gen(function* () {
        yield* api.dispatch({ _tag: "updateName", payload: "clear" })
        yield* api.assert.state((s) => s.name === "")
      }),
    )

    const result = await runTest(program)
    expect(result.state).toEqual({ name: "" })
    // 应至少包含一次 updateName(clear) 和一次 updateName("")，且无错误
    Execution.expectActionTag(result, "updateName")
    Execution.expectNoError(result)
  })
})
