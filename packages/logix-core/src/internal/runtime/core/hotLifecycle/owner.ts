import { Effect } from 'effect'
import { createHotLifecycleCleanupCoordinator } from './cleanup.js'
import { makeHotLifecycleCleanupId } from './identity.js'
import { createHotLifecycleResourceRegistry } from './resourceRegistry.js'
import { makeHotLifecycleEvidence } from './evidence.js'
import * as Debug from '../DebugSink.js'
import type {
  HostBindingCleanupSummary,
  HotLifecycleReason,
  RuntimeHotLifecycleOwner,
  RuntimeHotLifecycleTransition,
} from './types.js'

export const createHotLifecycleOwner = (args: {
  readonly ownerId: string
  readonly runtimeInstanceId: string
  readonly cleanup?: () => Effect.Effect<void, never, never>
}): RuntimeHotLifecycleOwner => {
  const registry = createHotLifecycleResourceRegistry({ ownerId: args.ownerId })
  let runtimeInstanceId = args.runtimeInstanceId
  let disposed = false
  let eventSeq = 0
  let cleanupSeq = 0
  let lastTransition:
    | {
        readonly decision: 'reset' | 'dispose'
        readonly runtimeInstanceId: string
        readonly event: RuntimeHotLifecycleTransition
      }
    | undefined

  const makeCoordinator = () => {
    cleanupSeq += 1
    return createHotLifecycleCleanupCoordinator({
      cleanupId: makeHotLifecycleCleanupId(args.ownerId, cleanupSeq),
      cleanup: () =>
        Effect.gen(function* () {
          yield* registry.cleanupActive()
          if (args.cleanup) {
            yield* args.cleanup()
          }
        }),
    })
  }

  let coordinator = makeCoordinator()

  const makeIdempotentEvent = (event: RuntimeHotLifecycleTransition): RuntimeHotLifecycleTransition => ({
    ...event,
    idempotent: true,
  })

  const runTransition = (options: {
    readonly decision: 'reset' | 'dispose'
    readonly reason: HotLifecycleReason
    readonly nextRuntimeInstanceId?: string
    readonly hostCleanupSummary?: HostBindingCleanupSummary
  }): Effect.Effect<RuntimeHotLifecycleTransition, never, never> => {
    if (
      options.decision === 'reset' &&
      options.nextRuntimeInstanceId &&
      lastTransition?.decision === 'reset' &&
      lastTransition.runtimeInstanceId === options.nextRuntimeInstanceId &&
      runtimeInstanceId === options.nextRuntimeInstanceId
    ) {
      return Effect.succeed(makeIdempotentEvent(lastTransition.event))
    }

    if (options.decision === 'dispose' && disposed && lastTransition?.decision === 'dispose') {
      return Effect.succeed(makeIdempotentEvent(lastTransition.event))
    }

    return Effect.gen(function* () {
      eventSeq += 1
      const previousRuntimeInstanceId = runtimeInstanceId
      if (options.decision === 'reset' && options.nextRuntimeInstanceId) {
        runtimeInstanceId = options.nextRuntimeInstanceId
        disposed = false
      } else if (options.decision === 'dispose') {
        disposed = true
      }
      const cleanupResult = yield* coordinator.run()
      const event = makeHotLifecycleEvidence({
        ownerId: args.ownerId,
        eventSeq,
        decision: options.decision,
        reason: options.reason,
        previousRuntimeInstanceId,
        nextRuntimeInstanceId: options.nextRuntimeInstanceId,
        cleanupId: cleanupResult.cleanupId,
        resourceSummary: registry.summary(),
        hostCleanupSummary: options.hostCleanupSummary,
        cleanupStatus: cleanupResult.status,
        idempotent: cleanupResult.idempotent,
        errors: cleanupResult.errors,
      })

      if (options.decision === 'reset' && options.nextRuntimeInstanceId) {
        lastTransition = {
          decision: 'reset',
          runtimeInstanceId,
          event,
        }
        coordinator = makeCoordinator()
      } else {
        lastTransition = {
          decision: 'dispose',
          runtimeInstanceId,
          event,
        }
      }

      yield* Debug.record({
        type: 'runtime.hot-lifecycle',
        event,
      }).pipe(Effect.catchCause(() => Effect.void))

      return event
    })
  }

  return {
    ownerId: args.ownerId,
    registry,
    reset: (resetArgs) =>
      runTransition({
        decision: 'reset',
        reason: resetArgs.reason ?? 'hot-update',
        nextRuntimeInstanceId: resetArgs.nextRuntimeInstanceId,
        hostCleanupSummary: resetArgs.hostCleanupSummary,
      }),
    dispose: (disposeArgs) =>
      runTransition({
        decision: 'dispose',
        reason: disposeArgs?.reason ?? 'dispose-without-successor',
        hostCleanupSummary: disposeArgs?.hostCleanupSummary,
      }),
    getStatus: () => ({
      ownerId: args.ownerId,
      runtimeInstanceId,
      disposed,
      eventSeq,
      cleanupSeq,
    }),
  }
}
