import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useRuntime, useModule } from '../../src/Hooks.js'

describe('Root.resolve (React integration)', () => {
  it('useModule(ModuleTag) is affected by RuntimeProvider.layer; Root.resolve is fixed to root provider', async () => {
    const Counter = Logix.Module.make('useRootResolveCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const CounterImpl = Counter.implement({ initial: { count: 0 } })

    const rootRuntime = Logix.Runtime.make(CounterImpl)
    const otherTree = Logix.Runtime.make(CounterImpl)

    try {
      const rootSingleton = rootRuntime.runSync(Counter.tag as any) as Logix.ModuleRuntime<any, any>
      const otherSingleton = otherTree.runSync(Counter.tag as any) as Logix.ModuleRuntime<any, any>

      const overrideLayer = Layer.succeed(Counter.tag as any, otherSingleton as any)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeProvider runtime={rootRuntime}>
          <RuntimeProvider layer={overrideLayer}>{children}</RuntimeProvider>
        </RuntimeProvider>
      )

      const { result, unmount } = renderHook(
        () => {
          const overridden = useModule(Counter).runtime
          const runtime = useRuntime()
          const rootResolved = runtime.runSync(Logix.Root.resolve(Counter.tag as any)) as Logix.ModuleRuntime<any, any>
          return { overridden, rootResolved }
        },
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current).not.toBeNull()
        expect(result.current.overridden).toBe(otherSingleton)
        expect(result.current.rootResolved).toBe(rootSingleton)
        expect(result.current.rootResolved).not.toBe(result.current.overridden)
      })

      unmount()
      await new Promise((r) => setTimeout(r, 0))
    } finally {
      await otherTree.dispose()
      await rootRuntime.dispose()
    }
  })
})
