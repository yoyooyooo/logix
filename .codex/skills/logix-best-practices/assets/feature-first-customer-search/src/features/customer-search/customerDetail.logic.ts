import { Effect } from 'effect'
import { CustomerDetailDef } from './customerDetail.def.js'

export const CustomerDetailLogic = CustomerDetailDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('customerDetail/setSelected').run((action) =>
      $.state.update((s) => ({
        ...s,
        selected: action.payload,
      })),
    )

    yield* $.onAction('customerDetail/clear').run(() =>
      $.state.update((s) => ({
        ...s,
        selected: undefined,
      })),
    )
  }),
)

