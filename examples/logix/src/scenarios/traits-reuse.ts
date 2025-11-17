/**
 * @scenario Logic Traits · 复用示例（可运行）
 * @description
 *   演示同一个“带 traits 的 Logic Pattern”在两个 Module 上复用：
 *   - 复用同一份 sharedTraits；
 *   - 复用同一个 makeTraitsReuseLogicPattern()（每个 Module 各自实例化 Logic）。
 */

import { Effect } from 'effect'
import * as Logix from '@logix/core'
import { makeTraitsReuseLogicPattern, makeTraitsReuseModule } from '../patterns/traits-reuse.js'

const runOne = (id: string, initialBase: number) =>
  Effect.gen(function* () {
    const M = makeTraitsReuseModule(id)
    const L = M.logic(makeTraitsReuseLogicPattern(), { id: 'shared-logic' })

    const module = M.implement({
      initial: { base: initialBase, derived: 0 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(module)

    try {
      const state: any = yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag
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
  yield* runOne('TraitsReuseA', 1)
  yield* runOne('TraitsReuseB', 10)
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
