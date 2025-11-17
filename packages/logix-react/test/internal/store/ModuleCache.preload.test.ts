import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer, ManagedRuntime } from 'effect'
import { ModuleCache, type ModuleCacheFactory } from '../../../src/internal/store/ModuleCache.js'

describe('ModuleCache.preload', () => {
  it('dedupes concurrent preloads and runs factory once', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const cache = new ModuleCache(runtime, 1000)

    let calls = 0
    const factory: ModuleCacheFactory<{ instanceId: string }> = () =>
      Effect.sync(() => {
        calls += 1
        return { instanceId: 'x' }
      })

    const op1 = cache.preload('k', factory, { yield: { strategy: 'none' } })
    const op2 = cache.preload('k', factory, { yield: { strategy: 'none' } })

    const v1 = await op1.promise
    const v2 = await op2.promise

    expect(calls).toBe(1)
    expect(v1).toBe(v2)

    op1.cancel()
    op2.cancel()
  })

  it('cancels a pending preload when the last holder releases', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const cache = new ModuleCache(runtime, 1000)

    const neverFactory: ModuleCacheFactory<{ instanceId: string }> = () =>
      Effect.never as unknown as Effect.Effect<{ instanceId: string }, unknown, unknown>

    const op = cache.preload('k', neverFactory, { yield: { strategy: 'none' } })
    op.cancel()

    await expect(op.promise).rejects.toBeDefined()

    const entries = (cache as any).entries as Map<string, unknown>
    expect(entries.has('k')).toBe(false)
  })

  it('keeps a pending preload alive while other holders exist', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const cache = new ModuleCache(runtime, 1000)

    let calls = 0
    const neverFactory: ModuleCacheFactory<{ instanceId: string }> = () =>
      Effect.sync(() => {
        calls += 1
      }).pipe(Effect.zipRight(Effect.never as unknown as Effect.Effect<{ instanceId: string }, unknown, unknown>))

    const op1 = cache.preload('k', neverFactory, { yield: { strategy: 'none' } })
    const op2 = cache.preload('k', neverFactory, { yield: { strategy: 'none' } })

    const entries = (cache as any).entries as Map<string, unknown>
    // preload 使用 runFork 启动后台任务，执行时机可能落在下一轮 tick
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls).toBe(1)

    op1.cancel()
    expect(entries.has('k')).toBe(true)

    op2.cancel()
    await expect(op1.promise).rejects.toBeDefined()
    expect(entries.has('k')).toBe(false)
  })

  it('uses short GC for errored preload entries once released', async () => {
    vi.useFakeTimers()
    try {
      const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
      const cache = new ModuleCache(runtime, 10_000)

      const factory: ModuleCacheFactory<{ instanceId: string }> = () => Effect.fail('boom' as unknown)

      const op = cache.preload('k', factory, { yield: { strategy: 'none' }, gcTime: 10_000 })
      await expect(op.promise).rejects.toBe('boom')

      op.cancel()

      const entries = (cache as any).entries as Map<string, unknown>
      expect(entries.has('k')).toBe(true)

      await vi.advanceTimersByTimeAsync(499)
      expect(entries.has('k')).toBe(true)

      await vi.advanceTimersByTimeAsync(1)
      expect(entries.has('k')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('GCs a successful preload entry after the last cancel', async () => {
    vi.useFakeTimers()
    try {
      const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
      const cache = new ModuleCache(runtime, 1000)

      const factory: ModuleCacheFactory<{ instanceId: string }> = () => Effect.succeed({ instanceId: 'ok' })

      const op = cache.preload('k', factory, { yield: { strategy: 'none' }, gcTime: 10 })
      await expect(op.promise).resolves.toEqual({ instanceId: 'ok' })

      const entries = (cache as any).entries as Map<string, unknown>
      expect(entries.has('k')).toBe(true)

      op.cancel()

      await vi.advanceTimersByTimeAsync(9)
      expect(entries.has('k')).toBe(true)

      await vi.advanceTimersByTimeAsync(1)
      expect(entries.has('k')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
