import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as Logix from "@logix/core"
import { TestProgram, TestRuntime, Execution } from "@logix/test"

import { CounterModule, CounterLogic } from "../src/modules/counter"
import {
  CounterMultiModule,
  CounterMultiLogic,
} from "../src/modules/counterMulti"
import {
  StepCounterModule,
  StepCounterLogic,
} from "../src/modules/stepCounter"

describe("examples/logix-react · module flows (integration)", () => {
  it.scoped("CounterModule + CounterLogic · inc / dec sequence", () =>
    TestProgram.make({
      main: {
        module: CounterModule,
        initial: { value: 0 },
        logics: [CounterLogic],
      },
    })
      .run(($) =>
        Effect.gen(function* () {
          yield* $.dispatch({ _tag: "inc", payload: undefined })
          yield* $.dispatch({ _tag: "inc", payload: undefined })
          yield* $.dispatch({ _tag: "dec", payload: undefined })

          yield* $.assert.state((s) => s.value === 1)
        }),
      )
      .pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            Execution.expectActionTag(result, "inc")
            Execution.expectActionTag(result, "dec", { times: 1 })
            Execution.expectNoError(result)
            expect(result.state.value).toBe(1)
          }),
        ),
      ),
  )

  it.scoped("CounterMultiModule · multiple increments", () =>
    TestProgram.make({
      main: {
        module: CounterMultiModule,
        initial: { count: 0 },
        logics: [CounterMultiLogic],
      },
    })
      .run(($) =>
        Effect.gen(function* () {
          yield* $.dispatch({ _tag: "increment", payload: undefined })
          yield* $.dispatch({ _tag: "increment", payload: undefined })

          yield* $.assert.state((s) => s.count === 2)
        }),
      )
      .pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            Execution.expectActionTag(result, "increment")
            Execution.expectNoError(result)
            expect(result.state.count).toBe(2)
          }),
        ),
      ),
  )

  it.scoped("StepCounterModule · inc once", () =>
    TestProgram.make({
      main: {
        module: StepCounterModule,
        initial: { value: 0 },
        logics: [StepCounterLogic],
      },
    })
      .run(($) =>
        Effect.gen(function* () {
          yield* $.dispatch({ _tag: "inc", payload: undefined })
          yield* $.assert.state((s) => s.value === 1)
        }),
      )
      .pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            Execution.expectActionTag(result, "inc", { times: 1 })
            Execution.expectNoError(result)
          }),
        ),
      ),
  )
})
