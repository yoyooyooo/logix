import { Effect } from 'effect'
import { CustomerSearchDef } from './customerSearch.def.js'
import { CustomerApiTag } from './service.js'
import { runAutoTriggerSearch } from './patterns/autoTriggerSearch.js'

export const CustomerSearchLogic = CustomerSearchDef.logic<CustomerApiTag>(($) =>
  Effect.gen(function* () {
    yield* $.onAction('customerSearch/setKeyword').run((action) =>
      $.state.update((s) => ({
        ...s,
        keyword: action.payload,
      })),
    )

    yield* runAutoTriggerSearch($)

    const runSearch = Effect.gen(function* () {
      const api = yield* $.use(CustomerApiTag)
      const { keyword } = yield* $.state.read
      const trimmed = keyword.trim()

      if (trimmed.length === 0) {
        yield* $.state.update((s) => ({
          ...s,
          results: [],
          isSearching: false,
          errorMessage: undefined,
        }))
        return
      }

      yield* $.state.update((s) => ({
        ...s,
        isSearching: true,
        errorMessage: undefined,
      }))

      const result = yield* Effect.either(api.search(trimmed))

      if (result._tag === 'Left') {
        yield* $.state.update((s) => ({
          ...s,
          isSearching: false,
          errorMessage: result.left.message,
        }))
        return
      }

      yield* $.state.update((s) => ({
        ...s,
        isSearching: false,
        results: result.right,
      }))
    })

    yield* $.onAction('customerSearch/trigger').runExhaust(runSearch)
  }).pipe(Effect.catchAll(() => Effect.void)),
)

