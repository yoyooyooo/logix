// @vitest-environment happy-dom

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { RuntimeProvider, useRuntime } from '../../src/index.js'
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
})
