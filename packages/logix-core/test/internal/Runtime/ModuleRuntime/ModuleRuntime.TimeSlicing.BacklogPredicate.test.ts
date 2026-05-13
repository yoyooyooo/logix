import { describe, expect, it } from '@effect/vitest'
import { hasFieldConvergeTimeSlicingBacklog } from '../../../../src/internal/runtime/core/ModuleRuntime.transaction.js'

describe('ModuleRuntime time-slicing backlog predicate', () => {
  it('treats deferred step ids as pending work even when dirty paths are empty', () => {
    expect(
      hasFieldConvergeTimeSlicingBacklog({
        backlogDeferredStepIds: [1],
        backlogDirtyPaths: new Set(),
        backlogDirtyAllReason: undefined,
      }),
    ).toBe(true)
  })

  it('keeps empty backlog as not pending', () => {
    expect(
      hasFieldConvergeTimeSlicingBacklog({
        backlogDeferredStepIds: [],
        backlogDirtyPaths: new Set(),
        backlogDirtyAllReason: undefined,
      }),
    ).toBe(false)
  })
})
