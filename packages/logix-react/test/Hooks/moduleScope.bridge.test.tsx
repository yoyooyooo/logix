import { describe, it, expect, afterEach } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import { Schema, ManagedRuntime, Layer, Effect } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { ModuleScope } from '../../src/ModuleScope.js'

const Modal = Logix.Module.make('moduleScopeBridgeModal', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
})

const ModalImpl = Modal.implement({
  initial: { text: '' },
})

const RouteHost = Logix.Module.make('moduleScopeBridgeRouteHost', {
  state: Schema.Struct({}),
  actions: { noop: Schema.Void },
})

const RouteHostImpl = RouteHost.implement({
  initial: {},
  imports: [ModalImpl.impl],
})

describe('ModuleScope.Bridge', () => {
  afterEach(() => {
    cleanup()
  })

  // Prevent Debug.record from falling back to console/logger in tests (avoids noisy output).
  const noopSink: Logix.Debug.Sink = { record: () => Effect.void }
  const NoopDebugLayer = Logix.Debug.replace([noopSink])

  it('throws when scope is not registered', async () => {
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        Logix.ScopeRegistry.layer() as unknown as Layer.Layer<any, never, any>,
        NoopDebugLayer as unknown as Layer.Layer<any, never, any>,
      ) as unknown as Layer.Layer<any, never, never>,
    )
    const Scope = ModuleScope.make(RouteHostImpl)

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const View = () => (
      <Scope.Bridge scopeId="missing">
        <span />
      </Scope.Bridge>
    )

    try {
      expect(() => render(<View />, { wrapper: Wrapper })).toThrowError(
        '[ModuleScope.Bridge] Scope "missing" is not registered (or has been disposed).',
      )
    } finally {
      await runtime.dispose()
    }
  })

  it('reuses the same Host scope across roots (Provider -> Bridge)', async () => {
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        Logix.ScopeRegistry.layer() as unknown as Layer.Layer<any, never, any>,
        NoopDebugLayer as unknown as Layer.Layer<any, never, any>,
      ) as unknown as Layer.Layer<any, never, never>,
    )
    const Scope = ModuleScope.make(RouteHostImpl)

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const scopeId = 'route:1'

    const ProviderRoot = () => (
      <Scope.Provider options={{ scopeId }}>
        <span />
      </Scope.Provider>
    )

    const registry = runtime.runSync(Logix.ScopeRegistry.ScopeRegistryTag)

    const provider = render(<ProviderRoot />, { wrapper: Wrapper })

    let expectedInstanceId = ''
    await waitFor(() => {
      const hostRuntime = registry.get(scopeId, RouteHostImpl.tag as any)
      expect(hostRuntime).toBeDefined()
      expectedInstanceId = String((hostRuntime as any).instanceId)
    })

    const BridgeChild = () => {
      const host = Scope.use()
      return <span data-testid="id">{String(host.runtime.instanceId)}</span>
    }

    const bridge = render(
      <Scope.Bridge scopeId={scopeId}>
        <BridgeChild />
      </Scope.Bridge>,
      { wrapper: Wrapper },
    )

    await waitFor(() => {
      expect(bridge.getByTestId('id').textContent).toBe(expectedInstanceId)
    })

    provider.unmount()
    bridge.unmount()
    await runtime.dispose()
  })

  it('throws after the owning Provider is unmounted (disposed scope)', async () => {
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        Logix.ScopeRegistry.layer() as unknown as Layer.Layer<any, never, any>,
        NoopDebugLayer as unknown as Layer.Layer<any, never, any>,
      ) as unknown as Layer.Layer<any, never, never>,
    )
    const Scope = ModuleScope.make(RouteHostImpl)

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const scopeId = 'route:dispose'
    const registry = runtime.runSync(Logix.ScopeRegistry.ScopeRegistryTag)

    const provider = render(
      <Scope.Provider options={{ scopeId }}>
        <span />
      </Scope.Provider>,
      { wrapper: Wrapper },
    )

    await waitFor(() => {
      expect(registry.get(scopeId, RouteHostImpl.tag as any)).toBeDefined()
    })

    provider.unmount()

    await waitFor(() => {
      expect(registry.get(scopeId, RouteHostImpl.tag as any)).toBeUndefined()
    })

    expect(() =>
      render(
        <Scope.Bridge scopeId={scopeId}>
          <span />
        </Scope.Bridge>,
        { wrapper: Wrapper },
      ),
    ).toThrowError(`[ModuleScope.Bridge] Scope "${scopeId}" is not registered (or has been disposed).`)

    await runtime.dispose()
  })
})
