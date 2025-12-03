import { Effect, Scope, Layer, Schedule, TestClock } from "effect"
import { Logix } from "@logix/core"
import * as TestRuntime from "./runtime/TestRuntime.js"
import { TestApi } from "./api/TestApi.js"
import { assertState, assertSignal } from "./utils/assertions.js"
import { ExecutionResult, make as makeResult } from "./ExecutionResult.js"
import { waitUntil } from "./utils/waitUntil.js"

export interface ScenarioBuilder<Sh extends Logix.AnyModuleShape> {
  readonly provide: <M extends Logix.AnyModuleShape>(module: Logix.ModuleInstance<any, M>, initialState: Logix.StateOf<M>, ...logics: Array<Logix.ModuleLogic<M, any, any>>) => ScenarioBuilder<Sh>
  readonly layer: (layer: Layer.Layer<any, any, any>) => ScenarioBuilder<Sh>
  readonly arrange: (state: Logix.StateOf<Sh>) => ScenarioBuilder<Sh>
  readonly act: (fn: (api: TestApi<Sh>) => Effect.Effect<void, any, any>) => ScenarioBuilder<Sh>
  readonly assert: (fn: (api: TestApi<Sh>) => Effect.Effect<void, any, any>) => ScenarioBuilder<Sh>
  readonly run: () => Effect.Effect<ExecutionResult<Sh>, unknown, Scope.Scope>
}

export const make = <Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  ...logics: Array<Logix.ModuleLogic<Sh, any, any>>
): ScenarioBuilder<Sh> => {
  let initialState: Logix.StateOf<Sh> | undefined
  let customLayer: Layer.Layer<any, any, any> | null = null
  let hasCustomLayer = false
  const providedModules: Array<{ module: Logix.ModuleInstance<any, any>, initialState: any, logics: Array<any> }> = []
  const steps: Array<(runtime: TestRuntime.TestRuntime<Sh>) => Effect.Effect<void, any, any>> = []

  const builder: ScenarioBuilder<Sh> = {
    provide: (mod, init, ...logs) => {
      providedModules.push({ module: mod, initialState: init, logics: logs })
      return builder
    },
    layer: (l) => {
      customLayer = customLayer ? Layer.merge(customLayer, l) : l
      hasCustomLayer = true
      return builder
    },
    arrange: (state) => {
      initialState = state
      return builder
    },
    act: (fn) => {
      steps.push((runtime) => {
         const api: TestApi<Sh> = {
            dispatch: runtime.dispatch,
            assert: {
              state: (p) =>
                Effect.gen(function* () {
                  const check = Effect.flatMap(runtime.state, (s) =>
                    assertState(s, p)
                  )

                  yield* waitUntil(check)
                }).pipe(Effect.orDie),
              signal: (expectedType, expectedPayload) =>
                Effect.gen(function* () {
                  const check = Effect.flatMap(runtime.actions, (actions) =>
                    Effect.sync(() => {
                      for (const actual of actions) {
                        const exit = Effect.runSyncExit(
                          assertSignal(actual, expectedType, expectedPayload)
                        )
                        if (exit._tag === "Success") {
                          return
                        }
                      }
                      throw new Error(
                        `Signal assertion failed: expected type=${expectedType}, payload=${JSON.stringify(
                          expectedPayload
                        )}`
                      )
                    })
                  )

                  yield* waitUntil(check)
                }).pipe(Effect.orDie),
            }
         }
         return fn(api).pipe(Effect.orDie)
      })
      return builder
    },
    assert: (fn) => {
      steps.push((runtime) => {
         const api: TestApi<Sh> = {
            dispatch: runtime.dispatch,
            assert: {
              state: (p) =>
                Effect.gen(function* () {
                  const check = Effect.flatMap(runtime.state, (s) =>
                    assertState(s, p)
                  )

                  yield* waitUntil(check)
                }).pipe(Effect.orDie),
              signal: (expectedType, expectedPayload) =>
                Effect.gen(function* () {
                  const check = Effect.flatMap(runtime.actions, (actions) =>
                    Effect.sync(() => {
                      for (const actual of actions) {
                        const exit = Effect.runSyncExit(
                          assertSignal(actual, expectedType, expectedPayload)
                        )
                        if (exit._tag === "Success") {
                          return
                        }
                      }
                      throw new Error(
                        `Signal assertion failed: expected type=${expectedType}, payload=${JSON.stringify(
                          expectedPayload
                        )}`
                      )
                    })
                  )

                  yield* waitUntil(check)
                }).pipe(Effect.orDie),
            }
         }
         return fn(api).pipe(Effect.orDie)
      })
      return builder
    },
    run: () => Effect.gen(function* (_) {
      // 1. Main Module Layer
      let mainLayer: Layer.Layer<any, any, any>
      if (initialState !== undefined) {
        mainLayer = module.live(initialState, ...logics)
      } else {
        // ...
        if (!hasCustomLayer) {
             throw new Error("Scenario needs arrange(initialState) or layer(...)")
        }
        mainLayer = Layer.empty as unknown as Layer.Layer<any, any, any>
      }

      // 2. Provided Modules Layer
      let modulesLayer: Layer.Layer<any, any, any> = Layer.empty as unknown as Layer.Layer<any, any, any>
      if (providedModules.length > 0) {
        const providedLayers = providedModules.map(p => p.module.live(p.initialState, ...p.logics))
        // @ts-expect-error Layer.mergeAll expects tuple or rest, but array is fine at runtime.
        modulesLayer = Layer.mergeAll(...providedLayers) as unknown as Layer.Layer<any, any, any>
      }

      // 3. Base Dependencies (Main + Provided)
      // Layer.merge handles Layer.empty correctly at runtime.
      // We cast to any to avoid strict type checks complaining about Layer<never> vs Layer<any>.
      let dependenciesLayer: Layer.Layer<any, any, any> = Layer.merge(
        mainLayer as Layer.Layer<any, any, any>,
        modulesLayer as Layer.Layer<any, any, any>
      )

      // 4. Custom Layer (LinkLogic, mocks, etc.)
      let finalLayer = dependenciesLayer
      if (hasCustomLayer && customLayer) {
        finalLayer = Layer.merge(
            dependenciesLayer,
            customLayer.pipe(Layer.provide(dependenciesLayer))
        )
      }

      const runtime = yield* TestRuntime.make(module, finalLayer)

      // Force fiber scheduling to allow subscriptions to start
      yield* TestClock.adjust(1)
      yield* Effect.yieldNow()

      for (const step of steps) {
        yield* step(runtime).pipe(Effect.provide(runtime.context))
      }

      // Allow any pending actions to be collected
      yield* TestClock.adjust(1)
      yield* Effect.yieldNow()

      const finalState = yield* runtime.state
      const actions = yield* runtime.actions
      const trace = yield* runtime.trace

      // Clean up
      yield* runtime.dispose

      return makeResult(finalState, actions, trace)
    }),
  }

  return builder
}
