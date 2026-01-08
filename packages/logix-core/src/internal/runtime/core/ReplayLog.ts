import { Context, Effect, Layer } from 'effect'

export type ResourceSnapshotPhase = 'idle' | 'loading' | 'success' | 'error'

export type ReplayLogEvent =
  | {
      readonly _tag: 'ResourceSnapshot'
      readonly resourceId: string
      readonly fieldPath: string
      readonly keyHash?: string
      /**
       * Optional: source concurrency policy (e.g. "switch" / "exhaust-trailing").
       * - Must remain slim & serializable.
       * - Used by Devtools/replay to explain why old results are dropped / why trailing happens.
       */
      readonly concurrency?: string
      readonly phase: ResourceSnapshotPhase
      readonly snapshot: unknown
      readonly timestamp: number
      readonly moduleId?: string
      readonly instanceId?: string
    }
  | {
      readonly _tag: 'InvalidateRequest'
      readonly timestamp: number
      readonly moduleId?: string
      readonly instanceId?: string
      readonly kind: 'resource' | 'query'
      readonly target: string
      readonly meta?: unknown
    }

export type ResourceSnapshotEvent = Extract<ReplayLogEvent, { readonly _tag: 'ResourceSnapshot' }>

export interface ReplayLogService {
  readonly record: (event: ReplayLogEvent) => Effect.Effect<void>
  readonly snapshot: Effect.Effect<ReadonlyArray<ReplayLogEvent>>
  readonly resetCursor: Effect.Effect<void>
  readonly consumeNext: (predicate: (event: ReplayLogEvent) => boolean) => Effect.Effect<ReplayLogEvent | undefined>
  readonly consumeNextResourceSnapshot: (params: {
    readonly resourceId: string
    readonly fieldPath: string
    readonly keyHash?: string
    readonly phase?: ResourceSnapshotPhase
  }) => Effect.Effect<ResourceSnapshotEvent | undefined>
}

export class ReplayLog extends Context.Tag('@logixjs/core/ReplayLog')<ReplayLog, ReplayLogService>() {}

export const make = (initial?: ReadonlyArray<ReplayLogEvent>): ReplayLogService => {
  const events: Array<ReplayLogEvent> = initial ? Array.from(initial) : []
  let cursor = 0

  const consumeNext = (predicate: (event: ReplayLogEvent) => boolean): Effect.Effect<ReplayLogEvent | undefined> =>
    Effect.sync(() => {
      for (let i = cursor; i < events.length; i++) {
        const event = events[i]
        if (!predicate(event)) continue
        cursor = i + 1
        return event
      }
      return undefined
    })

  const consumeNextResourceSnapshot = (params: {
    readonly resourceId: string
    readonly fieldPath: string
    readonly keyHash?: string
    readonly phase?: ResourceSnapshotPhase
  }): Effect.Effect<ResourceSnapshotEvent | undefined> =>
    consumeNext((event): event is ResourceSnapshotEvent => {
      if (event._tag !== 'ResourceSnapshot') return false
      if (event.resourceId !== params.resourceId) return false
      if (event.fieldPath !== params.fieldPath) return false
      if (params.keyHash !== undefined && event.keyHash !== params.keyHash) {
        return false
      }
      if (params.phase !== undefined && event.phase !== params.phase) {
        return false
      }
      return true
    }).pipe(Effect.map((event) => event as ResourceSnapshotEvent | undefined))

  return {
    record: (event) => Effect.sync(() => events.push(event)),
    snapshot: Effect.sync(() => events.slice()),
    resetCursor: Effect.sync(() => {
      cursor = 0
    }),
    consumeNext,
    consumeNextResourceSnapshot,
  }
}

export const layer = (initial?: ReadonlyArray<ReplayLogEvent>): Layer.Layer<ReplayLog, never, never> =>
  Layer.succeed(ReplayLog, make(initial))

export const record = (event: ReplayLogEvent): Effect.Effect<void, never, ReplayLog> =>
  Effect.gen(function* () {
    const log = yield* ReplayLog
    yield* log.record(event)
  })

export const snapshot: Effect.Effect<ReadonlyArray<ReplayLogEvent>, never, ReplayLog> = Effect.gen(function* () {
  const log = yield* ReplayLog
  return yield* log.snapshot
})

export const resetCursor: Effect.Effect<void, never, ReplayLog> = Effect.gen(function* () {
  const log = yield* ReplayLog
  yield* log.resetCursor
})

export const consumeNextResourceSnapshot = (params: {
  readonly resourceId: string
  readonly fieldPath: string
  readonly keyHash?: string
  readonly phase?: ResourceSnapshotPhase
}): Effect.Effect<ResourceSnapshotEvent | undefined, never, ReplayLog> =>
  Effect.gen(function* () {
    const log = yield* ReplayLog
    return yield* log.consumeNextResourceSnapshot(params)
  })
