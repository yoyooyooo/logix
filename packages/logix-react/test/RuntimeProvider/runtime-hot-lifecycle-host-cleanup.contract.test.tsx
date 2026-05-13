// @vitest-environment happy-dom

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Effect, Layer, ManagedRuntime } from 'effect'
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

const assertRuntimeRuns = async (runtime: ManagedRuntime.ManagedRuntime<any, any>): Promise<void> => {
  await expect(runtime.runPromise(Effect.succeed('alive'))).resolves.toBe('alive')
}

const assertRuntimeDisposed = async (runtime: ManagedRuntime.ManagedRuntime<any, any>): Promise<void> => {
  await expect(runtime.runPromise(Effect.succeed('alive'))).rejects.toThrow(/disposed/i)
}

describe('React runtime hot lifecycle host cleanup evidence', () => {
  it('cleans borrowed host bindings on reset without disposing the runtime', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'borrowed-reset-cleanup', hostKind: 'vitest' })
    let externalClosed = 0

    registerRuntimeExternalStoreDisposer(runtime as unknown as object, 'Counter::borrowed-reset', () => {
      externalClosed += 1
    })
    registerRuntimeHostBindingDisposer(runtime as unknown as object, 'provider-layer-overlay:borrowed-reset', () => undefined)

    const binding = carrier.bindRuntime({
      runtime,
      ownerId: 'borrowed-reset-cleanup',
      runtimeInstanceId: 'runtime:borrowed-reset',
    })
    const event = await runtime.runPromise(
      binding.reset({
        nextRuntimeInstanceId: 'runtime:borrowed-reset-next',
      }),
    )

    expect(event.hostCleanupSummary?.['external-store-listener']).toEqual({ closed: 1, failed: 0 })
    expect(event.hostCleanupSummary?.['provider-layer-overlay']).toEqual({ closed: 1, failed: 0 })
    expect(externalClosed).toBe(1)
    await assertRuntimeRuns(runtime)

    await runtime.dispose()
  })

  it('cleans borrowed host bindings on dispose without disposing the runtime', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'borrowed-dispose-cleanup', hostKind: 'vitest' })
    let externalClosed = 0

    registerRuntimeExternalStoreDisposer(runtime as unknown as object, 'Counter::borrowed-dispose', () => {
      externalClosed += 1
    })
    registerRuntimeHostBindingDisposer(
      runtime as unknown as object,
      'provider-layer-overlay:borrowed-dispose',
      () => undefined,
    )

    carrier.bindRuntime({
      runtime,
      ownerId: 'borrowed-dispose-cleanup',
      runtimeInstanceId: 'runtime:borrowed-dispose',
    })
    const event = await runtime.runPromise(
      carrier.dispose({
        ownerId: 'borrowed-dispose-cleanup',
      }),
    )

    if (!event) {
      throw new Error('expected carrier dispose to return a lifecycle event')
    }
    expect(event.hostCleanupSummary?.['external-store-listener']).toEqual({ closed: 1, failed: 0 })
    expect(event.hostCleanupSummary?.['provider-layer-overlay']).toEqual({ closed: 1, failed: 0 })
    expect(externalClosed).toBe(1)
    await assertRuntimeRuns(runtime)
    expect(carrier.listRuntimeBindings()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ownerId: 'borrowed-dispose-cleanup' })]),
    )

    await runtime.dispose()
  })

  it('disposes owned runtime bindings on reset', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'owned-reset-cleanup', hostKind: 'vitest' })

    const binding = carrier.bindRuntime({
      runtime,
      ownerId: 'owned-reset-cleanup',
      runtimeInstanceId: 'runtime:owned-reset',
      runtimeOwnership: 'owned',
    })

    await runtime.runPromise(
      binding.reset({
        nextRuntimeInstanceId: 'runtime:owned-reset-next',
      }),
    )

    await assertRuntimeDisposed(runtime)
  })

  it('disposes owned runtime bindings on dispose', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'owned-dispose-cleanup', hostKind: 'vitest' })

    const binding = carrier.bindRuntime({
      runtime,
      ownerId: 'owned-dispose-cleanup',
      runtimeInstanceId: 'runtime:owned-dispose',
      runtimeOwnership: 'owned',
    })

    await runtime.runPromise(binding.dispose())

    await assertRuntimeDisposed(runtime)
  })

  it('does not downgrade an explicitly owned runtime when the same runtime is rebound without ownership', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'owned-rebind-cleanup', hostKind: 'vitest' })

    const ownedBinding = carrier.bindRuntime({
      runtime,
      ownerId: 'owned-rebind-cleanup',
      runtimeInstanceId: 'runtime:owned-rebind',
      runtimeOwnership: 'owned',
    })
    const reboundBinding = carrier.bindRuntime({
      runtime,
      ownerId: 'owned-rebind-cleanup',
      runtimeInstanceId: 'runtime:owned-rebind',
    })

    expect(reboundBinding.owner).toBe(ownedBinding.owner)
    await runtime.runPromise(reboundBinding.dispose())

    await assertRuntimeDisposed(runtime)
  })

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
