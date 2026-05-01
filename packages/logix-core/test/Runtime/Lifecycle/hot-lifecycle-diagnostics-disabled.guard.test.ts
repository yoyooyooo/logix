import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  createHotLifecycleOwner,
  makeHotLifecycleEvidence,
} from '../../../src/internal/runtime/core/hotLifecycle/index.js'
import * as Debug from '../../../src/internal/debug-api.js'

describe('hot lifecycle diagnostics-disabled correctness guard', () => {
  it.effect('cleans runtime resources even when debug diagnostics are off', () =>
    Effect.gen(function* () {
      let closed = 0
      const owner = createHotLifecycleOwner({
        ownerId: 'diag-off-owner',
        runtimeInstanceId: 'runtime:1',
      })
      owner.registry.register({
        ownerId: 'diag-off-owner',
        resourceId: 'timer:1',
        category: 'timer',
        cleanup: () =>
          Effect.sync(() => {
            closed += 1
          }),
      })

      yield* Debug.record({
        type: 'runtime.hot-lifecycle',
        event: makeHotLifecycleEvidence({
          ownerId: 'diag-off-owner',
          eventSeq: 1,
          decision: 'reset',
          reason: 'hot-update',
          previousRuntimeInstanceId: 'runtime:0',
          nextRuntimeInstanceId: 'runtime:1',
          cleanupId: 'diag-off-owner::cleanup:0',
          resourceSummary: owner.registry.summary(),
        }),
      })
      const event = yield* owner.dispose()

      expect(closed).toBe(1)
      expect(event.resourceSummary.timer.closed).toBe(1)
      expect(event.residualActiveCount).toBe(0)
    }).pipe(Effect.provide(Debug.diagnosticsLevel('off'))),
  )

  it.effect('does not make debug sink success required for lifecycle correctness', () =>
    Effect.gen(function* () {
      let closed = 0
      const owner = createHotLifecycleOwner({
        ownerId: 'diag-failing-sink-owner',
        runtimeInstanceId: 'runtime:1',
      })
      owner.registry.register({
        ownerId: 'diag-failing-sink-owner',
        resourceId: 'task:1',
        category: 'task',
        cleanup: () =>
          Effect.sync(() => {
            closed += 1
          }),
      })

      const event = yield* owner.reset({ nextRuntimeInstanceId: 'runtime:2' })

      expect(closed).toBe(1)
      expect(event.resourceSummary.task.closed).toBe(1)
      expect(event.residualActiveCount).toBe(0)
    }).pipe(
      Effect.provide(
        Debug.replace([
          {
            record: () => Effect.die(new Error('sink failed')),
          },
        ]),
      ),
    ),
  )
})
