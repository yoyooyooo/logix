import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

describe('useModule(module) (unwrap + handle-extend)', () => {
  it('should default to local impl and merge handle extension from module.tag', async () => {
    const Counter = Logix.Module.make('useModuleModuleHandleExtend', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
    ;(Counter.tag as any)[EXTEND_HANDLE] = (runtime: Logix.ModuleRuntime<any, any>, _base: unknown) => ({
      extra: `moduleId=${String(runtime.moduleId)}`,
    })

    const CounterModule = Counter.implement({ initial: { count: 0 }, logics: [] })

    // Prevent Debug.record from falling back to console in tests (avoids noisy output).
    const noopSink: Logix.Debug.Sink = { record: () => Effect.void }

    const runtime = Logix.Runtime.make(CounterModule, {
      layer: Layer.mergeAll(
        Layer.empty as Layer.Layer<any, never, never>,
        Logix.Debug.replace([noopSink]),
      ) as Layer.Layer<any, never, never>,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const local = useModule(CounterModule)
        const singleton = useModule(Counter.tag)
        return {
          local,
          singleton,
          localExtra: (local as any).extra as string | undefined,
          singletonExtra: (singleton as any).extra as string | undefined,
        }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(typeof result.current.local.runtime.instanceId).toBe('string')
      expect(typeof result.current.singleton.runtime.instanceId).toBe('string')
      expect(result.current.local.runtime.instanceId).not.toBe(result.current.singleton.runtime.instanceId)
      expect(result.current.localExtra).toContain('moduleId=')
      expect(result.current.singletonExtra).toContain('moduleId=')
    })

    await runtime.dispose()
  })
})
