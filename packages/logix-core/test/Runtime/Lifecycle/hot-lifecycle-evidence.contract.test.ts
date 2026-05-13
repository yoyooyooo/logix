import { describe, expect, it } from 'vitest'
import {
  createHotLifecycleResourceRegistry,
  makeHotLifecycleEvidence,
} from '../../../src/internal/runtime/core/hotLifecycle/index.js'

describe('hot lifecycle evidence contract', () => {
  it('builds slim serializable reset evidence with core and host summaries', () => {
    const registry = createHotLifecycleResourceRegistry({ ownerId: 'task-runner' })
    registry.register({ resourceId: 'task:1', category: 'task', ownerId: 'task-runner' })
    registry.markClosing('task:1')
    registry.markClosed('task:1')

    const event = makeHotLifecycleEvidence({
      ownerId: 'task-runner',
      eventSeq: 1,
      decision: 'reset',
      reason: 'hot-update',
      previousRuntimeInstanceId: 'runtime:1',
      nextRuntimeInstanceId: 'runtime:2',
      cleanupId: 'task-runner::cleanup:1',
      resourceSummary: registry.summary(),
      hostCleanupSummary: {
        'external-store-listener': { closed: 1, failed: 0 },
      },
      errors: [],
    })

    expect(event.eventId).toBe('task-runner::hmr:1')
    expect(event.decision).toBe('reset')
    expect(event.resourceSummary.task.closed).toBe(1)
    expect(event.hostCleanupSummary?.['external-store-listener']?.closed).toBe(1)
    expect(() => JSON.stringify(event)).not.toThrow()
  })
})
