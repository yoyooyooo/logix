import { Effect, Context } from "effect"

export interface BatchService {
  process: (ids: string[]) => Effect.Effect<void, Error>
}

export class BatchService extends Context.Tag("BatchService")<
  BatchService,
  BatchService
>() {}

export const batchProcess = (ids: string[]) =>
  Effect.gen(function* (_) {
    const service = yield* BatchService

    if (ids.length === 0) {
      return yield* Effect.logWarning("No items to process")
    }

    yield* Effect.logInfo("Starting batch process", { count: ids.length })

    yield* service.process(ids).pipe(
      Effect.tapError((err) => Effect.logError("Batch process failed", err))
    )

    yield* Effect.logInfo("Batch process completed")
  })
