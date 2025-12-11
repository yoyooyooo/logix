import { Effect, Layer, Scope } from "effect"
import type * as Logix from "@logix/core"
import * as InternalScenario from "../Scenario.js"
import type { TestApi } from "./TestApi.js"
import type { ExecutionResult } from "../ExecutionResult.js"

/**
 * 测试场景配置：
 * - main：主模块，ExecutionResult 的 state / actions 以它为准；
 * - modules：其他协作模块（可选）；
 * - layers：额外依赖 Layer（Link Logic、Mock Service 等）。
 */
export interface ScenarioConfig<Sh extends Logix.AnyModuleShape> {
  readonly main: {
    readonly module: Logix.ModuleInstance<any, Sh>
    readonly initial: Logix.StateOf<Sh>
    readonly logics?: ReadonlyArray<Logix.ModuleLogic<Sh, any, any>>
  }
  readonly modules?: ReadonlyArray<{
    readonly module: Logix.ModuleInstance<any, Logix.AnyModuleShape>
    readonly initial: any
    readonly logics?: ReadonlyArray<Logix.ModuleLogic<Logix.AnyModuleShape, any, any>>
  }>
  readonly layers?: ReadonlyArray<Layer.Layer<any, any, any>>
}

export interface Scenario<Sh extends Logix.AnyModuleShape> {
  /**
   * 运行测试场景：
   * - 提供统一的 TestApi（dispatch / assert.*）；
   * - 返回 ExecutionResult，包含最终 state / actions / trace。
   */
  readonly run: (
    body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>
  ) => Effect.Effect<ExecutionResult<Sh>, unknown, Scope.Scope>
}

/**
 * 基于配置对象构建测试场景。
 *
 * 示例：
 *
 *   const scenario = TestProgram.make({
 *     main: { module: Counter, initial: { count: 0 }, logics: [CounterLogic] },
 *     modules: [{ module: Auth, initial: { loggedIn: false }, logics: [AuthLogic] }],
 *     layers: [LinkLayer]
 *   })
 *
 *   const program = scenario.run(($) =>
 *     Effect.gen(function* () {
 *       yield* $.dispatch({ _tag: "increment", payload: undefined })
 *       yield* $.assert.state(s => s.count === 1)
 *     })
 *   )
 */
export const make = <Sh extends Logix.AnyModuleShape>(
  config: ScenarioConfig<Sh>
): Scenario<Sh> => {
  const { main, modules = [], layers = [] } = config

  // 将配置对象映射到现有 Scenario Builder 上，
  // 作为新 API 的“语法糖”，避免重复实现 Layer 组合逻辑。
  let builder = InternalScenario.make(
    main.module,
    ...(main.logics ?? [])
  )

  builder = builder.arrange(main.initial)

  for (const mod of modules) {
    builder = builder.provide(
      mod.module as Logix.ModuleInstance<any, any>,
      mod.initial,
      ...(mod.logics ?? [])
    )
  }

  for (const layer of layers) {
    builder = builder.layer(layer)
  }

  return {
    run: (body) => builder.act(body).run(),
  }
}
