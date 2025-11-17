import { describe, it, expect, afterEach } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import { Schema, ManagedRuntime, Layer, Effect } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { ModuleScope } from '../../src/ModuleScope.js'

const Counter = Logix.Module.make('moduleScopeCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { noop: Schema.Void },
})

const CounterImpl = Counter.implement({
  initial: { count: 0 },
})

const Modal = Logix.Module.make('moduleScopeModal', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
})

const ModalImpl = Modal.implement({
  initial: { text: '' },
})

const RouteHost = Logix.Module.make('moduleScopeRouteHost', {
  state: Schema.Struct({}),
  actions: { noop: Schema.Void },
})

const RouteHostImpl = RouteHost.implement({
  initial: {},
  imports: [ModalImpl.impl],
})

describe('ModuleScope.make', () => {
  afterEach(() => {
    cleanup()
  })

  // 防止 Debug.record 在测试环境下走 console/logger fallback（会产生噪声输出）
  const noopSink: Logix.Debug.Sink = { record: () => Effect.void }
  const NoopDebugLayer = Logix.Debug.replace([noopSink])

  it('throws if Provider is missing', () => {
    const Scope = ModuleScope.make(CounterImpl)

    const View = () => {
      Scope.use()
      return null
    }

    expect(() => render(<View />)).toThrowError('[ModuleScope] Provider not found')
  })

  it('throws if Provider is missing (useImported)', () => {
    const Scope = ModuleScope.make(RouteHostImpl)

    const View = () => {
      Scope.useImported(Modal.tag)
      return null
    }

    expect(() => render(<View />)).toThrowError('[ModuleScope] Provider not found')
  })

  it('provides a stable ref for descendants', async () => {
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        Logix.ScopeRegistry.layer() as unknown as Layer.Layer<any, never, any>,
        NoopDebugLayer as unknown as Layer.Layer<any, never, any>,
      ) as unknown as Layer.Layer<any, never, never>,
    )
    const Scope = ModuleScope.make(CounterImpl)

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const View = () => (
      <Scope.Provider options={{ scopeId: 'shared' }}>
        <Child />
      </Scope.Provider>
    )

    const Child = () => {
      const a = Scope.use()
      const b = Scope.use()
      return (
        <>
          <span data-testid="id-a">{String(a.runtime.instanceId)}</span>
          <span data-testid="id-b">{String(b.runtime.instanceId)}</span>
        </>
      )
    }

    const { getByTestId, unmount } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('id-a').textContent).toBe(getByTestId('id-b').textContent)
    })

    unmount()
    await runtime.dispose()
  })

  it('provides imported child refs bound to the Host scope', async () => {
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
      <Scope.Provider options={{ scopeId: 'route:1' }}>
        <Child />
      </Scope.Provider>
    )

    const Child = () => {
      const host = Scope.use()
      const a = Scope.useImported(Modal.tag)
      const b = host.imports.get(Modal.tag)
      return (
        <>
          <span data-testid="id-a">{String(a.runtime.instanceId)}</span>
          <span data-testid="id-b">{String(b.runtime.instanceId)}</span>
        </>
      )
    }

    const { getByTestId, unmount } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('id-a').textContent).toBe(getByTestId('id-b').textContent)
    })

    unmount()
    await runtime.dispose()
  })

  it('allows defaults and per-Provider overrides (scopeId isolation)', async () => {
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        Logix.ScopeRegistry.layer() as unknown as Layer.Layer<any, never, any>,
        NoopDebugLayer as unknown as Layer.Layer<any, never, any>,
      ) as unknown as Layer.Layer<any, never, never>,
    )
    const Scope = ModuleScope.make(CounterImpl, { scopeId: 'a' })

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const ReadId = ({ testId }: { testId: string }) => {
      const ref = Scope.use()
      return <span data-testid={testId}>{String(ref.runtime.instanceId)}</span>
    }

    const View = () => (
      <>
        <Scope.Provider>
          <ReadId testId="id-a" />
        </Scope.Provider>
        <Scope.Provider options={{ scopeId: 'b' }}>
          <ReadId testId="id-b" />
        </Scope.Provider>
      </>
    )

    const { getByTestId, unmount } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('id-a').textContent).not.toBe(getByTestId('id-b').textContent)
    })

    unmount()
    await runtime.dispose()
  })
})
