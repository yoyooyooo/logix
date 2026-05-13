import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { performance } from 'node:perf_hooks'
import { createHotLifecycleOwner } from '../../../src/internal/runtime/core/hotLifecycle/index.js'

const measure = (run: () => void, iterations: number): number => {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    run()
  }
  return performance.now() - t0
}

describe('hot lifecycle bookkeeping perf boundary', () => {
  it('keeps empty-owner status and summary bookkeeping measurable', () => {
    const owner = createHotLifecycleOwner({
      ownerId: 'perf-empty-owner',
      runtimeInstanceId: 'runtime:1',
    })

    const iterations = 10_000
    const elapsedMs = measure(() => {
      owner.getStatus()
      owner.registry.summary()
    }, iterations)

    expect(Number.isFinite(elapsedMs)).toBe(true)
    expect(elapsedMs).toBeLessThan(250)
  })

  it('keeps repeated reset cleanup bounded for a fixed active resource set', async () => {
    const iterations = 100
    const resourcesPerReset = 8
    const owner = createHotLifecycleOwner({
      ownerId: 'perf-reset-owner',
      runtimeInstanceId: 'runtime:0',
    })

    const t0 = performance.now()
    for (let i = 1; i <= iterations; i++) {
      for (let j = 0; j < resourcesPerReset; j++) {
        owner.registry.register({
          ownerId: owner.ownerId,
          resourceId: `resource:${i}:${j}`,
          category: j % 2 === 0 ? 'task' : 'timer',
          cleanup: () => Effect.void,
        })
      }
      const event = await Effect.runPromise(owner.reset({ nextRuntimeInstanceId: `runtime:${i}` }))
      expect(event.residualActiveCount).toBe(0)
    }
    const elapsedMs = performance.now() - t0

    expect(elapsedMs).toBeLessThan(500)
  })
})
