import { describe, it, expect } from "@effect/vitest"
import { Effect, Schema } from "effect"
import * as Logix from "../src/index.js"
import * as ModuleRuntimeImpl from "../src/internal/runtime/ModuleRuntime.js"
import * as BoundApiRuntime from "../src/internal/runtime/BoundApiRuntime.js"

describe("StateTrait.install (with ModuleRuntime)", () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    source: Schema.Struct({
      name: Schema.String,
    }),
    target: Schema.String,
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  it("should recompute computed fields when state changes", async () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      sum: Logix.StateTrait.computed((s: Readonly<State>) => s.a + s.b),
    })

    const program = Logix.StateTrait.build(StateSchema, traits)

    const testEffect = Effect.gen(function* () {
      // 构造最小 ModuleRuntime（仅依赖内存状态），不通过 Module 实现 Trait 自动接线。
      type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const initial: State = {
        a: 1,
        b: 2,
        sum: 0,
        source: { name: "Alice" },
        target: "",
      }

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: "StateTraitInstallTest",
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          // ActionSchema 在本测试中不会被使用，这里用占位 Schema 以满足类型要求。
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          // 确保 onState 可在当前 Phase 内使用。
          getPhase: () => "run",
          moduleId: "StateTraitInstallTest",
        },
      )

      // 安装 StateTrait Program 行为
      yield* Logix.StateTrait.install(
        bound as any,
        program,
      )

      // 更新基础字段 a/b，应触发 sum 的重算
      let state = (yield* runtime.getState) as State
      state = {
        ...state,
        a: 10,
        b: 5,
      }
      yield* runtime.setState(state)

      // 等待 watcher 消化这次状态变更
      yield* Effect.sleep("10 millis")

      const after = (yield* runtime.getState) as State
      expect(after.sum).toBe(15)
    })

    await Effect.runPromise(
      Effect.scoped(testEffect) as Effect.Effect<void, never, never>,
    )
  })
})
