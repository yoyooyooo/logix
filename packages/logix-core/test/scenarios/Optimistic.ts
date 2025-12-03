import { Effect, Context, Layer } from "effect"

export interface ToggleService {
  toggle: (id: string, value: boolean) => Effect.Effect<void, Error>
}

export class ToggleService extends Context.Tag("ToggleService")<
  ToggleService,
  ToggleService
>() {}

export const makeToggleLogic = (id: string, nextValue: boolean) =>
  Effect.gen(function* (_) {
    const service = yield* ToggleService

    // Optimistic update happens in UI/State layer before calling this flow
    // This flow represents the server sync

    yield* service.toggle(id, nextValue).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          // In a real app, we might trigger a rollback action here
          // or just re-throw to let the UI handle the rollback
          yield* Effect.logError("Toggle failed, rolling back", error)
          return yield* Effect.fail(error)
        })
      )
    )
  })
