import { describe, it, expect, beforeEach, vi } from 'vitest'
// @vitest-environment happy-dom

let scopeMakeCount = 0

vi.mock('effect', async () => {
  const actual = await vi.importActual<typeof import('effect')>('effect')
  return {
    ...actual,
    Scope: {
      ...actual.Scope,
      make: (...args: Parameters<typeof actual.Scope.make>) => {
        scopeMakeCount += 1
        return actual.Scope.make(...args)
      },
    },
  }
})

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('useSelectorReadQueryRetainScopeCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const makeRuntime = (events: Logix.Debug.Event[]) => {
  const debugLayer = Logix.Debug.replace([
    {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    },
  ]) as Layer.Layer<any, never, never>

  const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>
  const counterLayer = Counter.live({ count: 0 }) as Layer.Layer<any, never, any>

  const layer = Layer.mergeAll(
    tickServicesLayer,
    Layer.provide(counterLayer, tickServicesLayer),
    debugLayer as Layer.Layer<any, never, any>,
  ) as Layer.Layer<any, never, never>
  return ManagedRuntime.make(layer)
}

describe('useSelector(readQuery retain scope)', () => {
  beforeEach(() => {
    scopeMakeCount = 0
  })

  it('does not allocate a new Scope for static selector activation retain', async () => {
    const events: Logix.Debug.Event[] = []
    const runtime = makeRuntime(events)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    type CounterAction = { readonly _tag: 'inc'; readonly payload?: void }
    const baseHandle = runtime.runSync(Effect.service(Counter.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
      { count: number },
      CounterAction
    >

    const selector = Object.assign((s: { readonly count: number }) => s.count, {
      fieldPaths: ['count'],
    })

    const mounted = renderHook(() => useModule(baseHandle, selector as any), { wrapper })

    await waitFor(() => {
      expect(mounted.result.current).toBe(0)
    })

    expect(scopeMakeCount).toBe(0)

    mounted.unmount()
  })
})
