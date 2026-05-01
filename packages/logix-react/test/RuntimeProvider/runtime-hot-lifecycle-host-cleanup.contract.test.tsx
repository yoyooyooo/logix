// @vitest-environment happy-dom

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Layer, ManagedRuntime } from 'effect'
import { createLogixDevLifecycleCarrier } from '../../src/dev/lifecycle.js'
import {
  disposeHostBindingsForRuntime,
  registerRuntimeHostBindingDisposer,
} from '../../src/internal/provider/runtimeHotLifecycle.js'
import { registerRuntimeExternalStoreDisposer } from '../../src/internal/store/RuntimeExternalStore.hotLifecycle.js'
import { RuntimeProvider } from '../../src/index.js'

afterEach(() => {
  cleanup()
})

describe('React runtime hot lifecycle host cleanup evidence', () => {
  it('includes external store and provider overlay cleanup in reset evidence', async () => {
    const runtimeA = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const runtimeB = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'react-host-cleanup-reset', hostKind: 'vitest' })
    let externalClosed = 0

    registerRuntimeExternalStoreDisposer(runtimeA as unknown as object, 'Counter::i1', () => {
      externalClosed += 1
    })
    registerRuntimeHostBindingDisposer(runtimeA as unknown as object, 'provider-layer-overlay:manual', () => undefined)

    const binding = carrier.bindRuntime({
      runtime: runtimeA,
      ownerId: 'react-host-cleanup-reset',
      runtimeInstanceId: 'runtime:A',
    })
    const event = await runtimeA.runPromise(
      binding.reset({
        nextRuntime: runtimeB,
        nextRuntimeInstanceId: 'runtime:B',
      }),
    )

    expect(event.hostCleanupSummary?.['external-store-listener']).toEqual({ closed: 1, failed: 0 })
    expect(event.hostCleanupSummary?.['provider-layer-overlay']).toEqual({ closed: 1, failed: 0 })
    expect(externalClosed).toBe(1)

    await runtimeB.dispose()
    await runtimeA.dispose()
  })

  it('cleans provider overlay binding on unmount through the shared host cleanup registry', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const mounted = render(
      <RuntimeProvider runtime={runtime} layer={Layer.empty as Layer.Layer<any, never, never>}>
        <div>mounted</div>
      </RuntimeProvider>,
    )

    mounted.unmount()

    expect(disposeHostBindingsForRuntime(runtime)).toEqual({})
    await runtime.dispose()
  })

  it('summarizes provider overlay cleanup failures without entering core resource taxonomy', async () => {
    const runtimeA = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const runtimeB = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'react-host-cleanup-failure', hostKind: 'vitest' })
    registerRuntimeHostBindingDisposer(runtimeA as unknown as object, 'provider-layer-overlay:failing', () => {
      throw new Error('close failed')
    })

    const binding = carrier.bindRuntime({
      runtime: runtimeA,
      ownerId: 'react-host-cleanup-failure',
      runtimeInstanceId: 'runtime:A',
    })
    const event = await runtimeA.runPromise(
      binding.reset({
        nextRuntime: runtimeB,
        nextRuntimeInstanceId: 'runtime:B',
      }),
    )

    expect(event.hostCleanupSummary?.['provider-layer-overlay']).toEqual({ closed: 0, failed: 1 })
    expect((event.resourceSummary as any)['provider-layer-overlay']).toBeUndefined()

    await runtimeB.dispose()
    await runtimeA.dispose()
  })
})
