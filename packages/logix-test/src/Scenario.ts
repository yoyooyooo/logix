import { Effect, Scope, Layer, Schedule, TestClock } from "effect"
import * as Logix from "@logix/core"
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
  const customLayers: Array<Layer.Layer<any, any, any>> = []
  const providedModules: Array<{ module: Logix.ModuleInstance<any, any>, initialState: any, logics: Array<any> }> = []
  const steps: Array<(runtime: TestRuntime.TestRuntime<Sh>) => Effect.Effect<void, any, any>> = []

  const makeTestApi = (runtime: TestRuntime.TestRuntime<Sh>): TestApi<Sh> => ({
    dispatch: runtime.dispatch,
    assert: {
      state: (predicate, options) =>
        Effect.gen(function* () {
          const check = Effect.flatMap(runtime.state, (s) =>
            assertState(s, predicate)
          )

          yield* waitUntil(check, options)
        }).pipe(Effect.orDie),
      signal: (expectedType, expectedPayload, options) =>
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

          yield* waitUntil(check, options)
        }).pipe(Effect.orDie),
    },
  })

  const builder: ScenarioBuilder<Sh> = {
    provide: (mod, init, ...logs) => {
      providedModules.push({ module: mod, initialState: init, logics: logs })
      return builder
    },
    layer: (l) => {
      customLayers.push(l)
      return builder
    },
    arrange: (state) => {
      initialState = state
      return builder
    },
    act: (fn) => {
      steps.push((runtime) => {
        const api = makeTestApi(runtime)
        return fn(api).pipe(Effect.orDie)
      })
      return builder
    },
    assert: (fn) => {
      steps.push((runtime) => {
        const api = makeTestApi(runtime)
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
        if (customLayers.length === 0) {
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
        modulesLayer as Layer.Layer<any, any, any>,
      )

      // 4. Custom Layers：
      // - Env Layers（service mocks, extra env）：不依赖 Module Runtime，用于给 Logic 提供外部服务；
      // - Process Layers（LinkLogic 等）：依赖 Module Runtime，自身不导出 Service，只负责长期流程。
      const envLayers: Array<Layer.Layer<any, any, any>> = []
      const processLayers: Array<Layer.Layer<any, any, any>> = []

      for (const l of customLayers) {
        const op = (l as any)?._op_layer
        if (op === "Scoped") {
          processLayers.push(l)
        } else {
          envLayers.push(l)
        }
      }

      // 4.1 将 Env Layers 作为 Service 提供给依赖层（main + provided modules）。
      let baseLayer: Layer.Layer<any, any, any> = dependenciesLayer
      if (envLayers.length > 0) {
        const mergedEnv =
          envLayers.length === 1
            ? envLayers[0]!
            : Layer.mergeAll(
                ...(envLayers as [
                  Layer.Layer<any, any, any>,
                  ...Array<Layer.Layer<any, any, any>>
                ]),
              )

        baseLayer = dependenciesLayer.pipe(
          Layer.provide(mergedEnv as Layer.Layer<any, any, any>),
        )
      }

      // 4.2 Process Layers（例如 LinkLogic）：在 baseLayer 环境下运行长期流程。
      let finalLayer: Layer.Layer<any, any, any> = baseLayer
      if (processLayers.length > 0) {
        const mergedProcess =
          processLayers.length === 1
            ? processLayers[0]!
            : Layer.mergeAll(
                ...(processLayers as [
                  Layer.Layer<any, any, any>,
                  ...Array<Layer.Layer<any, any, any>>
                ]),
              )

        const processWithEnv = mergedProcess.pipe(
          Layer.provide(baseLayer as Layer.Layer<any, any, any>),
        )

        finalLayer = Layer.merge(
          baseLayer as Layer.Layer<any, any, any>,
          processWithEnv as Layer.Layer<any, any, any>,
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
