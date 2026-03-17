import { Effect, Fiber, Ref, Stream } from 'effect'
import * as LatestFiberSlot from './LatestFiberSlot.js'

const EXHAUST_ACQUIRE_BUSY = [true, true] as const
const EXHAUST_REJECT_BUSY = [false, true] as const

export type ModeRunnerMode =
  | 'task' // sequential
  | 'parallel'
  | 'latest'
  | 'exhaust'

export type ModeRunnerLatestStrategy = 'switch' | 'fiber-slot'

export interface ModeRunnerLatestContext {
  readonly runId: number
  readonly isCurrent: Effect.Effect<boolean>
}

export interface ModeRunnerConfig<Payload, E, R> {
  readonly stream: Stream.Stream<Payload>
  readonly mode: ModeRunnerMode
  readonly run: (payload: Payload) => Effect.Effect<void, E, R>
  readonly runLatest?: (payload: Payload, context: ModeRunnerLatestContext) => Effect.Effect<void, E, R>
  readonly resolveConcurrencyLimit: Effect.Effect<number | 'unbounded', never, any>
  readonly latest?: {
    readonly strategy?: ModeRunnerLatestStrategy
    readonly awaitLatestOnEnd?: boolean
  }
}

type SwitchLatestState = {
  runningId: number
  nextId: number
}

const beginSwitchLatestRun = (stateRef: Ref.Ref<SwitchLatestState>) =>
  Ref.modify(stateRef, (state) => {
    const runId = state.nextId + 1
    state.nextId = runId
    state.runningId = runId
    return [runId, state] as const
  })

const clearSwitchLatestIfCurrent = (stateRef: Ref.Ref<SwitchLatestState>, runId: number) =>
  Ref.update(stateRef, (state) => {
    if (state.runningId === runId) {
      state.runningId = 0
    }
    return state
  })

const runLatestSwitch = <Payload, E, R>(
  stream: Stream.Stream<Payload>,
  runLatest: (payload: Payload, context: ModeRunnerLatestContext) => Effect.Effect<void, E, R>,
): Effect.Effect<void, E, R> =>
  Effect.gen(function* () {
    const stateRef = yield* Ref.make<SwitchLatestState>({
      runningId: 0,
      nextId: 0,
    })

    const makeEffect = (payload: Payload) =>
      Effect.gen(function* () {
        const runId = yield* beginSwitchLatestRun(stateRef)
        const isCurrent = Ref.get(stateRef).pipe(Effect.map((state) => state.runningId === runId))
        yield* runLatest(payload, { runId, isCurrent }).pipe(Effect.ensuring(clearSwitchLatestIfCurrent(stateRef, runId)))
      })

    return yield* Stream.runDrain(
      Stream.map(stream, makeEffect).pipe(Stream.switchMap((effect) => Stream.fromEffect(effect))),
    )
  })

const runLatestFiberSlot = <Payload, E, R>(
  stream: Stream.Stream<Payload>,
  runLatest: (payload: Payload, context: ModeRunnerLatestContext) => Effect.Effect<void, E, R>,
  awaitLatestOnEnd: boolean,
): Effect.Effect<void, E, R> =>
  Effect.gen(function* () {
    const stateRef = yield* LatestFiberSlot.make<E>()

    const start = (payload: Payload) =>
      Effect.gen(function* () {
        const [prevFiber, prevRunningId, runId] = yield* LatestFiberSlot.beginRun(stateRef)

        if (prevFiber && prevRunningId !== 0) {
          // Do not wait for full shutdown of old work; stale writes are guarded by runId.
          yield* Fiber.interrupt(prevFiber)
        }

        const isCurrent = Ref.get(stateRef).pipe(Effect.map((state) => state.runningId === runId))
        const fiber = yield* Effect.forkChild(
          runLatest(payload, { runId, isCurrent }).pipe(Effect.ensuring(LatestFiberSlot.clearIfCurrent(stateRef, runId))),
        )
        yield* LatestFiberSlot.setFiberIfCurrent(stateRef, runId, fiber)
      })

    yield* Stream.runForEach(stream, start)

    if (!awaitLatestOnEnd) {
      return
    }

    const finalState = yield* Ref.get(stateRef)
    const finalFiber = finalState.runningId !== 0 ? finalState.fiber : undefined
    if (finalFiber) {
      yield* Fiber.join(finalFiber)
    }
  })

const runExhaust = <Payload, E, R>(
  stream: Stream.Stream<Payload>,
  run: (payload: Payload) => Effect.Effect<void, E, R>,
  resolveConcurrencyLimit: Effect.Effect<number | 'unbounded', never, any>,
): Effect.Effect<void, E, R> =>
  Effect.gen(function* () {
    const concurrency = yield* resolveConcurrencyLimit
    const busyRef = yield* Ref.make(false)

    const mapper = (payload: Payload) =>
      Effect.gen(function* () {
        const acquired = yield* Ref.modify(busyRef, (busy) =>
          busy ? EXHAUST_REJECT_BUSY : EXHAUST_ACQUIRE_BUSY,
        )
        if (!acquired) {
          return
        }
        try {
          yield* run(payload)
        } finally {
          yield* Ref.set(busyRef, false)
        }
      })

    return yield* Stream.runDrain(stream.pipe(Stream.mapEffect(mapper, { concurrency })))
  })

const runParallel = <Payload, E, R>(
  stream: Stream.Stream<Payload>,
  run: (payload: Payload) => Effect.Effect<void, E, R>,
  resolveConcurrencyLimit: Effect.Effect<number | 'unbounded', never, any>,
): Effect.Effect<void, E, R> =>
  Effect.gen(function* () {
    const concurrency = yield* resolveConcurrencyLimit
    return yield* Stream.runDrain(stream.pipe(Stream.mapEffect(run, { concurrency })))
  })

export const runByMode = <Payload, E, R>(config: ModeRunnerConfig<Payload, E, R>): Effect.Effect<void, E, R> => {
  const runLatest = config.runLatest ?? ((payload: Payload) => config.run(payload))
  if (config.mode === 'latest') {
    const strategy = config.latest?.strategy ?? 'switch'
    if (strategy === 'fiber-slot') {
      return runLatestFiberSlot(config.stream, runLatest, config.latest?.awaitLatestOnEnd ?? false)
    }
    return runLatestSwitch(config.stream, runLatest)
  }

  if (config.mode === 'exhaust') {
    return runExhaust(config.stream, config.run, config.resolveConcurrencyLimit)
  }

  if (config.mode === 'parallel') {
    return runParallel(config.stream, config.run, config.resolveConcurrencyLimit)
  }

  return Stream.runForEach(config.stream, config.run)
}
