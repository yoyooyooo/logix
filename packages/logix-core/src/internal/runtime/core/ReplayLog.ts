import { Context, Effect, Layer } from 'effect'

export type ResourceSnapshotPhase = 'idle' | 'loading' | 'success' | 'error'

export type StaticIrLookupKey = {
  readonly staticIrDigest: string
  readonly nodeId?: number
  readonly stepId?: string
}

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
      /**
       * Optional canonical lookup key for digest-first consumers:
       * - staticIrDigest + nodeId/stepId is preferred over ad-hoc payload parsing.
       * - fieldPath remains as compatibility fallback during staged migration.
       */
      readonly lookupKey?: StaticIrLookupKey
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
    readonly moduleId?: string
    readonly instanceId?: string
    readonly lookupKey?: StaticIrLookupKey
    readonly scopeFallbackMode?: 'legacy_only' | 'module_or_legacy'
  }) => Effect.Effect<ResourceSnapshotEvent | undefined>
}

export class ReplayLog extends Context.Tag('@logixjs/core/ReplayLog')<ReplayLog, ReplayLogService>() {}

export const make = (initial?: ReadonlyArray<ReplayLogEvent>): ReplayLogService => {
  const events: Array<ReplayLogEvent> = initial ? Array.from(initial) : []
  let cursor = 0
  const resourceSnapshotCursorByScope = new Map<string, number>()

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
    readonly moduleId?: string
    readonly instanceId?: string
    readonly lookupKey?: StaticIrLookupKey
    readonly scopeFallbackMode?: 'legacy_only' | 'module_or_legacy'
  }): Effect.Effect<ResourceSnapshotEvent | undefined> =>
    Effect.sync(() => {
      let moduleScopeFallbackIndex = -1
      let legacyScopeFallbackIndex = -1
      const scopeFallbackMode = params.scopeFallbackMode ?? 'legacy_only'
      const scopeCursorKey =
        params.moduleId !== undefined || params.instanceId !== undefined
          ? JSON.stringify([params.moduleId ?? null, params.instanceId ?? null])
          : undefined
      const startCursor = scopeCursorKey ? (resourceSnapshotCursorByScope.get(scopeCursorKey) ?? 0) : cursor

      const isBaseMatch = (event: ReplayLogEvent): event is ResourceSnapshotEvent => {
        if (event._tag !== 'ResourceSnapshot') return false
        if (event.resourceId !== params.resourceId) return false
        if (params.keyHash !== undefined && event.keyHash !== params.keyHash) {
          return false
        }
        if (params.phase !== undefined && event.phase !== params.phase) {
          return false
        }
        if (params.lookupKey) {
          const lookupKey = event.lookupKey
          if (lookupKey) {
            if (lookupKey.staticIrDigest !== params.lookupKey.staticIrDigest) return false
            if (params.lookupKey.nodeId !== undefined && lookupKey.nodeId !== params.lookupKey.nodeId) return false
            if (params.lookupKey.stepId !== undefined && lookupKey.stepId !== params.lookupKey.stepId) return false
            const hasStrongLookupSelector = params.lookupKey.nodeId !== undefined || params.lookupKey.stepId !== undefined
            if (!hasStrongLookupSelector && event.fieldPath !== params.fieldPath) return false
          } else if (event.fieldPath !== params.fieldPath) {
            // Legacy compatibility: old records without lookupKey still fall back to fieldPath matching.
            return false
          }
        } else if (event.fieldPath !== params.fieldPath) {
          return false
        }
        return true
      }

      const isScopeStrictMatch = (event: ResourceSnapshotEvent): boolean => {
        if (params.moduleId !== undefined && event.moduleId !== params.moduleId) return false
        if (params.instanceId !== undefined && event.instanceId !== params.instanceId) return false
        return true
      }

      const isLegacyScopeMissing = (event: ResourceSnapshotEvent): boolean =>
        event.moduleId === undefined && event.instanceId === undefined

      const isModuleScopeFallbackMatch = (event: ResourceSnapshotEvent): boolean =>
        scopeFallbackMode === 'module_or_legacy' && params.moduleId !== undefined && event.moduleId === params.moduleId

      for (let i = startCursor; i < events.length; i++) {
        const event = events[i]
        if (!isBaseMatch(event)) continue

        if (isScopeStrictMatch(event)) {
          if (scopeCursorKey) {
            resourceSnapshotCursorByScope.set(scopeCursorKey, i + 1)
          } else {
            cursor = i + 1
          }
          return event
        }

        if (moduleScopeFallbackIndex < 0 && isModuleScopeFallbackMatch(event)) {
          moduleScopeFallbackIndex = i
          continue
        }

        if (legacyScopeFallbackIndex < 0 && isLegacyScopeMissing(event)) {
          legacyScopeFallbackIndex = i
        }
      }

      const fallbackIndex =
        moduleScopeFallbackIndex >= 0 && legacyScopeFallbackIndex >= 0
          ? Math.min(moduleScopeFallbackIndex, legacyScopeFallbackIndex)
          : moduleScopeFallbackIndex >= 0
            ? moduleScopeFallbackIndex
            : legacyScopeFallbackIndex
      if (fallbackIndex >= 0) {
        if (scopeCursorKey) {
          resourceSnapshotCursorByScope.set(scopeCursorKey, fallbackIndex + 1)
        } else {
          cursor = fallbackIndex + 1
        }
        return events[fallbackIndex] as ResourceSnapshotEvent
      }

      return undefined
    })

  return {
    record: (event) => Effect.sync(() => events.push(event)),
    snapshot: Effect.sync(() => events.slice()),
    resetCursor: Effect.sync(() => {
      cursor = 0
      resourceSnapshotCursorByScope.clear()
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
  readonly moduleId?: string
  readonly instanceId?: string
  readonly lookupKey?: StaticIrLookupKey
  readonly scopeFallbackMode?: 'legacy_only' | 'module_or_legacy'
}): Effect.Effect<ResourceSnapshotEvent | undefined, never, ReplayLog> =>
  Effect.gen(function* () {
    const log = yield* ReplayLog
    return yield* log.consumeNextResourceSnapshot(params)
  })
