import { describe, expect, it } from 'vitest'

describe('live browser adapter inspect responses', () => {
  it('answers state inspect with owner runtime state instead of CLI-side traversal', async () => {
    const { Effect, Layer, ManagedRuntime, ServiceMap } = await import('effect')
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
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 7, nested: { label: 'ready' } }),
        actions: {
          increment: () => undefined,
        },
        dispatch: () => Effect.void,
      }
      const runtime = ManagedRuntime.make(Layer.succeed(ModuleTag, moduleRuntime)) as any
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      carrier.bindRuntime({ ownerId: 'InspectFixture', runtimeInstanceId: 'runtime-172', runtime })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-state',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-state',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.state',
            path: 'nested.label',
            target: { runtimeId: 'runtime-172', moduleId: 'InspectFixture', instanceId: 'default' },
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(sent).toEqual([
        expect.objectContaining({
          type: 'live.operation.response',
          payload: expect.objectContaining({
            ok: true,
            artifact: expect.objectContaining({
              kind: 'LiveInspectArtifact',
              value: expect.objectContaining({
                kind: 'live.inspect.artifact',
                section: 'state-path',
                facet: expect.objectContaining({
                  payload: expect.objectContaining({ valuePreview: 'ready' }),
                }),
              }),
            }),
          }),
        }),
      ])

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('returns owner-backed field projections for fields, field-graph and field-summary', async () => {
    const { Effect, Layer, ManagedRuntime, ServiceMap } = await import('effect')
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

      const snapshot = {
        moduleId: 'InspectOwnerFixture',
        digest: 'module-fields:test-digest',
        fields: [
          { fieldId: 'count', name: 'Count' },
          { fieldId: 'derived', name: 'Derived' },
          { fieldId: 'mirrored', name: 'Mirrored' },
        ],
        provenanceIndex: {
          count: {
            originType: 'module',
            originId: 'InspectOwnerFixture',
            originIdKind: 'explicit',
            originLabel: 'module:InspectOwnerFixture',
          },
          derived: {
            originType: 'module',
            originId: 'InspectOwnerFixture',
            originIdKind: 'explicit',
            originLabel: 'module:InspectOwnerFixture',
          },
          mirrored: {
            originType: 'module',
            originId: 'InspectOwnerFixture',
            originIdKind: 'explicit',
            originLabel: 'module:InspectOwnerFixture',
          },
        },
      }
      const fieldGraph = {
        _tag: 'FieldGraph',
        nodes: [],
        edges: [
          { id: 'computed:count->derived', from: 'count', to: 'derived', kind: 'computed' as const },
          { id: 'link:derived->mirrored', from: 'derived', to: 'mirrored', kind: 'link' as const },
        ],
        resources: [],
      }
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectOwnerFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 1, derived: 2, mirrored: 2 }),
        dispatch: () => Effect.void,
      }
      const runtime = ManagedRuntime.make(Layer.succeed(ModuleTag, moduleRuntime)) as any
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      carrier.bindRuntime({
        ownerId: 'InspectOwnerFixture',
        runtimeInstanceId: 'runtime-176-fields',
        runtime,
        moduleRuntime,
        fieldInspect: {
          getSnapshot: () => snapshot,
          getGraph: () => fieldGraph,
          getChangedFieldCount: () => 2,
          getConvergenceCauses: () => [{ cause: 'startup', fieldPath: 'derived', count: 1 }],
        },
      })

      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()

      const operations = [
        { operation: 'inspect.fields', section: 'fields', payloadKind: 'live.field.finalFields', gap: 'missing-field-owner-projection' },
        { operation: 'inspect.fieldGraph', section: 'field-graph', payloadKind: 'live.field.semanticAdjacency', gap: 'missing-field-owner-projection' },
        { operation: 'inspect.fieldSummary', section: 'field-summary', payloadKind: 'live.field.summary', gap: 'missing-latest-field-summary' },
      ] as const

      for (const item of operations) {
        sent.length = 0
        ws!.emit('message', {
          data: JSON.stringify({
            schemaVersion: 1,
            id: `req-${item.operation}`,
            role: 'daemon',
            type: 'live.operation.request',
            payload: {
              requestId: `req-${item.operation}`,
              attachmentId: 'browser:tab-a',
              operation: item.operation,
              target: { runtimeId: 'runtime-176-fields', moduleId: 'InspectOwnerFixture', instanceId: 'default' },
            },
          }),
        })
        await new Promise((resolve) => setTimeout(resolve, 0))
        const response = sent[0] as any
        expect(response?.payload?.artifact?.value?.facet?.sourceAuthority).toBe('field-runtime')
        expect(response?.payload?.artifact?.value?.facet?.payload?.kind).toBe(item.payloadKind)
        expect(response?.payload?.artifact?.value?.facet?.gaps ?? []).not.toEqual([
          expect.objectContaining({ code: item.gap }),
        ])
      }

      expect(JSON.stringify(sent)).not.toMatch(/"nodes"|"edges"|"from"|"to"|raw node|raw edge|SubscriptionRef|field program|fieldGraph/)

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('answers actions inspect from lifecycle reflection manifest binding', async () => {
    const { Effect, Layer, ManagedRuntime, Schema, ServiceMap } = await import('effect')
    const Logix = await import('@logixjs/core')
    const CoreReflection = await import('@logixjs/core/repo-internal/reflection-api')
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
      const InspectModule = Logix.Module.make('InspectActionsFixture', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {
          increment: Schema.Void,
          setCount: Schema.Number,
        },
        reducers: {},
      })
      const Program = Logix.Program.make(InspectModule, { initial: { count: 0 }, logics: [] })
      const manifest = CoreReflection.extractRuntimeReflectionManifest(Program, { programId: 'inspect-actions.program' })
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectActionsFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 0 }),
        actions: {
          increment: () => undefined,
          setCount: () => undefined,
        },
        dispatch: () => Effect.void,
      }
      const runtime = ManagedRuntime.make(Layer.succeed(ModuleTag, moduleRuntime)) as any
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      carrier.bindRuntime({
        ownerId: 'InspectActionsFixture',
        runtimeInstanceId: 'runtime-172-actions',
        runtime,
        reflectionManifest: manifest,
      })
      expect(carrier.listRuntimeBindings()).toEqual([
        expect.objectContaining({
          reflectionBinding: expect.objectContaining({ manifestDigest: manifest.digest }),
        }),
      ])
      expect(JSON.stringify(carrier.listRuntimeBindings())).not.toMatch(/reflectionManifest|"actions"|"schemaDigest"/)
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-actions',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-actions',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.actions',
            target: { runtimeId: 'runtime-172-actions', moduleId: 'InspectActionsFixture', instanceId: 'default' },
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(sent).toEqual([
        expect.objectContaining({
          type: 'live.operation.response',
          payload: expect.objectContaining({
            ok: true,
            artifact: expect.objectContaining({
              outputKey: 'live-inspect:actions',
              kind: 'LiveInspectArtifact',
              value: expect.objectContaining({
                kind: 'live.inspect.artifact',
                section: 'actions',
                facet: expect.objectContaining({
                  sourceAuthority: 'reflection',
                  gaps: [],
                  payload: expect.objectContaining({
                    schemaVersion: 'live-inspect.v1',
                    binding: expect.objectContaining({
                      manifestDigest: manifest.digest,
                      bindingStatus: 'matched',
                      sourceAuthority: 'reflection',
                    }),
                    actions: expect.arrayContaining([
                      expect.objectContaining({ actionTag: 'increment', payloadKind: 'void' }),
                      expect.objectContaining({ actionTag: 'setCount', payloadKind: 'nonVoid' }),
                    ]),
                  }),
                }),
              }),
            }),
          }),
        }),
      ])

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('denies dispatch before mutation when reflection binding cannot match the action', async () => {
    const { Effect, Layer, ManagedRuntime, Schema, ServiceMap } = await import('effect')
    const Logix = await import('@logixjs/core')
    const CoreReflection = await import('@logixjs/core/repo-internal/reflection-api')
    const { installLogixDevLifecycleCarrier, clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const sent: unknown[] = []
    let dispatchCount = 0

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
      const InspectModule = Logix.Module.make('InspectDispatchFixture', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {
          increment: Schema.Void,
        },
        reducers: {},
      })
      const Program = Logix.Program.make(InspectModule, { initial: { count: 0 }, logics: [] })
      const manifest = CoreReflection.extractRuntimeReflectionManifest(Program, { programId: 'inspect-dispatch.program' })
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectDispatchFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 0 }),
        dispatch: () =>
          Effect.sync(() => {
            dispatchCount += 1
          }),
      }
      const runtime = ManagedRuntime.make(Layer.succeed(ModuleTag, moduleRuntime)) as any
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      carrier.bindRuntime({
        ownerId: 'InspectDispatchFixture',
        runtimeInstanceId: 'runtime-172-dispatch',
        runtime,
        moduleRuntime,
        reflectionManifest: manifest,
      })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-denied',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-denied',
            attachmentId: 'browser:tab-a',
            operation: 'dispatch.declaredAction',
            actionTag: 'missing',
            target: { runtimeId: 'runtime-172-dispatch', moduleId: 'InspectDispatchFixture', instanceId: 'default' },
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(dispatchCount).toBe(0)
      expect(sent).toEqual([
        expect.objectContaining({
          type: 'live.operation.response',
          payload: expect.objectContaining({
            ok: true,
            artifact: expect.objectContaining({
              kind: 'LiveOperationFacet',
              value: expect.objectContaining({
                kind: 'operation.denied',
                reason: 'unavailable-action-contract',
                noMutation: true,
                binding: expect.objectContaining({
                  actionTag: 'missing',
                  bindingStatus: 'missing',
                }),
              }),
            }),
          }),
        }),
      ])

      sent.length = 0
      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-completed',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-completed',
            attachmentId: 'browser:tab-a',
            operation: 'dispatch.declaredAction',
            actionTag: 'increment',
            target: { runtimeId: 'runtime-172-dispatch', moduleId: 'InspectDispatchFixture', instanceId: 'default' },
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(dispatchCount).toBe(1)
      expect(sent).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({
            artifact: expect.objectContaining({
              value: expect.objectContaining({
                kind: 'operation.completed',
                binding: expect.objectContaining({
                  manifestDigest: manifest.digest,
                  actionTag: 'increment',
                  bindingStatus: 'matched',
                }),
              }),
            }),
          }),
        }),
      ])

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('records browser-handled live operations into the lifecycle operation window source', async () => {
    const { Effect, Layer, ManagedRuntime, Schema, ServiceMap } = await import('effect')
    const Logix = await import('@logixjs/core')
    const CoreReflection = await import('@logixjs/core/repo-internal/reflection-api')
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
      const InspectModule = Logix.Module.make('InspectWindowFixture', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {
          increment: Schema.Void,
        },
        reducers: {},
      })
      const Program = Logix.Program.make(InspectModule, { initial: { count: 0 }, logics: [] })
      const manifest = CoreReflection.extractRuntimeReflectionManifest(Program, { programId: 'inspect-window.program' })
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectWindowFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 1 }),
        dispatch: () => Effect.void,
      }
      const runtime = ManagedRuntime.make(Layer.succeed(ModuleTag, moduleRuntime)) as any
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      carrier.bindRuntime({
        ownerId: 'InspectWindowFixture',
        runtimeInstanceId: 'runtime-177-window',
        runtime,
        moduleRuntime,
        reflectionManifest: manifest,
      })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()

      sent.length = 0
      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-dispatch',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-dispatch',
            attachmentId: 'browser:tab-a',
            operation: 'dispatch.declaredAction',
            actionTag: 'increment',
            target: { runtimeId: 'runtime-177-window', moduleId: 'InspectWindowFixture', instanceId: 'default' },
          },
        }),
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      sent.length = 0
      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-events',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-events',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.events',
            target: { runtimeId: 'runtime-177-window', moduleId: 'InspectWindowFixture', instanceId: 'default' },
          },
        }),
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const operationWindow = (sent[0] as any)?.payload?.artifact?.value?.facet?.payload?.operationWindow
      expect(operationWindow?.kind).toBe('live.operation.window')
      expect(operationWindow?.events.map((event: any) => event.eventKind)).toEqual([
        'operation.accepted',
        'operation.completed',
      ])
      expect(operationWindow?.events.map((event: any) => event.label)).toEqual([
        'dispatch.declaredAction',
        'dispatch.declaredAction',
      ])
      expect(operationWindow?.gaps ?? []).toEqual([])

      sent.length = 0
      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-timeline',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-timeline',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.timeline',
            target: { runtimeId: 'runtime-177-window', moduleId: 'InspectWindowFixture', instanceId: 'default' },
          },
        }),
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const timeline = (sent[0] as any)?.payload?.artifact?.value?.facet?.payload?.timeline
      expect(timeline?.items.map((item: any) => item.eventKind)).toEqual([
        'operation.accepted',
        'operation.completed',
      ])
      expect(timeline?.items.map((item: any) => item.sourceAuthority)).toEqual(['runtime-live', 'runtime-live'])
      expect(JSON.stringify(timeline)).not.toMatch(/latestState|latest state|repairHints|verdict|nextRecommendedStage|passed/)

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('preserves host interaction link ids on admitted runtime operation windows', async () => {
    const { Effect, Layer, ManagedRuntime, Schema, ServiceMap } = await import('effect')
    const Logix = await import('@logixjs/core')
    const CoreReflection = await import('@logixjs/core/repo-internal/reflection-api')
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
      const InspectModule = Logix.Module.make('InspectInteractionFixture', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { increment: Schema.Void },
        reducers: {},
      })
      const Program = Logix.Program.make(InspectModule, { initial: { count: 0 }, logics: [] })
      const manifest = CoreReflection.extractRuntimeReflectionManifest(Program, { programId: 'inspect-interaction.program' })
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectInteractionFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 1 }),
        dispatch: () => Effect.void,
      }
      const runtime = ManagedRuntime.make(Layer.succeed(ModuleTag, moduleRuntime)) as any
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      carrier.bindRuntime({
        ownerId: 'InspectInteractionFixture',
        runtimeInstanceId: 'runtime-188-interaction',
        runtime,
        moduleRuntime,
        reflectionManifest: manifest,
      })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-linked-dispatch',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-linked-dispatch',
            attachmentId: 'browser:tab-a',
            operation: 'dispatch.declaredAction',
            actionTag: 'increment',
            linkId: 'host-interaction:click:submit',
            target: { runtimeId: 'runtime-188-interaction', moduleId: 'InspectInteractionFixture', instanceId: 'default' },
          },
        }),
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      sent.length = 0
      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-linked-events',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-linked-events',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.events',
            target: { runtimeId: 'runtime-188-interaction', moduleId: 'InspectInteractionFixture', instanceId: 'default' },
          },
        }),
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const operationWindow = (sent[0] as any)?.payload?.artifact?.value?.facet?.payload?.operationWindow
      expect(operationWindow.events.map((event: any) => event.linkId)).toEqual([
        'host-interaction:click:submit',
        'host-interaction:click:submit',
      ])

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('bridges runtime debug diagnostic and process records into owner-backed inspect.events windows', async () => {
    const { Effect, Layer, ManagedRuntime, ServiceMap } = await import('effect')
    const CoreDebug = await import('@logixjs/core/repo-internal/debug-api')
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
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectDebugSourceFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 1 }),
        dispatch: () => Effect.void,
      }
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      const runtime = ManagedRuntime.make(
        Layer.mergeAll(
          carrier.layerForRuntime({ ownerId: 'InspectDebugSourceFixture', runtimeInstanceId: 'runtime-179-debug' }),
          CoreDebug.diagnosticsLevel('full'),
          Layer.succeed(ModuleTag, moduleRuntime),
        ),
      ) as any
      carrier.bindRuntime({
        ownerId: 'InspectDebugSourceFixture',
        runtimeInstanceId: 'runtime-179-debug',
        runtime,
        moduleRuntime,
      })

      await runtime.runPromise(
        CoreDebug.record({
          type: 'diagnostic',
          moduleId: 'InspectDebugSourceFixture',
          instanceId: 'default',
          code: 'debug.source.warning',
          severity: 'warning',
          message: 'Debug source warning.',
          txnSeq: 3,
          opSeq: 2,
          runtimeLabel: 'runtime-179-debug',
        }),
      )
      await runtime.runPromise(
        CoreDebug.record({
          type: 'process:start',
          moduleId: 'InspectDebugSourceFixture',
          instanceId: 'default',
          identity: {
            moduleId: 'InspectDebugSourceFixture',
            instanceId: 'default',
            processId: 'sync-user',
          },
          severity: 'info',
          eventSeq: 4,
          timestampMs: 100,
          txnSeq: 5,
          runtimeLabel: 'runtime-179-debug',
        } as any),
      )

      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()

      for (const item of [
        { kind: 'diagnostic', eventKind: 'diagnostic', label: 'debug.source.warning', coordinate: { kind: 'txn-op', txnSeq: 3, opSeq: 2 } },
        { kind: 'process', eventKind: 'process', label: 'process:start', coordinate: { kind: 'txn-event', txnSeq: 5, eventSeq: 4 } },
      ] as const) {
        sent.length = 0
        ws!.emit('message', {
          data: JSON.stringify({
            schemaVersion: 1,
            id: `req-${item.kind}`,
            role: 'daemon',
            type: 'live.operation.request',
            payload: {
              requestId: `req-${item.kind}`,
              attachmentId: 'browser:tab-a',
              operation: 'inspect.events',
              kind: item.kind,
              target: { runtimeId: 'runtime-179-debug', moduleId: 'InspectDebugSourceFixture', instanceId: 'default' },
            },
          }),
        })
        await new Promise((resolve) => setTimeout(resolve, 0))

        const artifact = (sent[0] as any)?.payload?.artifact
        const operationWindow = artifact?.value?.facet?.payload?.operationWindow
        expect(artifact?.outputKey).toBe('live-inspect:events')
        expect(artifact?.value?.facet?.sourceAuthority).toBe('runtime-live')
        expect(operationWindow?.events).toHaveLength(1)
        expect(operationWindow?.events[0]).toMatchObject({
          eventKind: item.eventKind,
          label: item.label,
          sourceAuthority: 'runtime-live',
          order: { coordinate: item.coordinate },
        })
        expect(operationWindow?.gaps ?? []).toEqual([])
      }

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('returns stable P1 structured gap reasons for missing inspect owner projections', async () => {
    const { Effect, Layer, ManagedRuntime, ServiceMap } = await import('effect')
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
      const ModuleTag = ServiceMap.Service<any, any>('@logixjs/Module/InspectGapsFixture')
      const moduleRuntime = {
        getState: Effect.succeed({ count: 0 }),
        dispatch: () => Effect.void,
      }
      const runtime = ManagedRuntime.make(Layer.succeed(ModuleTag, moduleRuntime)) as any
      const carrier = installLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
      carrier.bindRuntime({ ownerId: 'InspectGapsFixture', runtimeInstanceId: 'runtime-172-gaps', runtime, moduleRuntime })
      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))

      const ws = FakeWebSocket.instances[0]
      expect(ws).toBeDefined()

      const cases = [
        {
          operation: 'inspect.events',
          extra: { kind: 'diagnostic' },
          codes: ['unsupported-event-kind'],
        },
        {
          operation: 'inspect.timeline',
          extra: { field: 'count' },
          codes: ['missing-operation-window', 'missing-field-event-meta'],
        },
        {
          operation: 'inspect.summary',
          extra: {},
          codes: ['missing-operation-window', 'missing-latest-field-summary'],
        },
        {
          operation: 'inspect.fieldGraph',
          extra: {},
          codes: ['missing-field-owner-projection'],
        },
      ] as const

      for (const item of cases) {
        sent.length = 0
        ws!.emit('message', {
          data: JSON.stringify({
            schemaVersion: 1,
            id: `req-${item.operation}`,
            role: 'daemon',
            type: 'live.operation.request',
            payload: {
              requestId: `req-${item.operation}`,
              attachmentId: 'browser:tab-a',
              operation: item.operation,
              target: { runtimeId: 'runtime-172-gaps', moduleId: 'InspectGapsFixture', instanceId: 'default' },
              ...item.extra,
            },
          }),
        })
        await new Promise((resolve) => setTimeout(resolve, 0))
        const codes = ((sent[0] as any)?.payload?.artifact?.value?.facet?.gaps ?? []).map((gap: any) => gap.code)
        expect(codes).toEqual(item.codes)
      }

      await runtime.dispose()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      ;(globalThis as any).WebSocket = previous
    }
  })

  it('transports owner operation windows for inspect.events without taking event ownership', async () => {
    const { createLiveOperationLedgerStore, makeLiveTargetCoordinate } = await import('@logixjs/core/repo-internal/live-bridge-api')
    const { clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
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

    const previousWebSocket = globalThis.WebSocket
    const previousCarrier = (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      const target = makeLiveTargetCoordinate({
        runtimeId: 'runtime-175-events',
        moduleId: 'InspectEventsFixture',
        instanceId: 'default',
      })
      const store = createLiveOperationLedgerStore({ enabled: true })
      store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted' })
      store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed' })
      const ownerWindow = store.readWindow({ target })
      ;(globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = {
        listRuntimeBindings: () => [
          {
            ownerId: 'InspectEventsFixture',
            runtimeInstanceId: 'runtime-175-events',
            targetCoordinate: target,
          },
        ],
        resolveRuntimeBinding: () => ({
          ownerId: 'InspectEventsFixture',
          runtime: { runPromise: (value: unknown) => Promise.resolve(value) },
          targetCoordinate: target,
          readOperationWindow: () => ownerWindow,
        }),
      }

      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-events',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-events',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.events',
            target,
            limit: 2,
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      const operationWindow = (sent[0] as any)?.payload?.artifact?.value?.facet?.payload?.operationWindow
      expect(operationWindow).toEqual(ownerWindow)
      expect(operationWindow.kind).toBe('live.operation.window')
      expect(operationWindow.events.map((event: any) => event.sourceAuthority)).toEqual(['runtime-live', 'runtime-live'])
      expect(JSON.stringify(operationWindow)).not.toMatch(/browser-dev|browser/)
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      if (previousCarrier === undefined) delete (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
      else (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = previousCarrier
      ;(globalThis as any).WebSocket = previousWebSocket
    }
  })

  it('transports owner timeline artifacts without rewriting ordering stateAfter or owner gaps', async () => {
    const {
      createLiveOperationLedgerStore,
      makeLiveTargetCoordinate,
      makeLiveInspectGap,
      makeLiveTimelineInspectArtifact,
      makeLiveTimelineContinuationGap,
    } = await import('@logixjs/core/repo-internal/live-bridge-api')
    const { clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
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

    const previousWebSocket = globalThis.WebSocket
    const previousCarrier = (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      const target = makeLiveTargetCoordinate({
        runtimeId: 'runtime-177-timeline',
        moduleId: 'InspectTimelineFixture',
        instanceId: 'default',
      })
      const descriptor = { ...target, attachmentId: 'browser:tab-a', adapterKind: 'browser-dev' as const }
      const store = createLiveOperationLedgerStore({ enabled: true })
      store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'z-accepted', txnSeq: 1, opSeq: 1, linkId: 'link:one' })
      store.recordOperationEvent({
        target,
        eventKind: 'operation.completed',
        label: 'a-completed',
        txnSeq: 1,
        opSeq: 2,
        linkId: 'link:one',
        stateAfter: { sourceKind: 'current-head-exact', boundedSummary: { count: 1 } },
      })
      const ownerWindow = store.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } })
      const retainedSegment = {
        sourceKind: 'daemon-retained-segment' as const,
        target: descriptor,
        attachmentId: 'browser:tab-a',
        startWatermark: ownerWindow.startWatermark,
        endWatermark: ownerWindow.startWatermark,
        completeness: 'complete' as const,
        gaps: [],
        dropped: [],
        degraded: [],
        redacted: [],
        retainedSegmentRef: 'retained-segment:browser-adapter',
      }
      const retentionGap = makeLiveTimelineContinuationGap({ code: 'timeline-retention-gap', target })
      const ownerArtifact = makeLiveTimelineInspectArtifact({
        target: descriptor,
        producer: '@logixjs/react/dev-live-browser-adapter',
        operationWindow: ownerWindow,
        sourceSegments: [retainedSegment],
        gaps: [
          retentionGap,
          makeLiveInspectGap({
            gapId: 'field-runtime:missing-field-event-meta:count',
            code: 'missing-field-event-meta',
            summary: 'No field semantic metadata was available for count.',
            severity: 'info',
            target,
            owner: 'field-runtime',
            reopenBar: 'reopen when field-runtime can provide field event metadata',
          }),
        ],
      })
      const ownerTimeline = (ownerArtifact.facet.payload as any).timeline
      ;(globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = {
        listRuntimeBindings: () => [
          {
            ownerId: 'InspectTimelineFixture',
            runtimeInstanceId: 'runtime-177-timeline',
            targetCoordinate: target,
          },
        ],
        resolveRuntimeBinding: () => ({
          ownerId: 'InspectTimelineFixture',
          runtime: { runPromise: (value: unknown) => Promise.resolve(value) },
          targetCoordinate: target,
          readOperationWindow: () => ownerWindow,
          projectTimeline: () => ownerArtifact,
        }),
      }

      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-timeline',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-timeline',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.timeline',
            target,
            field: 'count',
            limit: 10,
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      const artifact = (sent[0] as any)?.payload?.artifact
      const value = artifact?.value
      const timeline = value?.facet?.payload?.timeline

      expect(artifact.outputKey).toBe('live-inspect:timeline')
      expect(value.section).toBe('timeline')
      expect(value.facet.sourceAuthority).toBe('runtime-live')
      expect(timeline).toEqual(ownerTimeline)
      expect(timeline.items.map((item: any) => item.label)).toEqual(ownerTimeline.items.map((item: any) => item.label))
      expect(timeline.items.map((item: any) => item.order)).toEqual(ownerTimeline.items.map((item: any) => item.order))
      expect(timeline.items.map((item: any) => item.watermark)).toEqual(ownerTimeline.items.map((item: any) => item.watermark))
      expect(timeline.items[1].stateAfter).toEqual(ownerTimeline.items[1].stateAfter)
      expect(timeline.completeness).toBe('partial-dropped')
      expect(timeline.sourceSegments).toEqual(ownerTimeline.sourceSegments)
      expect(timeline.safeResumeBoundary).toEqual(ownerTimeline.safeResumeBoundary)
      expect(timeline.gaps).toEqual([
        expect.objectContaining({ owner: 'runtime-live', code: 'timeline-retention-gap' }),
        expect.objectContaining({ owner: 'field-runtime', code: 'missing-field-event-meta' }),
      ])
      expect(JSON.stringify(timeline)).not.toMatch(/browser-test|browser-dev.*carrier|latest state|latestState|completenessAuthority|daemonOrder|rowId|writeTime/)
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      if (previousCarrier === undefined) delete (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
      else (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = previousCarrier
      ;(globalThis as any).WebSocket = previousWebSocket
    }
  })

  it('decodes opaque timeline cursor tokens before reading owner operation windows', async () => {
    const {
      createLiveOperationLedgerStore,
      decodeLiveTimelineCursorToken,
      makeLiveTargetCoordinate,
      makeLiveTimelineInspectArtifact,
    } = await import('@logixjs/core/repo-internal/live-bridge-api')
    const { clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
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

    const previousWebSocket = globalThis.WebSocket
    const previousCarrier = (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      const target = makeLiveTargetCoordinate({
        runtimeId: 'runtime-180-cursor',
        moduleId: 'InspectCursorFixture',
        instanceId: 'default',
      })
      const descriptor = { ...target, attachmentId: 'browser:tab-a', adapterKind: 'browser-dev' as const }
      const store = createLiveOperationLedgerStore({ enabled: true })
      store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'head', txnSeq: 1, opSeq: 1 })
      const ownerWindow = store.readWindow({ target, limit: 1, budget: { maxEvents: 1, maxInlineBytes: 4096 } })
      const cursorArtifact = makeLiveTimelineInspectArtifact({
        target: descriptor,
        producer: '@logixjs/react/dev-live-browser-adapter',
        operationWindow: ownerWindow,
      })
      const cursorToken = (cursorArtifact.facet.payload as any).timeline.cursor.next
      const decoded = decodeLiveTimelineCursorToken(cursorToken)
      let capturedRequest: unknown
      ;(globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = {
        listRuntimeBindings: () => [
          {
            ownerId: 'InspectCursorFixture',
            runtimeInstanceId: 'runtime-180-cursor',
            targetCoordinate: target,
          },
        ],
        resolveRuntimeBinding: () => ({
          ownerId: 'InspectCursorFixture',
          runtime: { runPromise: (value: unknown) => Promise.resolve(value) },
          targetCoordinate: target,
          readOperationWindow: (request: unknown) => {
            capturedRequest = request
            return ownerWindow
          },
          projectTimeline: (input: any) => makeLiveTimelineInspectArtifact(input),
        }),
      }

      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-timeline-cursor',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-timeline-cursor',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.timeline',
            target,
            cursor: cursorToken,
            limit: 1,
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      expect((capturedRequest as any)?.cursor).toEqual(decoded?.runtimeResumeWatermark)
      expect((sent[0] as any)?.payload?.artifact?.value?.facet?.payload?.timeline.cursor.next).toEqual(expect.any(String))
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      if (previousCarrier === undefined) delete (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
      else (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = previousCarrier
      ;(globalThis as any).WebSocket = previousWebSocket
    }
  })

  it('transports owner summary artifacts without rewriting operation or field convergence facts', async () => {
    const {
      createFieldRuntimeInspectModel,
      createLiveOperationLedgerStore,
      makeLiveSummaryInspectArtifact,
      makeLiveTargetCoordinate,
    } = await import('@logixjs/core/repo-internal/live-bridge-api')
    const { clearInstalledLogixDevLifecycleCarrier } = await import('../../../src/dev/lifecycle.js')
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

    const previousWebSocket = globalThis.WebSocket
    const previousCarrier = (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      clearInstalledLogixLiveBrowserAdapter()
      clearInstalledLogixDevLifecycleCarrier()
      const target = makeLiveTargetCoordinate({
        runtimeId: 'runtime-178-summary',
        moduleId: 'InspectSummaryFixture',
        instanceId: 'default',
      })
      const descriptor = { ...target, attachmentId: 'browser:tab-a', adapterKind: 'browser-dev' as const }
      const store = createLiveOperationLedgerStore({ enabled: true })
      store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted', txnSeq: 1, opSeq: 1 })
      store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed', txnSeq: 1, opSeq: 2 })
      const ownerWindow = store.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } })
      const snapshot = {
        moduleId: 'InspectSummaryFixture',
        digest: 'mfields:inspect-summary',
        fields: [{ fieldId: 'count', name: 'Count' }],
        provenanceIndex: {
          count: {
              originType: 'module' as const,
              originId: 'InspectSummaryFixture',
              originIdKind: 'explicit' as const,
              originLabel: 'module:InspectSummaryFixture',
          },
        },
      }
      const fieldModel = createFieldRuntimeInspectModel({ enabled: true, producer: '@logixjs/react/dev-live-browser-adapter' })
      const fieldSummaryArtifact = fieldModel.readFieldSummary({
        target: descriptor,
        snapshot,
        changedFieldCount: 1,
        convergenceCauses: [{ cause: 'dispatch', fieldPath: 'count', count: 1 }],
      })
      const ownerArtifact = makeLiveSummaryInspectArtifact({
        target: descriptor,
        producer: '@logixjs/react/dev-live-browser-adapter',
        operationWindow: ownerWindow,
        fieldSummaryArtifact,
      })
      const ownerSummary = (ownerArtifact.facet.payload as any).summary
      ;(globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = {
        listRuntimeBindings: () => [
          {
            ownerId: 'InspectSummaryFixture',
            runtimeInstanceId: 'runtime-178-summary',
            targetCoordinate: target,
          },
        ],
        resolveRuntimeBinding: () => ({
          ownerId: 'InspectSummaryFixture',
          runtime: { runPromise: (value: unknown) => Promise.resolve(value) },
          targetCoordinate: target,
          readOperationWindow: () => ownerWindow,
          projectSummary: () => ownerArtifact,
        }),
      }

      installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const ws = FakeWebSocket.instances[0]
      sent.length = 0

      ws!.emit('message', {
        data: JSON.stringify({
          schemaVersion: 1,
          id: 'req-summary',
          role: 'daemon',
          type: 'live.operation.request',
          payload: {
            requestId: 'req-summary',
            attachmentId: 'browser:tab-a',
            operation: 'inspect.summary',
            target,
            limit: 10,
          },
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 0))
      const artifact = (sent[0] as any)?.payload?.artifact
      const value = artifact?.value
      const summary = value?.facet?.payload?.summary

      expect(artifact.outputKey).toBe('live-inspect:summary')
      expect(value.section).toBe('summary')
      expect(value.facet.sourceAuthority).toBe('runtime-live')
      expect(summary).toEqual(ownerSummary)
      expect(summary.operation.eventKindCounts).toEqual(ownerSummary.operation.eventKindCounts)
      expect(summary.fieldConvergence.fieldSummary).toEqual(ownerSummary.fieldConvergence.fieldSummary)
      expect(JSON.stringify(summary)).not.toMatch(/operationWindow|SubscriptionRef|browser-test|adapter-side-summary/)
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      if (previousCarrier === undefined) delete (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
      else (globalThis as any)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')] = previousCarrier
      ;(globalThis as any).WebSocket = previousWebSocket
    }
  })
})
