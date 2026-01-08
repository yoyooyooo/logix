import { Effect, Fiber, Ref, Stream, SubscriptionRef, Schedule } from 'effect'
import * as Logix from '@logixjs/core'
import { getDevtoolsSnapshot, subscribeDevtoolsSnapshot } from '../snapshot/index.js'

export type IslandState =
  | { type: 'idle' }
  | {
      type: 'active'
      startTime: number
      lastUpdateTime: number
      count: number
      // "Heat" level 0-1 based on frequency
      heat: number
    }
  | {
      type: 'settle'
      duration: number
      count: number
    }

export const IslandStore = {
  state: SubscriptionRef.make<IslandState>({ type: 'idle' }).pipe(Effect.runSync),

  // To keep track of the current "Operation" window
  context: Ref.make({
    startTime: 0,
    count: 0,
    lastSnapshotCount: 0,
  }).pipe(Effect.runSync),
}

// Logic:
// 1. Listen to snapshot changes.
// 2. If events.length increases:
//    - If Idle: Transition to Active. Start Timer.
//    - If Active: Update Count, Reset Settle Timer.
//    - If Settle: Transition back to Active (new wave).
// 3. If no events for X ms:
//    - Transition Active -> Settle.
// 4. Settle for Y ms:
//    - Transition Settle -> Idle.

const IDLE_TIMEOUT_MS = 600
const SETTLE_DURATION_MS = 2000

const rawStream = Stream.async<void>((emit) => {
  const unsub = subscribeDevtoolsSnapshot(() => {
    emit.single(void 0)
  })
  return Effect.sync(unsub)
})

const pulseLogic = Effect.gen(function* () {
  const { state, context } = IslandStore

  const handleUpdate = Effect.gen(function* () {
    const snapshot = getDevtoolsSnapshot()
    const currentTotal = snapshot.events.length

    const ctx = yield* Ref.get(context)

    // Calculate delta
    const delta = currentTotal - ctx.lastSnapshotCount

    if (delta > 0) {
      const now = Date.now()
      const currentState = yield* SubscriptionRef.get(state)

      if (currentState.type === 'idle' || currentState.type === 'settle') {
        // Start new wave
        yield* Ref.set(context, {
          startTime: now,
          count: delta,
          lastSnapshotCount: currentTotal,
        })
        yield* SubscriptionRef.set(state, {
          type: 'active',
          startTime: now,
          lastUpdateTime: now,
          count: delta,
          heat: Math.min(delta / 10, 1),
        })
      } else {
        // Continue wave
        const newCount = ctx.count + delta
        yield* Ref.update(context, (c) => ({
          ...c,
          count: newCount,
          lastSnapshotCount: currentTotal,
        }))
        yield* SubscriptionRef.set(state, {
          type: 'active',
          startTime: ctx.startTime,
          lastUpdateTime: now,
          count: newCount,
          heat: Math.min(delta / 5, 1), // Simple heat heuristic
        })
      }
    }
  })

  // Watch for inactivity
  const checkIdle = Effect.gen(function* () {
    const s = yield* SubscriptionRef.get(state)
    if (s.type === 'active') {
      const now = Date.now()
      if (now - s.lastUpdateTime > IDLE_TIMEOUT_MS) {
        // Transition to Settle
        yield* SubscriptionRef.set(state, {
          type: 'settle',
          duration: s.lastUpdateTime - s.startTime,
          count: s.count,
        })

        // Schedule return to idle after SETTLE_DURATION_MS
        yield* Effect.sleep(SETTLE_DURATION_MS).pipe(
          Effect.flatMap(() =>
            Effect.gen(function* () {
              const current = yield* SubscriptionRef.get(state)
              // Only go to idle if we are still settling (didn't get interrupted by new events)
              if (current.type === 'settle' && current.count === s.count) {
                yield* SubscriptionRef.set(state, { type: 'idle' })
              }
            }),
          ),
          Effect.fork,
        )
      }
    }
  })

  // Debounced/Throttled check stream
  // We use `rawStream` to trigger updates, but we also need a heartbeat to detect idle.

  // 1. Process updates immediately
  yield* rawStream.pipe(
    Stream.tap(() => handleUpdate),
    Stream.runDrain,
    Effect.fork,
  )

  // 2. Poll for idle (Heartbeat) - every 200ms
  yield* Effect.repeat(checkIdle, Schedule.fixed('200 millis'))
})

// Start the machine
Effect.runFork(pulseLogic)

// React Hook
import { useSyncExternalStore } from 'react'

export const useIslandState = () => {
  return useSyncExternalStore(
    (cb) => {
      const fiber = Effect.runFork(IslandStore.state.changes.pipe(Stream.runForEach(() => Effect.sync(cb))))
      return () => {
        Effect.runSync(Fiber.interruptFork(fiber))
      }
    },
    () => Effect.runSync(SubscriptionRef.get(IslandStore.state)),
  )
}
