import { it } from "vitest"
import type { Effect } from "effect"
import type * as Logix from "@logix/core"
import * as TestProgram from "./api/TestProgram.js"
import * as Execution from "./ExecutionResult.js"
import { runTest } from "./api/defineTest.js"
import type { TestApi } from "./api/TestApi.js"

/**
 * 语法糖：基于 TestProgram + @effect/vitest 定义一个场景测试。
 *
 * - 内部自动调用 TestProgram.make(config).run(body) + runTest；
 * - 默认断言 ExecutionResult 无错误（Execution.expectNoError）。
 */
export const itScenario = <Sh extends Logix.AnyModuleShape>(
  name: string,
  config: TestProgram.ScenarioConfig<Sh>,
  body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>,
): void => {
  it(name, async () => {
    const scenario = TestProgram.make(config)
    const program = scenario.run(body)

    const result = await runTest(program)
    Execution.expectNoError(result)
  })
}

/**
 * 变体：暴露 ExecutionResult，由调用方决定如何断言。
 *
 * - 不会自动调用 Execution.expectNoError；
 * - 非 happy-path（例如期望出现特定 diagnostic）的场景推荐使用本 API。
 */
export const itScenarioResult = <Sh extends Logix.AnyModuleShape>(
  name: string,
  config: TestProgram.ScenarioConfig<Sh>,
  body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>,
  assert: (result: Execution.ExecutionResult<Sh>) => void,
): void => {
  it(name, async () => {
    const scenario = TestProgram.make(config)
    const program = scenario.run(body)

    const result = await runTest(program)
    assert(result)
  })
}
