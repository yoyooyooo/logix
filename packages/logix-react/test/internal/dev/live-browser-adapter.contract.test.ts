import { describe, expect, it } from 'vitest'

import { createLogixDevLifecycleCarrier } from '../../../src/dev/lifecycle.js'

describe('live browser adapter lifecycle source', () => {
  it('lists dev lifecycle runtime bindings without exposing report truth', () => {
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })

    expect(carrier.listRuntimeBindings()).toEqual([])
    expect(JSON.stringify(carrier)).not.toMatch(/repairHints|verdict|nextRecommendedStage/)
  })

  it('derives a target-oriented snapshot from runtime binding metadata', async () => {
    const { ManagedRuntime, Layer } = await import('effect')
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
    const runtime = ManagedRuntime.make(Layer.empty) as any

    carrier.bindRuntime({
      runtime,
      ownerId: 'LiveBridgeFixture',
      runtimeInstanceId: 'example-runtime',
    })

    expect(carrier.listRuntimeBindings()).toEqual([
      expect.objectContaining({
        ownerId: 'LiveBridgeFixture',
        runtimeInstanceId: 'example-runtime',
        targetCoordinate: {
          runtimeId: 'example-runtime',
          moduleId: 'LiveBridgeFixture',
          instanceId: 'default',
        },
      }),
    ])

    await runtime.dispose()
  })
})

describe('live browser adapter install', () => {
  it('submits host.offer from lifecycle bindings over WebSocket', async () => {
    const { installLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const sent: unknown[] = []

    class FakeWebSocket {
      static readonly instances: FakeWebSocket[] = []
      static readonly OPEN = 1
      readonly readyState = 1
      onopen: (() => void) | null = null

      constructor(readonly url: string) {
        FakeWebSocket.instances.push(this)
        queueMicrotask(() => this.onopen?.())
      }

      send(raw: string) {
        sent.push(JSON.parse(raw) as unknown)
      }

      close() {}

      addEventListener(type: string, cb: () => void) {
        if (type === 'open') this.onopen = cb
      }
    }

    const previous = globalThis.WebSocket
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(sent).toEqual([
        expect.objectContaining({
          schemaVersion: 1,
          role: 'browser',
          type: 'host.offer',
          payload: expect.objectContaining({
            adapterKind: 'browser-dev',
            hostCoordinate: expect.objectContaining({ hostKind: 'browser', tabId: 'tab-a', projectId: 'test' }),
          }),
        }),
      ])
      expect(JSON.stringify(sent)).not.toMatch(/repairHints|verdict|nextRecommendedStage/)
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('refreshes host.offer when lifecycle runtime bindings appear after WebSocket open', async () => {
    const { ManagedRuntime, Layer } = await import('effect')
    const { installLogixDevLifecycleCarrier, clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const sent: unknown[] = []

    class FakeWebSocket {
      static readonly instances: FakeWebSocket[] = []
      static readonly OPEN = 1
      readonly readyState = 1
      onopen: (() => void) | null = null

      constructor(readonly url: string) {
        FakeWebSocket.instances.push(this)
        queueMicrotask(() => this.onopen?.())
      }

      send(raw: string) {
        sent.push(JSON.parse(raw) as unknown)
      }

      close() {}

      addEventListener(type: string, cb: () => void) {
        if (type === 'open') this.onopen = cb
      }
    }

    const previous = globalThis.WebSocket
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(sent).toHaveLength(1)
      expect((sent[0] as any).payload.targets).toEqual([])

      const runtime = ManagedRuntime.make(Layer.empty) as any
      carrier.bindRuntime({
        runtime,
        ownerId: 'LiveBridgeFixture',
        runtimeInstanceId: 'example-runtime',
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(sent).toHaveLength(2)
      expect((sent[1] as any).payload.targets).toEqual([
        {
          runtimeId: 'example-runtime',
          moduleId: 'LiveBridgeFixture',
          instanceId: 'default',
        },
      ])

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('does not infer a runtime binding from runtimeId alone for browser operation responses', async () => {
    const { installLogixDevLifecycleCarrier, clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const sent: unknown[] = []

    class FakeWebSocket {
      static readonly instances: FakeWebSocket[] = []
      static readonly OPEN = 1
      readonly readyState = 1
      private readonly listeners = new Map<string, Array<(event: any) => void>>()

      constructor(readonly url: string) {
        FakeWebSocket.instances.push(this)
        queueMicrotask(() => this.emit('open', {}))
      }

      send(raw: string) {
        sent.push(JSON.parse(raw) as unknown)
      }

      close() {}

      addEventListener(type: string, cb: (event: any) => void) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), cb])
      }

      emit(type: string, event: any) {
        for (const listener of this.listeners.get(type) ?? []) listener(event)
      }
    }

    const previous = globalThis.WebSocket
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      const { ManagedRuntime, Layer } = await import('effect')
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      const runtimeA = ManagedRuntime.make(Layer.empty) as any
      const runtimeB = ManagedRuntime.make(Layer.empty) as any
      carrier.bindRuntime({ ownerId: 'ModuleA', runtimeInstanceId: 'shared-runtime', runtime: runtimeA })
      carrier.bindRuntime({ ownerId: 'ModuleB', runtimeInstanceId: 'shared-runtime', runtime: runtimeB })

      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-1',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-1',
            attachmentId: 'browser:tab-a',
            operation: 'snapshot.read',
            target: { runtimeId: 'shared-runtime' },
          },
        }),
      })

      expect(sent).toEqual([
        expect.objectContaining({
          type: 'live.operation.response',
          payload: expect.objectContaining({
            ok: false,
            gap: expect.objectContaining({
              code: 'live-operation-unsupported-by-host',
            }),
          }),
        }),
      ])
      expect(JSON.stringify(sent)).not.toContain('"moduleId":"ModuleA"')
      expect(JSON.stringify(sent)).not.toContain('"moduleId":"ModuleB"')

      await runtimeA.dispose()
      await runtimeB.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('returns bounded local-only profile summary evidence when explicitly requested', async () => {
    const { ManagedRuntime, Layer } = await import('effect')
    const { installLogixDevLifecycleCarrier, clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const sent: unknown[] = []

    class FakeWebSocket {
      static readonly instances: FakeWebSocket[] = []
      static readonly OPEN = 1
      readonly readyState = 1
      private readonly listeners = new Map<string, Array<(event: any) => void>>()

      constructor(readonly url: string) {
        FakeWebSocket.instances.push(this)
        queueMicrotask(() => this.emit('open', {}))
      }

      send(raw: string) {
        sent.push(JSON.parse(raw) as unknown)
      }

      close() {}

      addEventListener(type: string, cb: (event: any) => void) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), cb])
      }

      emit(type: string, event: any) {
        for (const listener of this.listeners.get(type) ?? []) listener(event)
      }
    }

    const previous = globalThis.WebSocket
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      const runtime = ManagedRuntime.make(Layer.empty) as any
      carrier.bindRuntime({ ownerId: 'ProfileFixture', runtimeInstanceId: 'runtime-profile', runtime })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-profile',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-profile',
            attachmentId: 'browser:tab-a',
            operation: 'profile.runtimeSummary',
            target: { runtimeId: 'runtime-profile', moduleId: 'ProfileFixture', instanceId: 'default' },
            budget: { maxEvents: 4, maxInlineBytes: 512 },
          },
        }),
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const artifact = (sent[0] as any)?.payload?.artifact
      expect(artifact).toMatchObject({
        outputKey: 'live-profile-summary',
        kind: 'LiveCapture',
        value: {
          kind: 'live.capture',
          captureKind: 'profile',
          stageClass: 'host-harness',
          target: { runtimeId: 'runtime-profile', moduleId: 'ProfileFixture', instanceId: 'default' },
          budget: { maxEvents: 4, maxInlineBytes: 512 },
          localOnly: true,
          profileSummary: {
            authority: 'react-host-adjunct',
            sampleCount: 0,
            source: 'local-browser',
          },
        },
      })
      expect(JSON.stringify(artifact)).not.toMatch(/repairHints|verdict|nextRecommendedStage|stateAfter|timeline ordering/)

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('returns a structured profile gap instead of allocating host capture when no target binding exists', async () => {
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const { clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
    const sent: unknown[] = []

    class FakeWebSocket {
      static readonly instances: FakeWebSocket[] = []
      static readonly OPEN = 1
      readonly readyState = 1
      private readonly listeners = new Map<string, Array<(event: any) => void>>()

      constructor(readonly url: string) {
        FakeWebSocket.instances.push(this)
        queueMicrotask(() => this.emit('open', {}))
      }

      send(raw: string) {
        sent.push(JSON.parse(raw) as unknown)
      }

      close() {}

      addEventListener(type: string, cb: (event: any) => void) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), cb])
      }

      emit(type: string, event: any) {
        for (const listener of this.listeners.get(type) ?? []) listener(event)
      }
    }

    const previous = globalThis.WebSocket
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-profile-gap',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-profile-gap',
            attachmentId: 'browser:tab-a',
            operation: 'profile.runtimeSummary',
            target: { runtimeId: 'missing-runtime', moduleId: 'MissingProfileFixture', instanceId: 'default' },
          },
        }),
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(sent).toEqual([
        expect.objectContaining({
          type: 'live.operation.response',
          payload: expect.objectContaining({
            ok: false,
            gap: expect.objectContaining({
              kind: 'evidence.gap',
              code: 'host-profile-target-unavailable',
              severity: 'warning',
            }),
          }),
        }),
      ])
      expect(JSON.stringify(sent)).not.toMatch(/profileSummary|sampleCount|repairHints|verdict|nextRecommendedStage/)
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })
})
