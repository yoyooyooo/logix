// @vitest-environment happy-dom

import React, { useEffect } from 'react'
import { describe, it, expect } from 'vitest'
import { render, renderHook, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

describe('RuntimeProvider.onError (nested providers)', () => {
  it('should call nested Provider onError from inner to outer', async () => {
    const Broken = Logix.Module.make('BrokenForNestedProvider.Integration', {
      state: Schema.Void,
      actions: {},
    })
    const brokenLogic = Broken.logic(() => Effect.die(new Error('nested boom')))
    const BrokenImpl = Broken.implement({
      initial: undefined,
      logics: [brokenLogic],
    })

    const Root = Logix.Module.make('RootNestedProvider.Integration', {
      state: Schema.Void,
      actions: {},
    })
    const RootImpl = Root.implement({
      initial: undefined,
      imports: [BrokenImpl.impl],
    })

    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const order: Array<'inner' | 'outer'> = []

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider
        runtime={runtime}
        onError={(_cause, _context) =>
          Effect.sync(() => {
            order.push('outer')
          })
        }
      >
        <RuntimeProvider
          onError={(_cause, _context) =>
            Effect.sync(() => {
              order.push('inner')
            })
          }
        >
          {children}
        </RuntimeProvider>
      </RuntimeProvider>
    )

    renderHook(() => useModule(BrokenImpl), { wrapper })

    await waitFor(() => expect(order.length).toBeGreaterThanOrEqual(2))
    expect(order[0]).toBe('inner')
    expect(order[1]).toBe('outer')
  })

  it('should not break ModuleCache reuse when Provider rerenders', async () => {
    const Stable = Logix.Module.make('StableForNestedProviderCache', {
      state: Schema.Void,
      actions: {},
    })
    const StableImpl = Stable.implement({ initial: undefined })

    const Root = Logix.Module.make('RootNestedProviderCache', {
      state: Schema.Void,
      actions: {},
    })
    const RootImpl = Root.implement({
      initial: undefined,
      imports: [StableImpl.impl],
    })

    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const seen: Array<{ readonly nonce: number; readonly a: string; readonly b: string }> = []

    const App = ({ nonce }: { nonce: number }) => {
      const a = useModule(StableImpl, { key: 'shared' })
      const b = useModule(StableImpl, { key: 'shared' })
      useEffect(() => {
        seen.push({ nonce, a: a.runtime.instanceId!, b: b.runtime.instanceId! })
      }, [nonce, a.runtime.instanceId, b.runtime.instanceId])
      return null
    }

    const { rerender } = render(
      <RuntimeProvider runtime={runtime} onError={(_cause, _context) => Effect.void}>
        <RuntimeProvider onError={(_cause, _context) => Effect.void}>
          <App nonce={1} />
        </RuntimeProvider>
      </RuntimeProvider>,
    )

    await waitFor(() => expect(seen.length).toBeGreaterThanOrEqual(1))
    expect(seen[0].a).toBe(seen[0].b)

    rerender(
      <RuntimeProvider runtime={runtime} onError={(_cause, _context) => Effect.void}>
        <RuntimeProvider onError={(_cause, _context) => Effect.void}>
          <App nonce={2} />
        </RuntimeProvider>
      </RuntimeProvider>,
    )

    await waitFor(() => expect(seen.some((x) => x.nonce === 2)).toBe(true))

    const first = seen.find((x) => x.nonce === 1)!
    const second = seen.find((x) => x.nonce === 2)!
    expect(second.a).toBe(first.a)
  })
})
