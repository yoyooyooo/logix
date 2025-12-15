import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"
import { buildDependencyGraph } from "../src/internal/state-trait/graph.js"
import { reverseClosure } from "../src/internal/state-trait/reverse-closure.js"

describe("StateTrait scoped validate · ReverseClosure", () => {
  it.scoped("includes all downstream dependents for a target field", () =>
    Effect.sync(() => {
      const StateSchema = Schema.Struct({
        age: Schema.Number,
        isAdult: Schema.Boolean,
        signUpPermission: Schema.Boolean,
      })

      type State = Schema.Schema.Type<typeof StateSchema>

      const traits = Logix.StateTrait.from(StateSchema)({
        isAdult: Logix.StateTrait.computed({
          deps: ["age"],
          get: (s: Readonly<State>) => s.age >= 18,
        }),
        signUpPermission: Logix.StateTrait.computed({
          deps: ["isAdult"],
          get: (s: Readonly<State>) => s.isAdult,
        }),
        $root: Logix.StateTrait.node({
          check: {
            canSignUp: {
              deps: ["signUpPermission"],
              validate: (_input: unknown) => _input,
            },
          },
        }),
      })

      const program = Logix.StateTrait.build(StateSchema, traits)
      const graph = buildDependencyGraph(program)

      expect(Array.from(reverseClosure(graph, "age")).sort()).toEqual(
        ["$root", "age", "isAdult", "signUpPermission"].sort(),
      )

      expect(Array.from(reverseClosure(graph, "isAdult")).sort()).toEqual(
        ["$root", "isAdult", "signUpPermission"].sort(),
      )
    }),
  )
})

describe("StateTrait scoped validate · writeback", () => {
  it.scoped("writes check result into state.errors with ReverseClosure minimal set", () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({
        age: Schema.Number,
        isAdult: Schema.Boolean,
        signUpPermission: Schema.Boolean,
        name: Schema.String,
        errors: Schema.Any,
      })

      const Actions = {
        setAge: Schema.Struct({ age: Schema.Number }),
        validateAge: Schema.Void,
      }

      const M = Logix.Module.make("ScopedValidateWriteback", {
        state: StateSchema,
        actions: Actions,
        reducers: {
          setAge: (s: any, a: any) => ({ ...s, age: a.payload.age }),
          validateAge: (s: any) => s,
        },
        traits: Logix.StateTrait.from(StateSchema)({
          isAdult: Logix.StateTrait.computed({
            deps: ["age"],
            get: (s: any) => s.age >= 18,
          }),
          signUpPermission: Logix.StateTrait.computed({
            deps: ["isAdult"],
            get: (s: any) => s.isAdult,
          }),
          $root: Logix.StateTrait.node({
            check: {
              canSignUp: {
                deps: ["signUpPermission"],
                validate: (input: any) =>
                  input && input.signUpPermission ? undefined : "forbidden",
              },
            },
          }),
          name: Logix.StateTrait.node({
            check: {
              required: {
                deps: ["name"],
                validate: () => "required",
              },
            },
          }),
        }),
      })

      const ValidateLogic = M.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction("validateAge").run(() =>
            Logix.TraitLifecycle.scopedValidate($ as any, {
              mode: "manual",
              target: Logix.TraitLifecycle.Ref.field("age"),
            }),
          )
        }),
      )

      const impl = M.implement({
        initial: {
          age: 10,
          isAdult: false,
          signUpPermission: false,
          name: "",
          errors: { name: "preset" },
        } as any,
        logics: [ValidateLogic],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M

        // 先更新 age（单笔事务内 converge 生成最新派生）。
        yield* rt.dispatch({ _tag: "setAge", payload: { age: 10 } } as any)

        // 再触发 scoped validate（在 watcher 事务内写回 errors）。
        yield* rt.dispatch({ _tag: "validateAge", payload: undefined } as any)
        yield* Effect.sleep("10 millis")

        const state1: any = yield* rt.getState
        expect(state1.errors.name).toBe("preset")
        expect(state1.errors.$root).toBe("forbidden")

        // age 变为成人后再次校验，应清空 signUpPermission 的错误。
        yield* rt.dispatch({ _tag: "setAge", payload: { age: 20 } } as any)
        yield* rt.dispatch({ _tag: "validateAge", payload: undefined } as any)
        yield* Effect.sleep("10 millis")

        const state2: any = yield* rt.getState
        expect(state2.signUpPermission).toBe(true)
        expect(state2.errors.$root).toBeUndefined()
        expect(state2.errors.name).toBe("preset")
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )
})
