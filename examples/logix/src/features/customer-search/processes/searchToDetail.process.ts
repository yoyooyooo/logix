import { Effect, Stream } from 'effect'
import * as Logix from '@logixjs/core'
import { CustomerDetailDef } from '../customerDetail.def.js'
import { CustomerSearchDef } from '../customerSearch.def.js'

export const CustomerSearchToDetailProcess = Logix.Process.link(
  {
    modules: [CustomerSearchDef, CustomerDetailDef] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const search = $[CustomerSearchDef.id]
      const detail = $[CustomerDetailDef.id]

      yield* search
        .changes((s) => s.results)
        .pipe(
          Stream.runForEach((results) =>
            results.length > 0
              ? detail.actions['customerDetail/setSelected'](results[0]!)
              : detail.actions['customerDetail/clear'](),
          ),
        )
    }),
)

