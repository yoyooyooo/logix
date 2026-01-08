// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, renderHook, waitFor } from '@testing-library/react'
import { Cause, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

describe('RuntimeProvider onError (observer bridge)', () => {
  it('should call onError when Provider.layer build fails and render fallback', async () => {
    const Root = Logix.Module.make('RootProviderOnErrorLayerFail', {
      state: Schema.Void,
      actions: {},
    })
    const runtime = Logix.Runtime.make(Root.implement({ initial: undefined }), {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    let calls = 0
    let lastContext: any = null

    const failingLayer = Layer.scopedDiscard(Effect.die(new Error('layer build failed'))) as unknown as Layer.Layer<
      any,
      any,
      never
    >

    render(
      <RuntimeProvider
        runtime={runtime}
        layer={failingLayer}
        fallback={<div data-testid="fallback" />}
        onError={(_cause, context) =>
          Effect.sync(() => {
            calls += 1
            lastContext = context
          })
        }
      >
        <div data-testid="child" />
      </RuntimeProvider>,
    )

    await waitFor(() => expect(calls).toBe(1))
    expect(lastContext?.source).toBe('provider')
    expect(lastContext?.phase).toBe('provider.layer.build')
    expect(document.querySelector("[data-testid='fallback']")).toBeTruthy()
    expect(document.querySelector("[data-testid='child']")).toBeFalsy()
  })

  it('should call onError when a module emits lifecycle:error', async () => {
    const Broken = Logix.Module.make('BrokenForProviderOnError', {
      state: Schema.Void,
      actions: {},
    })
    const brokenLogic = Broken.logic(() => Effect.die(new Error('boom')))
    const BrokenImpl = Broken.implement({
      initial: undefined,
      logics: [brokenLogic],
    })

    const Root = Logix.Module.make('RootProviderOnErrorModule', {
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

    let seen: { readonly cause: Cause.Cause<unknown>; readonly context: any } | null = null

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider
        runtime={runtime}
        onError={(cause, context) =>
          Effect.sync(() => {
            if (!seen) {
              seen = { cause, context }
            }
          })
        }
      >
        {children}
      </RuntimeProvider>
    )

    renderHook(() => useModule(BrokenImpl), { wrapper })

    await waitFor(() => expect(seen).not.toBeNull())
    expect(seen!.context.source).toBe('provider')
    expect(seen!.context.phase).toBe('debug.lifecycle_error')
    expect(seen!.context.moduleId).toBe('BrokenForProviderOnError')
    expect(Cause.pretty(seen!.cause)).toContain('boom')
  })

  it('should call nested Provider onError from inner to outer', async () => {
    const Broken = Logix.Module.make('BrokenForNestedProvider', {
      state: Schema.Void,
      actions: {},
    })
    const brokenLogic = Broken.logic(() => Effect.die(new Error('nested boom')))
    const BrokenImpl = Broken.implement({
      initial: undefined,
      logics: [brokenLogic],
    })

    const Root = Logix.Module.make('RootNestedProvider', {
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
})
