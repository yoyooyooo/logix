/**
 * @scenario Feature-first · Customer Search（最小闭环样板）
 * @description
 *   演示一个“小 feature”的完整最佳实践形态：
 *   - `src/features/*` 内按功能聚合 Module/Process/局部 Pattern/Service Tag；
 *   - `src/runtime/*` 作为 Composition Root 注入 Layer + processes；
 *   - `src/scenarios/*` 提供单文件可运行入口。
 *
 * 运行：
 *   pnpm exec tsx src/scenarios/feature-first-customer-search.ts
 */

import { Effect, Stream } from 'effect'
import * as Logix from '@logixjs/core'
import { CustomerDetailDef, CustomerSearchDef } from '../features/customer-search/index.js'
import { RuntimeLayer } from '../runtime/layer.js'
import { RootImpl } from '../runtime/root.impl.js'

const runtime = Logix.Runtime.make(RootImpl, { layer: RuntimeLayer })

const main = Effect.gen(function* () {
  try {
    yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const search = yield* CustomerSearchDef.tag
          const detail = yield* CustomerDetailDef.tag

          yield* Effect.fork(
            search
              .changes((s) => s)
              .pipe(
                Stream.runForEach((s) =>
                  Effect.sync(() => {
                    // eslint-disable-next-line no-console
                    console.log('[Search]', s)
                  }),
                ),
              ),
          )

          yield* Effect.fork(
            detail
              .changes((s) => s)
              .pipe(
                Stream.runForEach((s) =>
                  Effect.sync(() => {
                    // eslint-disable-next-line no-console
                    console.log('[Detail]', s)
                  }),
                ),
              ),
          )

          yield* search.dispatch(CustomerSearchDef.actions.setKeyword('alice'))
          yield* Effect.sleep('800 millis')

          yield* search.dispatch(CustomerSearchDef.actions.setKeyword('bob'))
          yield* Effect.sleep('800 millis')

          yield* search.dispatch(CustomerSearchDef.actions.setKeyword('!'))
          yield* Effect.sleep('800 millis')
        }),
      ),
    )
  } finally {
    yield* Effect.promise(() => runtime.dispose())
  }
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
