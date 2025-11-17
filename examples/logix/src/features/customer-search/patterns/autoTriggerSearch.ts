import { Cause, Effect, Option } from 'effect'
import type * as Logix from '@logix/core'
import type { CustomerSearchShape } from '../customerSearch.def.js'
import type { CustomerSummary } from '../model.js'
import { CustomerApiTag } from '../service.js'

export const runAutoTriggerSearch = <R>($: Logix.BoundApi<CustomerSearchShape, R>) =>
  Effect.gen(function* () {
    yield* $.onState((s) => s.keyword).debounce(300).runLatestTask({
      pending: (keyword) =>
        $.state.mutate((draft) => {
          const trimmed = keyword.trim()

          draft.errorMessage = undefined

          if (trimmed.length === 0) {
            draft.isSearching = false
            draft.results = []
            return
          }

          draft.isSearching = true
        }),

      effect: (keyword) =>
        Effect.gen(function* () {
          const trimmed = keyword.trim()
          if (trimmed.length === 0) {
            return [] as ReadonlyArray<CustomerSummary>
          }

          const api = yield* $.use(CustomerApiTag)
          return yield* api.search(trimmed)
        }),

      success: (results) =>
        $.state.mutate((draft) => {
          draft.isSearching = false
          draft.results = Array.from(results)
        }),

      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.isSearching = false

          const failure = Cause.failureOption(cause)
          draft.errorMessage =
            Option.isSome(failure) && typeof (failure.value as any)?.message === 'string'
              ? String((failure.value as any).message)
              : '搜索失败'
        }),
    })
  })
