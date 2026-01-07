import { Effect, Layer } from 'effect'
import * as Logix from '@logix/core'

export type DeterministicHostScheduler = Logix.InternalContracts.DeterministicHostScheduler
export type TickSchedulerConfig = Logix.InternalContracts.TickSchedulerConfig

export const makeTestHostScheduler = (): DeterministicHostScheduler =>
  Logix.InternalContracts.makeDeterministicHostScheduler() as DeterministicHostScheduler

export const testHostSchedulerLayer = (scheduler: DeterministicHostScheduler): Layer.Layer<any, never, never> =>
  Logix.InternalContracts.hostSchedulerTestLayer(scheduler) as Layer.Layer<any, never, never>

export const tickSchedulerTestLayer = (config?: TickSchedulerConfig): Layer.Layer<any, never, never> =>
  Logix.InternalContracts.tickSchedulerTestLayer(config) as Layer.Layer<any, never, never>

export const flushAllHostScheduler = (
  scheduler: DeterministicHostScheduler,
  options?: { readonly maxTurns?: number; readonly settleYields?: number },
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const maxTurns = options?.maxTurns ?? 1_000
    const settleYields = options?.settleYields ?? 8

    for (let turn = 0; turn < maxTurns; turn += 1) {
      yield* Effect.sync(() => {
        scheduler.flushAll({ maxTurns })
      })

      // Give forked fibers (e.g. TickScheduler.scheduleTick) a chance to run and enqueue more host tasks.
      yield* Effect.yieldNow()

      const { microtasks, macrotasks } = scheduler.getQueueSize()
      if (microtasks !== 0 || macrotasks !== 0) {
        continue
      }

      // Let non-host work settle (e.g. state transactions / PubSub) and catch follow-up host tasks.
      for (let i = 0; i < settleYields; i += 1) {
        yield* Effect.yieldNow()
      }

      const after = scheduler.getQueueSize()
      if (after.microtasks === 0 && after.macrotasks === 0) {
        return
      }
    }

    const { microtasks, macrotasks } = scheduler.getQueueSize()
    throw new Error(
      `[LogixTest.Act.flushAllHostScheduler] Exceeded maxTurns=${maxTurns} (microtasks=${microtasks}, macrotasks=${macrotasks}).`,
    )
  }).pipe(Effect.asVoid)

export const advanceTicks = (args: {
  readonly scheduler: DeterministicHostScheduler
  readonly getTickSeq: () => number
  readonly n: number
  readonly maxTurns?: number
}): Effect.Effect<void> =>
  Effect.gen(function* () {
    const start = args.getTickSeq()
    const expected = start + Math.max(0, args.n)

    const maxTurns = args.maxTurns ?? 1_000
    for (let turn = 0; turn < maxTurns; turn += 1) {
      yield* flushAllHostScheduler(args.scheduler, { maxTurns })
      const current = args.getTickSeq()
      if (current >= expected) {
        return
      }
    }

    const end = args.getTickSeq()
    throw new Error(`[LogixTest.Act.advanceTicks] Expected >=${args.n} ticks, got ${end - start}.`)
  }).pipe(Effect.asVoid)
