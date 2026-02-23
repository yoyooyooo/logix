import { Effect, Fiber, Option, Ref, Scope, Stream } from 'effect'
import * as LatestFiberSlot from '../LatestFiberSlot.js'
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

type TriggerQueueState = {
  queue: ProcessTrigger[]
  queueStart: number
  peak: number
}

const queueLength = (state: TriggerQueueState): number => state.queue.length - state.queueStart

const compactQueueIfNeeded = (state: TriggerQueueState): void => {
  if (state.queueStart === 0) return

  if (state.queueStart >= state.queue.length) {
    state.queue = []
    state.queueStart = 0
    return
  }

  // Keep dequeue O(1) on the hot path and compact only occasionally.
  if (state.queueStart >= 64 && state.queueStart * 2 >= state.queue.length) {
    state.queue = state.queue.slice(state.queueStart)
    state.queueStart = 0
  }
}

const enqueueTrigger = (state: TriggerQueueState, trigger: ProcessTrigger): number => {
  state.queue.push(trigger)
  const size = queueLength(state)
  if (size > state.peak) {
    state.peak = size
  }
  return size
}

const dequeueTrigger = (state: TriggerQueueState): ProcessTrigger | undefined => {
  if (state.queueStart >= state.queue.length) {
    state.queue = []
    state.queueStart = 0
    return undefined
  }
  const next = state.queue[state.queueStart]
  state.queueStart += 1
  compactQueueIfNeeded(state)
  return next
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
      const stateRef = yield* LatestFiberSlot.make()

      const onTrigger = (trigger0: ProcessTrigger): Effect.Effect<void, never, Scope.Scope> =>
        Effect.gen(function* () {
          const trigger = args.assignTriggerSeq(trigger0)

          const [prevFiber, prevRunningId, runId] = yield* LatestFiberSlot.beginRun(stateRef)

          if (prevFiber && prevRunningId !== 0) {
            yield* Fiber.interruptFork(prevFiber)
          }

          const fiber = yield* Effect.forkScoped(
            args.run(trigger).pipe(Effect.ensuring(LatestFiberSlot.clearIfCurrent(stateRef, runId))),
          )

          yield* LatestFiberSlot.setFiberIfCurrent(stateRef, runId, fiber)
        })

      return yield* Stream.runForEach(args.stream, onTrigger)
    }

    const busyRef = yield* Ref.make(false)
    const serialStateRef = yield* Ref.make({
      running: false,
      queue: [] as ProcessTrigger[],
      queueStart: 0,
      peak: 0,
    })
    const parallelStateRef = yield* Ref.make({
      active: 0,
      queue: [] as ProcessTrigger[],
      queueStart: 0,
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
          if (state.running || queueLength(state) === 0) {
            return [Option.none(), state] as const
          }
          const next = dequeueTrigger(state)
          if (next === undefined) {
            return [Option.none(), state] as const
          }
          state.running = true
          return [Option.some(next), state] as const
        }).pipe(
          Effect.flatMap((next) =>
            Option.match(next, {
              onNone: () => Effect.void,
              onSome: (trigger) =>
                Effect.forkScoped(
                  args
                    .run(trigger)
                    .pipe(
                      Effect.ensuring(
                        Ref.update(serialStateRef, (s) => {
                          s.running = false
                          return s
                        }),
                      ),
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
          if (state.active >= parallelLimit || queueLength(state) === 0) {
            return [Option.none(), state] as const
          }
          const next = dequeueTrigger(state)
          if (next === undefined) {
            return [Option.none(), state] as const
          }
          state.active += 1
          return [Option.some(next), state] as const
        }).pipe(
          Effect.flatMap((next) =>
            Option.match(next, {
              onNone: () => Effect.void,
              onSome: (trigger) =>
                Effect.forkScoped(
                  args.run(trigger).pipe(
                    Effect.ensuring(
                      Ref.update(parallelStateRef, (s) => {
                        s.active = Math.max(0, s.active - 1)
                        return s
                      }),
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
          const [nextSize, peak] = yield* Ref.modify(parallelStateRef, (state) => {
            const size = enqueueTrigger(state, trigger)
            return [[size, state.peak] as const, state] as const
          })

          if (nextSize > parallelQueueLimit.guard) {
            yield* args.onQueueOverflow({
              mode: 'parallel',
              currentLength: nextSize,
              peak,
              limit: parallelQueueLimit,
              policy,
            })
            return
          }

          yield* drainParallel()
          return
        }

        // serial
        const [nextSize, peak] = yield* Ref.modify(serialStateRef, (state) => {
          const size = enqueueTrigger(state, trigger)
          return [[size, state.peak] as const, state] as const
        })

        if (nextSize > serialQueueLimit.guard) {
          yield* args.onQueueOverflow({
            mode: 'serial',
            currentLength: nextSize,
            peak,
            limit: serialQueueLimit,
            policy,
          })
          return
        }

        yield* drainSerial()
      })

    return yield* Stream.runForEach(args.stream, onTrigger)
  })
