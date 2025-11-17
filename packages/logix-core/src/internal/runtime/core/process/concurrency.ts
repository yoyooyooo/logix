import { Effect, Fiber, Option, Ref, Scope, Stream } from 'effect'
import type { TaskRunnerMode } from '../TaskRunner.js'
import type { ProcessConcurrencyPolicy, ProcessTrigger } from './protocol.js'

export const DEFAULT_SERIAL_QUEUE_GUARD_LIMIT = 4096
export const DEFAULT_PARALLEL_LIMIT = 16

export const toTaskRunnerMode = (policy: ProcessConcurrencyPolicy): TaskRunnerMode => {
  switch (policy.mode) {
    case 'latest':
      return 'latest'
    case 'serial':
      return 'task'
    case 'drop':
      return 'exhaust'
    case 'parallel':
      return 'parallel'
  }
}

export type ResolvedQueueLimit = {
  /** User-configured limit; treated as unlimited when omitted (still bounded by the guard). */
  readonly configured: number | 'unbounded'
  /** Runtime-enforced guard limit (prevents unbounded memory growth). */
  readonly guard: number
}

export const resolveQueueLimit = (
  maxQueue: unknown,
  options?: {
    readonly defaultGuard?: number
  },
): ResolvedQueueLimit => {
  const defaultGuard = options?.defaultGuard ?? DEFAULT_SERIAL_QUEUE_GUARD_LIMIT

  const configured =
    typeof maxQueue === 'number' && Number.isFinite(maxQueue) && maxQueue >= 0 ? Math.floor(maxQueue) : 'unbounded'

  return {
    configured,
    guard: configured === 'unbounded' ? defaultGuard : configured,
  }
}

export type ProcessTriggerQueueOverflowInfo = {
  readonly mode: 'serial' | 'parallel'
  readonly currentLength: number
  readonly peak: number
  readonly limit: ResolvedQueueLimit
  readonly policy: ProcessConcurrencyPolicy
}

export const runProcessTriggerStream = (args: {
  readonly stream: Stream.Stream<ProcessTrigger>
  readonly policy: ProcessConcurrencyPolicy
  readonly assignTriggerSeq: (trigger: ProcessTrigger) => ProcessTrigger
  /** run a trigger to completion (the caller decides what a \"run\" means). */
  readonly run: (trigger: ProcessTrigger) => Effect.Effect<void, never, Scope.Scope>
  /** invoked when a trigger is dropped (only for mode=drop). */
  readonly onDrop: (trigger: ProcessTrigger) => Effect.Effect<void>
  /** invoked when internal queue guard is exceeded (fail-stop by default). */
  readonly onQueueOverflow: (info: ProcessTriggerQueueOverflowInfo) => Effect.Effect<void>
  readonly defaultParallelLimit?: number
  readonly defaultQueueGuard?: number
}): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const policy = args.policy
    const defaultQueueGuard = args.defaultQueueGuard ?? DEFAULT_SERIAL_QUEUE_GUARD_LIMIT

    if (policy.mode === 'latest') {
      const stateRef = yield* Ref.make<{
        readonly fiber?: Fiber.RuntimeFiber<void, never>
        readonly runningId: number
        readonly nextId: number
      }>({ fiber: undefined, runningId: 0, nextId: 0 })

      const onTrigger = (trigger0: ProcessTrigger): Effect.Effect<void, never, Scope.Scope> =>
        Effect.gen(function* () {
          const trigger = args.assignTriggerSeq(trigger0)

          const [prevFiber, prevRunningId, runId] = yield* Ref.modify(stateRef, (s) => {
            const nextId = s.nextId + 1
            return [[s.fiber, s.runningId, nextId] as const, { ...s, nextId, runningId: nextId }] as const
          })

          if (prevFiber && prevRunningId !== 0) {
            const done = yield* Fiber.poll(prevFiber)
            if (Option.isNone(done)) {
              yield* Fiber.interruptFork(prevFiber)
            }
          }

          const fiber = yield* Effect.forkScoped(
            args
              .run(trigger)
              .pipe(Effect.ensuring(Ref.update(stateRef, (s) => (s.runningId === runId ? { ...s, runningId: 0 } : s)))),
          )

          yield* Ref.update(stateRef, (s) => ({ ...s, fiber }))
        })

      return yield* Stream.runForEach(args.stream, onTrigger)
    }

    const busyRef = yield* Ref.make(false)
    const serialStateRef = yield* Ref.make({
      running: false,
      queue: [] as ProcessTrigger[],
      peak: 0,
    })
    const parallelStateRef = yield* Ref.make({
      active: 0,
      queue: [] as ProcessTrigger[],
      peak: 0,
    })

    const serialQueueLimit = resolveQueueLimit(policy.maxQueue, { defaultGuard: defaultQueueGuard })
    const parallelQueueLimit = resolveQueueLimit(undefined, { defaultGuard: defaultQueueGuard })
    const parallelLimit =
      typeof policy.maxParallel === 'number' && Number.isFinite(policy.maxParallel) && policy.maxParallel >= 1
        ? Math.floor(policy.maxParallel)
        : (args.defaultParallelLimit ?? DEFAULT_PARALLEL_LIMIT)

    const drainSerial = (): Effect.Effect<void, never, Scope.Scope> =>
      Effect.suspend(() =>
        Ref.modify(serialStateRef, (state) => {
          if (state.running || state.queue.length === 0) {
            return [Option.none(), state] as const
          }
          const [next, ...rest] = state.queue
          return [Option.some(next), { ...state, running: true, queue: rest }] as const
        }).pipe(
          Effect.flatMap((next) =>
            Option.match(next, {
              onNone: () => Effect.void,
              onSome: (trigger) =>
                Effect.forkScoped(
                  args
                    .run(trigger)
                    .pipe(
                      Effect.ensuring(Ref.update(serialStateRef, (s) => ({ ...s, running: false }))),
                      Effect.zipRight(drainSerial()),
                    ),
                ).pipe(Effect.asVoid),
            }),
          ),
        ),
      )

    const drainParallel = (): Effect.Effect<void, never, Scope.Scope> =>
      Effect.suspend(() =>
        Ref.modify(parallelStateRef, (state) => {
          if (state.active >= parallelLimit || state.queue.length === 0) {
            return [Option.none(), state] as const
          }
          const [next, ...rest] = state.queue
          return [Option.some(next), { ...state, active: state.active + 1, queue: rest }] as const
        }).pipe(
          Effect.flatMap((next) =>
            Option.match(next, {
              onNone: () => Effect.void,
              onSome: (trigger) =>
                Effect.forkScoped(
                  args.run(trigger).pipe(
                    Effect.ensuring(
                      Ref.update(parallelStateRef, (s) => ({
                        ...s,
                        active: Math.max(0, s.active - 1),
                      })),
                    ),
                    Effect.zipRight(drainParallel()),
                  ),
                ).pipe(Effect.asVoid, Effect.zipRight(drainParallel())),
            }),
          ),
        ),
      )

    const onTrigger = (trigger0: ProcessTrigger): Effect.Effect<void, never, Scope.Scope> =>
      Effect.gen(function* () {
        const trigger = args.assignTriggerSeq(trigger0)

        if (policy.mode === 'drop') {
          const acquired = yield* Ref.modify(busyRef, (busy) =>
            busy ? ([false, busy] as const) : ([true, true] as const),
          )
          if (!acquired) {
            yield* args.onDrop(trigger)
            return
          }

          yield* Effect.forkScoped(args.run(trigger).pipe(Effect.ensuring(Ref.set(busyRef, false))))
          return
        }

        if (policy.mode === 'parallel') {
          const nextSize = yield* Ref.modify(parallelStateRef, (state) => {
            const queue = [...state.queue, trigger]
            return [queue.length, { ...state, queue, peak: Math.max(state.peak, queue.length) }] as const
          })

          if (nextSize > parallelQueueLimit.guard) {
            const state = yield* Ref.get(parallelStateRef)
            yield* args.onQueueOverflow({
              mode: 'parallel',
              currentLength: nextSize,
              peak: state.peak,
              limit: parallelQueueLimit,
              policy,
            })
            return
          }

          yield* drainParallel()
          return
        }

        // serial
        const nextSize = yield* Ref.modify(serialStateRef, (state) => {
          const queue = [...state.queue, trigger]
          return [queue.length, { ...state, queue, peak: Math.max(state.peak, queue.length) }] as const
        })

        if (nextSize > serialQueueLimit.guard) {
          const state = yield* Ref.get(serialStateRef)
          yield* args.onQueueOverflow({
            mode: 'serial',
            currentLength: nextSize,
            peak: state.peak,
            limit: serialQueueLimit,
            policy,
          })
          return
        }

        yield* drainSerial()
      })

    return yield* Stream.runForEach(args.stream, onTrigger)
  })
