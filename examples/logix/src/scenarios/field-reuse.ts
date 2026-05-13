/**
 * @scenario Logic Fields · 复用示例（可运行）
 * @description
 *   演示同一个“带字段声明的 Logic Pattern”在两个 Module 上复用：
 *   - 复用同一份 sharedFields；
 *   - 复用同一个 makeFieldReuseLogicPattern()（每个 Module 各自实例化 Logic）。
 */

import { Effect } from 'effect'
import * as Logix from '@logixjs/core'
import { makeFieldReuseLogicPattern, makeFieldReuseModule } from '../patterns/field-reuse.js'

const runOne = (id: string, initialBase: number) =>
  Effect.gen(function* () {
    const M = makeFieldReuseModule(id)
    const L = M.logic('shared-logic', makeFieldReuseLogicPattern())

    const program = Logix.Program.make(M, {
      initial: { base: initialBase, derived: 0 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(program)

    try {
      const state: any = yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'base/set', payload: initialBase + 1 })
            yield* Effect.sleep('10 millis')
            return yield* rt.getState
          }) as any,
        ),
      )

      // eslint-disable-next-line no-console
      console.log(`[${id}] base=${state.base} derived=${state.derived}`)
    } finally {
      yield* Effect.promise(() => runtime.dispose())
    }
  })

const main = Effect.gen(function* () {
  yield* runOne('FieldReuseA', 1)
  yield* runOne('FieldReuseB', 10)
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
