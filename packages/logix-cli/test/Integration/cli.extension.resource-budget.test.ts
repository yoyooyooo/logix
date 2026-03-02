import { describe, expect, it } from 'vitest'

import { ResourceBudgetExecutor, type ResourceBudgetEvent } from '../../src/internal/extension-host/resourceBudget.js'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('logix-cli integration (extension resource budget)', () => {
  it('falls back on timeout budget and keeps host executor usable', async () => {
    const events: ResourceBudgetEvent[] = []
    const executor = new ResourceBudgetExecutor({
      timeoutMs: 5,
      maxQueueSize: 2,
    })

    const degraded = await executor.runWithFallback({
      label: 'timeout-case',
      task: async () => {
        await sleep(20)
        return 'main-value'
      },
      fallback: async () => 'fallback-value',
      recorder: (event) => {
        events.push(event)
      },
    })

    expect(degraded.ok).toBe(false)
    expect(degraded.usedFallback).toBe(true)
    expect(degraded.value).toBe('fallback-value')
    if (!degraded.ok) {
      expect(degraded.error.code).toBe('EXT_HOOK_TIMEOUT')
    }

    expect(events.some((event) => event.event === 'fallback.applied')).toBe(true)

    const healthy = await executor.runWithFallback({
      label: 'healthy-case',
      task: async () => 'healthy-value',
      fallback: async () => 'should-not-be-used',
    })

    expect(healthy.ok).toBe(true)
    expect(healthy.usedFallback).toBe(false)
    expect(healthy.value).toBe('healthy-value')
  })

  it('rejects new work when queue budget is exceeded', async () => {
    const executor = new ResourceBudgetExecutor({
      timeoutMs: 100,
      maxQueueSize: 1,
    })

    const first = executor.runWithBudget({
      label: 'first',
      task: async () => {
        await sleep(30)
        return 'first-value'
      },
    })

    await expect(
      executor.runWithBudget({
        label: 'second',
        task: async () => 'second-value',
      }),
    ).rejects.toThrowError(/队列超限/)

    await expect(first).resolves.toMatchObject({
      value: 'first-value',
    })
  })
})
