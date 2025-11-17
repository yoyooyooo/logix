import { it } from 'vitest'
import type { Effect } from 'effect'
import type * as Logix from '@logix/core'
import * as Execution from './ExecutionResult.js'
import { runTest } from '../runtime/runTest.js'
import type { TestApi } from './TestApi.js'
import * as TestProgram from './TestProgram.js'

/**
 * Sugar: defines a program test based on `TestProgram.runProgram`.
 *
 * - By default, asserts `Execution.expectNoError(result)`.
 * - Recommended: for both single-module and multi-module tests, use the "program module" as the input,
 *   instead of hand-rolling lifecycle/kernel assembly.
 */
export const itProgram = <Sh extends Logix.AnyModuleShape>(
  name: string,
  program: Logix.ModuleImpl<any, Sh, any> | Logix.AnyModule,
  body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>,
  options?: TestProgram.TestProgramOptions,
): void => {
  it(name, async () => {
    const result = await runTest(TestProgram.runProgram(program, body, options))
    Execution.expectNoError(result)
  })
}

/**
 * Variant: exposes `ExecutionResult`, leaving assertions to the caller.
 *
 * - Does not automatically call `Execution.expectNoError`.
 * - Use this API when you expect specific diagnostics/traces.
 */
export const itProgramResult = <Sh extends Logix.AnyModuleShape>(
  name: string,
  program: Logix.ModuleImpl<any, Sh, any> | Logix.AnyModule,
  body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>,
  assert: (result: Execution.ExecutionResult<Sh>) => void,
  options?: TestProgram.TestProgramOptions,
): void => {
  it(name, async () => {
    const result = await runTest(TestProgram.runProgram(program, body, options))
    assert(result)
  })
}
