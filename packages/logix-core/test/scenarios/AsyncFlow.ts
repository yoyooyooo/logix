import { Effect, Context, Stream, Schedule } from "effect"

export interface TaskService {
  start: () => Effect.Effect<string>
  getStatus: (id: string) => Effect.Effect<"PENDING" | "DONE" | "FAILED">
  search: (query: string) => Effect.Effect<string[]>
}

export class TaskService extends Context.Tag("TaskService")<
  TaskService,
  TaskService
>() {}

// Long Polling Flow
export const pollTask = (taskId: string) =>
  Effect.gen(function* (_) {
    const service = yield* TaskService

    return yield* Effect.gen(function* (_) {
        const status = yield* service.getStatus(taskId)
        if (status === "DONE" || status === "FAILED") {
          return status
        }
        // Continue polling
        return yield* Effect.fail("PENDING")
      }).pipe(
        Effect.retry({
          schedule: Schedule.exponential("100 millis").pipe(
            Schedule.union(Schedule.spaced("1 second")),
            Schedule.intersect(Schedule.recurWhile((e) => e === "PENDING"))
          )
        }),
        // If it fails with "PENDING" after retries (if we had a limit), or if we want to map the final failure
        Effect.catchAll((e) => e === "PENDING" ? Effect.die("Polling timeout") : Effect.fail(e))
      )
  })

// Debounced Search Flow
export const searchFlow = (query$: Stream.Stream<string>) =>
  Effect.gen(function* (_) {
    const service = yield* TaskService

    return query$.pipe(
      Stream.debounce("300 millis"),
      Stream.mapEffect((query) =>
        service.search(query).pipe(
          Effect.map((results) => ({ query, results }))
        ),
        { concurrency: "unbounded" } // or switch: true for cancellation
      )
    )
  })
