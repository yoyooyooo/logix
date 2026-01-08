// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer, Scope, Schema, ManagedRuntime } from 'effect'
import * as Logix from '@logixjs/core'
import { render } from '@testing-library/react'
import { ModuleCache } from '../../src/internal/store/ModuleCache.js'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'

const Root = Logix.Module.make('BestEffortCleanupRoot', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

const RootImpl = Root.implement({ initial: { ok: true } })

describe('best-effort cleanup diagnostics', () => {
  it('ModuleCache should not silently swallow Scope.close / Debug.record defects in dev/test', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    const failingSink: Logix.Debug.Sink = {
      record: (event) =>
        (event as any)?.type === 'trace:react.module-instance' ? Effect.die(new Error('debug sink boom')) : Effect.void,
    }

    const failingDebugLayer = Layer.locallyScoped(Logix.Debug.internal.currentDebugSinks, [
      failingSink,
    ]) as unknown as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(RootImpl, {
      layer: failingDebugLayer,
    })

    const cache = new ModuleCache(runtime, 0)

    let suspended: Promise<unknown> | null = null
    try {
      cache.read(
        'best-effort',
        (scope) =>
          Effect.gen(function* () {
            yield* Scope.addFinalizer(scope, Effect.die(new Error('scope finalizer boom')))
            return { id: 'rt-best-effort' } as any
          }),
        Infinity,
        'BestEffortCleanupRoot',
      )
    } catch (error) {
      suspended = error as Promise<unknown>
    }

    expect(suspended).toBeInstanceOf(Promise)
    await suspended

    await new Promise((resolve) => setTimeout(resolve, 0))
    cache.dispose()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(
      debugSpy.mock.calls.some(
        (call) =>
          String(call[0]).includes('[ModuleCache]') &&
          String(call[0]).includes('Debug.record failed') &&
          typeof call[1] === 'string',
      ),
    ).toBe(true)

    expect(
      debugSpy.mock.calls.some(
        (call) =>
          String(call[0]).includes('[ModuleCache]') &&
          String(call[0]).includes('Scope.close failed') &&
          typeof call[1] === 'string',
      ),
    ).toBe(true)

    debugSpy.mockRestore()
    await runtime.dispose()
  })

  it('RuntimeProvider should not silently swallow Scope.close defects in dev/test', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    const baseRuntime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const failingFinalizerLayer = Layer.scopedDiscard(
      Effect.addFinalizer(() => Effect.die(new Error('layer finalizer boom'))),
    ) as unknown as Layer.Layer<any, any, never>

    const { unmount } = render(
      <RuntimeProvider runtime={baseRuntime} layer={failingFinalizerLayer}>
        <div />
      </RuntimeProvider>,
    )

    unmount()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(
      debugSpy.mock.calls.some(
        (call) =>
          String(call[0]).includes('[RuntimeProvider]') &&
          String(call[0]).includes('Scope.close failed') &&
          typeof call[1] === 'string',
      ),
    ).toBe(true)

    debugSpy.mockRestore()
    await baseRuntime.dispose()
  })
})
