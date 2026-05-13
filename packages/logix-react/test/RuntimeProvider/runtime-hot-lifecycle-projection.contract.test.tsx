// @vitest-environment happy-dom

import React from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Effect, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { RuntimeProvider, useModule, useRuntime } from '../../src/index.js'
import {
  clearInstalledLogixDevLifecycleCarrier,
  createLogixDevLifecycleCarrier,
  installLogixDevLifecycleCarrier,
} from '../../src/dev/lifecycle.js'
import { getReactRuntimeInstanceId } from '../../src/internal/provider/runtimeHotLifecycle.js'
import { registerRuntimeExternalStoreDisposer } from '../../src/internal/store/RuntimeExternalStore.hotLifecycle.js'

const Counter = Logix.Module.make('ReactHotLifecycleProjectionCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const Program = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [],
})

const CurrentOwnerProbe: React.FC<{
  readonly onOwner: (ownerId: string | undefined) => void
}> = ({ onOwner }) => {
  const runtime = useRuntime()

  React.useEffect(() => {
    onOwner(runtime.runSync(RuntimeContracts.getCurrentRuntimeHotLifecycleOwner())?.ownerId)
  }, [runtime, onOwner])

  return null
}

const ModuleTagProbe: React.FC = () => {
  useModule(Counter.tag)
  return null
}

const ProgramModuleProbe: React.FC<{
  readonly onInstanceId: (instanceId: string) => void
}> = ({ onInstanceId }) => {
  const handle = useModule(Program, { key: 'remount-program', gcTime: 0 })

  React.useEffect(() => {
    onInstanceId(handle.runtime.instanceId)
  }, [handle.runtime.instanceId, onInstanceId])

  return <span data-testid="program-instance">{handle.runtime.instanceId}</span>
}

const ModuleTagRuntimeProbe: React.FC<{
  readonly onInstanceId: (instanceId: string) => void
}> = ({ onInstanceId }) => {
  const handle = useModule(Counter.tag)

  React.useEffect(() => {
    onInstanceId(handle.runtime.instanceId)
  }, [handle.runtime.instanceId, onInstanceId])

  return <span data-testid="module-tag-instance">{handle.runtime.instanceId}</span>
}

const assertRuntimeRuns = async (runtime: ManagedRuntime.ManagedRuntime<any, any>): Promise<void> => {
  await expect(runtime.runPromise(Effect.succeed('alive'))).resolves.toBe('alive')
}

afterEach(() => {
  cleanup()
  clearInstalledLogixDevLifecycleCarrier()
})

describe('React runtime hot lifecycle projection', () => {
  it('keeps lifecycle ownership outside RuntimeProvider projection', async () => {
    const runtimeA = Logix.Runtime.make(Program)
    const runtimeB = Logix.Runtime.make(Program)
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'react-provider-test', hostKind: 'vitest' })

    const binding = carrier.bindRuntime({
      runtime: runtimeA,
      ownerId: 'react-provider-test',
      runtimeInstanceId: 'runtime:A',
    })

    const event = await runtimeA.runPromise(
      binding.reset({
        nextRuntime: runtimeB,
        nextRuntimeInstanceId: 'runtime:B',
      }),
    )

    expect(getReactRuntimeInstanceId(runtimeA)).toBe('runtime:A')
    expect(getReactRuntimeInstanceId(runtimeB)).toBe('runtime:B')
    expect(event.previousRuntimeInstanceId).toBe('runtime:A')
    expect(event.nextRuntimeInstanceId).toBe('runtime:B')
    expect(event.decision).toBe('reset')

    await runtimeB.dispose()
    await runtimeA.dispose()
  })

  it('cleans host projection bindings when provider unmounts', async () => {
    const runtime = Logix.Runtime.make(Program)
    let closed = 0
    registerRuntimeExternalStoreDisposer(runtime as unknown as object, 'Counter::i1', () => {
      closed += 1
    })

    const mounted = render(
      <RuntimeProvider runtime={runtime}>
        <div>mounted</div>
      </RuntimeProvider>,
    )

    mounted.unmount()

    expect(closed).toBe(1)
    await runtime.dispose()
  })

  it('lets RuntimeProvider consume the installed host carrier without demo-side lifecycle code', async () => {
    const runtime = Logix.Runtime.make(Program, {
      label: 'ProviderInstalledCarrierRuntime',
    })
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'provider-installed-carrier', hostKind: 'vitest' })
    installLogixDevLifecycleCarrier(carrier)
    let resolvedOwnerId: string | undefined

    const mounted = render(
      <RuntimeProvider runtime={runtime}>
        <CurrentOwnerProbe
          onOwner={(ownerId) => {
            resolvedOwnerId = ownerId
          }}
        />
        <div>mounted</div>
      </RuntimeProvider>,
    )

    const owner = carrier.getOwner('ProviderInstalledCarrierRuntime')
    expect(owner?.ownerId).toBe('ProviderInstalledCarrierRuntime')
    expect(resolvedOwnerId).toBe('ProviderInstalledCarrierRuntime')

    mounted.unmount()
    await runtime.dispose()
  })

  it('registers ModuleTag runtime bindings for live inspect targets', async () => {
    const runtime = Logix.Runtime.make(Program, {
      label: 'ModuleTagLiveInspectRuntime',
    })
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'module-tag-live-carrier', hostKind: 'vitest' })
    installLogixDevLifecycleCarrier(carrier)

    const mounted = render(
      <RuntimeProvider runtime={runtime}>
        <ModuleTagProbe />
      </RuntimeProvider>,
    )

    expect(carrier.listRuntimeBindings()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownerId: 'ReactHotLifecycleProjectionCounter',
          targetCoordinate: expect.objectContaining({
            moduleId: 'ReactHotLifecycleProjectionCounter',
            instanceId: 'default',
          }),
        }),
      ]),
    )

    mounted.unmount()
    await runtime.dispose()
  })

  it('lets RuntimeProvider remount with the same borrowed runtime after unmount', async () => {
    const runtime = Logix.Runtime.make(Program, {
      label: 'ProviderBorrowedRemountRuntime',
    })
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'provider-borrowed-remount', hostKind: 'vitest' })
    installLogixDevLifecycleCarrier(carrier)

    const mounted = render(
      <RuntimeProvider runtime={runtime}>
        <div>mounted</div>
      </RuntimeProvider>,
    )

    mounted.unmount()
    await assertRuntimeRuns(runtime)

    const remounted = render(
      <RuntimeProvider runtime={runtime}>
        <div>remounted</div>
      </RuntimeProvider>,
    )

    expect(remounted.getByText('remounted')).toBeTruthy()
    remounted.unmount()
    await assertRuntimeRuns(runtime)

    await runtime.dispose()
  })

  it('keeps Program base runtime borrowed while ModuleCache owns remounted module instances', async () => {
    const runtime = Logix.Runtime.make(Program, {
      label: 'ProgramBorrowedRemountRuntime',
    })
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'program-borrowed-remount', hostKind: 'vitest' })
    installLogixDevLifecycleCarrier(carrier)
    const instanceIds: Array<string> = []

    const mounted = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <ProgramModuleProbe
          onInstanceId={(instanceId) => {
            instanceIds.push(instanceId)
          }}
        />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(mounted.getByTestId('program-instance').textContent).toBeTruthy()
    })
    const firstInstanceId = mounted.getByTestId('program-instance').textContent

    mounted.unmount()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await assertRuntimeRuns(runtime)

    const remounted = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <ProgramModuleProbe
          onInstanceId={(instanceId) => {
            instanceIds.push(instanceId)
          }}
        />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(remounted.getByTestId('program-instance').textContent).toBeTruthy()
    })
    expect(remounted.getByTestId('program-instance').textContent).not.toBe(firstInstanceId)
    expect(instanceIds.length).toBeGreaterThanOrEqual(2)
    remounted.unmount()
    await assertRuntimeRuns(runtime)

    await runtime.dispose()
  })

  it('keeps ModuleTag runtime bindings borrowed across provider remounts', async () => {
    const runtime = Logix.Runtime.make(Program, {
      label: 'ModuleTagBorrowedRemountRuntime',
    })
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'module-tag-borrowed-remount', hostKind: 'vitest' })
    installLogixDevLifecycleCarrier(carrier)
    const instanceIds: Array<string> = []

    const mounted = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <ModuleTagRuntimeProbe
          onInstanceId={(instanceId) => {
            instanceIds.push(instanceId)
          }}
        />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(mounted.getByTestId('module-tag-instance').textContent).toBeTruthy()
    })
    mounted.unmount()
    await assertRuntimeRuns(runtime)

    const remounted = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <ModuleTagRuntimeProbe
          onInstanceId={(instanceId) => {
            instanceIds.push(instanceId)
          }}
        />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(remounted.getByTestId('module-tag-instance').textContent).toBeTruthy()
    })
    expect(instanceIds.length).toBeGreaterThanOrEqual(2)
    remounted.unmount()
    await assertRuntimeRuns(runtime)

    await runtime.dispose()
  })
})
