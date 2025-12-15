import { describe, it, expect } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"
import * as Debug from "../src/Debug.js"

describe("StateTrait converge budget config", () => {
  it.scoped("uses Runtime.stateTransaction.traitConvergeBudgetMs as budgetMs", () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        base: Schema.Number,
        derived: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = { bump: Schema.Void }

      const M = Logix.Module.make("StateTraitConvergeBudgetConfig", {
        state: State,
        actions: Actions,
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
            draft.base += 1
          }),
        },
        traits: Logix.StateTrait.from(State)({
          derived: Logix.StateTrait.computed({
            deps: ["base"],
            get: (s: Readonly<S>) => s.base + 1,
          }),
        }),
      })

      const impl = M.implement({
        initial: { base: 0, derived: 0 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(32)

      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: { traitConvergeBudgetMs: 123 },
        layer: Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M
        yield* rt.dispatch({ _tag: "bump", payload: undefined } as any)

        const updates = ring
          .getSnapshot()
          .filter((e) => e.type === "state:update" && (e as any).txnId) as ReadonlyArray<any>

        expect(updates.length).toBeGreaterThan(0)

        const last = updates[updates.length - 1]
        expect(last?.traitSummary?.converge?.budgetMs).toBe(123)
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )
})

